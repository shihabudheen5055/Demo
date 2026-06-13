using System;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Telegram.Bot;
using Telegram.Bot.Exceptions;
using Telegram.Bot.Polling;
using Telegram.Bot.Types;
using Telegram.Bot.Types.Enums;
using CentsDemo.Backend.Data;
using CentsDemo.Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace CentsDemo.Backend.Services
{
    public class TelegramBotService : BackgroundService
    {
        private readonly ILogger<TelegramBotService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _config;
        private TelegramBotClient? _botClient;

        public TelegramBotService(ILogger<TelegramBotService> logger, IServiceProvider serviceProvider, IConfiguration config)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _config = config;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var token = _config["TelegramBot:Token"];
            if (string.IsNullOrEmpty(token))
            {
                _logger.LogWarning("Telegram Bot Token is not configured. Bot service will not start.");
                return;
            }

            var httpClient = new System.Net.Http.HttpClient();
            _botClient = new TelegramBotClient(token, httpClient);

            var receiverOptions = new ReceiverOptions
            {
                AllowedUpdates = new[] { UpdateType.Message }
            };

            _botClient.StartReceiving(
                updateHandler: HandleUpdateAsync,
                errorHandler: HandleErrorAsync,
                receiverOptions: receiverOptions,
                cancellationToken: stoppingToken
            );

            _logger.LogInformation("Telegram Bot Service started.");

            // Wait indefinitely
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }

        private async Task HandleUpdateAsync(ITelegramBotClient botClient, Update update, CancellationToken cancellationToken)
        {
            if (update.Message is not { } message) return;
            if (message.Text is not { } messageText) return;

            var chatId = message.Chat.Id;

            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Handle /link command
            if (messageText.StartsWith("/link"))
            {
                var parts = messageText.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length < 2)
                {
                    await botClient.SendMessage(chatId, "Please provide the linking code. Example: /link 123456", cancellationToken: cancellationToken);
                    return;
                }

                var code = parts[1].Trim();
                // Ensure we only have the digits in case of weird characters copied from HTML
                code = new string(code.Where(char.IsDigit).ToArray());

                var userToLink = await db.Users.FirstOrDefaultAsync(u => u.TelegramLinkToken == code, cancellationToken);
                
                if (userToLink == null)
                {
                    await botClient.SendMessage(chatId, "Invalid linking code. Please generate a new one from the Cents app.", cancellationToken: cancellationToken);
                    return;
                }

                if (userToLink.TelegramLinkTokenExpiry < DateTime.UtcNow)
                {
                    await botClient.SendMessage(chatId, "This linking code has expired. Please generate a new one.", cancellationToken: cancellationToken);
                    return;
                }

                userToLink.TelegramChatId = chatId;
                userToLink.TelegramLinkToken = null;
                userToLink.TelegramLinkTokenExpiry = null;
                await db.SaveChangesAsync(cancellationToken);

                await botClient.SendMessage(chatId, $"Success! Your Cents account ({userToLink.Username}) has been linked. You can now send expenses here. (e.g. 'Coffee 4.50' or '15 Lunch')", cancellationToken: cancellationToken);
                return;
            }

            // Handle /unlink command
            if (messageText.Trim().ToLower() == "/unlink")
            {
                var userToUnlink = await db.Users.FirstOrDefaultAsync(u => u.TelegramChatId == chatId, cancellationToken);
                if (userToUnlink != null)
                {
                    userToUnlink.TelegramChatId = null;
                    await db.SaveChangesAsync(cancellationToken);
                    await botClient.SendMessage(chatId, "Your account has been successfully unlinked. To link again, generate a new code in the Cents app and type /link <code>.", cancellationToken: cancellationToken);
                }
                else
                {
                    await botClient.SendMessage(chatId, "Your account is not currently linked to any Cents account.", cancellationToken: cancellationToken);
                }
                return;
            }

            // Handle expense logging
            var user = await db.Users.FirstOrDefaultAsync(u => u.TelegramChatId == chatId, cancellationToken);
            if (user == null)
            {
                await botClient.SendMessage(chatId, "Your account is not linked. Please go to the Cents app to get a linking code and type /link <code>.", cancellationToken: cancellationToken);
                return;
            }

            // Simple parsing logic: look for a number, assume the rest is the title
            var amountMatch = Regex.Match(messageText, @"(\d+\.?\d*)");
            if (!amountMatch.Success)
            {
                await botClient.SendMessage(chatId, "I couldn't find an amount in your message. Please send something like 'Coffee 4.50' or '15 Lunch'.", cancellationToken: cancellationToken);
                return;
            }

            if (!decimal.TryParse(amountMatch.Value, out decimal amount))
            {
                await botClient.SendMessage(chatId, "Invalid amount format.", cancellationToken: cancellationToken);
                return;
            }

            var title = messageText.Replace(amountMatch.Value, "").Trim();
            if (string.IsNullOrEmpty(title))
            {
                title = "Telegram Expense";
            }

            var transaction = new Transaction
            {
                UserId = user.Id,
                Amount = amount,
                Title = title,
                IsExpense = true,
                Date = DateTime.UtcNow
            };

            db.Transactions.Add(transaction);
            await db.SaveChangesAsync(cancellationToken);

            await botClient.SendMessage(chatId, $"✅ Added ${amount:F2} for '{title}'", cancellationToken: cancellationToken);
        }

        private Task HandleErrorAsync(ITelegramBotClient botClient, Exception exception, Telegram.Bot.Polling.HandleErrorSource source, CancellationToken cancellationToken)
        {
            var ErrorMessage = exception switch
            {
                ApiRequestException apiRequestException
                    => $"Telegram API Error:\n[{apiRequestException.ErrorCode}]\n{apiRequestException.Message}",
                _ => exception.ToString()
            };

            _logger.LogError(ErrorMessage);
            return Task.CompletedTask;
        }
    }
}
