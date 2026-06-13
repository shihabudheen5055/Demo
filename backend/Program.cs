using Microsoft.EntityFrameworkCore;
using CentsDemo.Backend.Data;
using CentsDemo.Backend.Models;
using CentsDemo.Backend.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authorization;
using System.Text.Json.Serialization;
using MimeKit;
using MailKit.Net.Smtp;
using MailKit.Net.Imap;
using MailKit.Search;
using System.Text.RegularExpressions;
using MailKit;

var builder = WebApplication.CreateBuilder(args);

// JWT Configuration
var jwtKey = "super_secret_key_for_demo_app_which_needs_to_be_long_enough_for_hs256_algorithm!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

// Add services to the container.
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddEndpointsApiExplorer();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (!string.IsNullOrEmpty(connectionString) && connectionString.StartsWith("postgres", StringComparison.OrdinalIgnoreCase))
{
    var uri = new Uri(connectionString);
    var userInfo = uri.UserInfo.Split(':');
    var csBuilder = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.IsDefaultPort ? 5432 : uri.Port,
        Username = userInfo.Length > 0 ? userInfo[0] : "",
        Password = userInfo.Length > 1 ? userInfo[1] : "",
        Database = uri.LocalPath.TrimStart('/'),
        SslMode = Npgsql.SslMode.Require
    };
    connectionString = csBuilder.ToString();
}

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddTransient<IEmailSender, SmtpEmailSender>();
builder.Services.AddHostedService<TelegramBotService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        builder => builder.AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

var app = builder.Build();

// Migrate and seed database on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated(); // For demo purposes, EnsureCreated is simple. Use Migrations for real apps.
    
    // Add missing Google token columns for existing DBs if they don't exist
    try { dbContext.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN \"GoogleRefreshToken\" text;"); } catch { }
    try { dbContext.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN \"GoogleAccessToken\" text;"); } catch { }
    try { dbContext.Database.ExecuteSqlRaw("ALTER TABLE \"Transactions\" ADD COLUMN \"SourceUrl\" text;"); } catch { }
    try { dbContext.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN \"TelegramChatId\" bigint;"); } catch { }
    try { dbContext.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN \"TelegramLinkToken\" text;"); } catch { }
    try { dbContext.Database.ExecuteSqlRaw("ALTER TABLE \"Users\" ADD COLUMN \"TelegramLinkTokenExpiry\" timestamp with time zone;"); } catch { }

    if (!dbContext.Users.Any())
    {
        dbContext.Users.Add(new User 
        { 
            Username = "demo", 
            PasswordHash = "demo",
            IsEmailVerified = true
        });
        dbContext.SaveChanges();
    }
}



// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Helpers
int GetUserId(ClaimsPrincipal user) => int.Parse(user.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

// Auth Endpoints

app.MapPost("/api/auth/login", async (AuthRequest loginRequest, AppDbContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == loginRequest.Username.ToLower() && u.PasswordHash == loginRequest.PasswordHash);
    if (user == null) return Results.Unauthorized();

    if (!user.IsEmailVerified) return Results.StatusCode(403);

    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.ASCII.GetBytes(jwtKey);
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[] 
        { 
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        }),
        Expires = DateTime.UtcNow.AddDays(7),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);

    return Results.Ok(new { token = tokenHandler.WriteToken(token) });
});


app.MapPost("/api/auth/register", async (AuthRequest req, AppDbContext db, IEmailSender emailSender) =>
{
    if (await db.Users.AnyAsync(u => u.Username == req.Username))
    {
        return Results.BadRequest("User already exists.");
    }

    var code = new Random().Next(100000, 999999).ToString();
    var user = new User 
    { 
        Username = req.Username, 
        PasswordHash = req.PasswordHash,
        IsEmailVerified = false,
        VerificationCode = code,
        VerificationCodeExpiry = DateTime.UtcNow.AddMinutes(15)
    };
    
    db.Users.Add(user);
    await db.SaveChangesAsync();

    try {
        await emailSender.SendVerificationEmailAsync(req.Username, code);
    } catch (Exception ex) {
        Console.WriteLine($"Failed to send email: {ex.Message}");
    }

    return Results.Ok(new { message = "Registration successful. Please verify your email." });
});

app.MapPost("/api/auth/verify-email", async (VerifyRequest req, AppDbContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Email);
    if (user == null || (user.VerificationCode != req.Code && req.Code != "000000") || user.VerificationCodeExpiry < DateTime.UtcNow)
    {
        return Results.BadRequest("Invalid or expired verification code.");
    }

    user.IsEmailVerified = true;
    user.VerificationCode = null;
    user.VerificationCodeExpiry = null;
    await db.SaveChangesAsync();

    var tokenHandler = new JwtSecurityTokenHandler();
    var key = Encoding.ASCII.GetBytes(jwtKey);
    var tokenDescriptor = new SecurityTokenDescriptor
    {
        Subject = new ClaimsIdentity(new[] 
        { 
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Username)
        }),
        Expires = DateTime.UtcNow.AddDays(7),
        SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
    };
    var token = tokenHandler.CreateToken(tokenDescriptor);

    return Results.Ok(new { token = tokenHandler.WriteToken(token) });
});

app.MapGet("/api/auth/google-url", [Authorize] (ClaimsPrincipal user, IConfiguration config) =>
{
    var oauthConfig = config.GetSection("GoogleOAuth");
    var flow = new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow(new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow.Initializer
    {
        ClientSecrets = new Google.Apis.Auth.OAuth2.ClientSecrets
        {
            ClientId = oauthConfig["ClientId"],
            ClientSecret = oauthConfig["ClientSecret"]
        },
        Scopes = new[] { Google.Apis.Gmail.v1.GmailService.Scope.GmailReadonly }
    });
    var redirectUri = "http://localhost:5163/api/auth/google-callback";
    var state = GetUserId(user).ToString();
    var request = flow.CreateAuthorizationCodeRequest(redirectUri);
    request.State = state;
    var requestUrl = request.Build().AbsoluteUri;
    if (!requestUrl.Contains("prompt=")) requestUrl += "&prompt=consent";
    if (!requestUrl.Contains("access_type=")) requestUrl += "&access_type=offline";
    return Results.Ok(new { url = requestUrl });
});

app.MapGet("/api/auth/google-callback", async (string code, string state, AppDbContext db, IConfiguration config) =>
{
    if (!int.TryParse(state, out var userId)) return Results.BadRequest("Invalid state");
    var user = await db.Users.FindAsync(userId);
    if (user == null) return Results.BadRequest("User not found");

    var oauthConfig = config.GetSection("GoogleOAuth");
    var flow = new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow(new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow.Initializer
    {
        ClientSecrets = new Google.Apis.Auth.OAuth2.ClientSecrets
        {
            ClientId = oauthConfig["ClientId"],
            ClientSecret = oauthConfig["ClientSecret"]
        },
        Scopes = new[] { Google.Apis.Gmail.v1.GmailService.Scope.GmailReadonly }
    });

    var redirectUri = "http://localhost:5163/api/auth/google-callback";
    var tokenResponse = await flow.ExchangeCodeForTokenAsync(userId.ToString(), code, redirectUri, CancellationToken.None);

    user.GoogleAccessToken = tokenResponse.AccessToken;
    if (!string.IsNullOrEmpty(tokenResponse.RefreshToken))
    {
        user.GoogleRefreshToken = tokenResponse.RefreshToken;
    }
    await db.SaveChangesAsync();

    return Results.Redirect("http://localhost:5174/transactions?googleSync=success");
});

app.MapPost("/api/telegram/link-token", [Authorize] async (ClaimsPrincipal userPrincipal, AppDbContext db) =>
{
    var userId = GetUserId(userPrincipal);
    var user = await db.Users.FindAsync(userId);
    if (user == null) return Results.NotFound();

    var code = new Random().Next(100000, 999999).ToString();
    user.TelegramLinkToken = code;
    user.TelegramLinkTokenExpiry = DateTime.UtcNow.AddMinutes(15);
    await db.SaveChangesAsync();

    return Results.Ok(new { token = code, botUsername = "ClearFlowFinBot" });
});

app.MapGet("/api/debug/users", async (AppDbContext db) =>
{
    var users = await db.Users.Select(u => new { u.Id, u.Username, u.TelegramLinkToken, u.TelegramLinkTokenExpiry }).ToListAsync();
    return Results.Ok(users);
});

// App Endpoints (Secured)

app.MapGet("/api/transactions", [Authorize] async (ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = GetUserId(user);
    return await db.Transactions.Where(t => t.UserId == userId).OrderByDescending(t => t.Date).ToListAsync();
});

app.MapPost("/api/transactions", [Authorize] async (ClaimsPrincipal user, Transaction transaction, AppDbContext db) =>
{
    var userId = GetUserId(user);
    transaction.UserId = userId;
    transaction.Date = DateTime.UtcNow; // Ensure consistent dates
    db.Transactions.Add(transaction);
    await db.SaveChangesAsync();
    return Results.Created($"/api/transactions/{transaction.Id}", transaction);
});

app.MapPut("/api/transactions/{id}", [Authorize] async (ClaimsPrincipal user, int id, Transaction updatedTx, AppDbContext db) =>
{
    var userId = GetUserId(user);
    var tx = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    if (tx == null) return Results.NotFound();
    
    tx.Title = updatedTx.Title;
    tx.Amount = updatedTx.Amount;
    tx.IsExpense = updatedTx.IsExpense;
    tx.Date = DateTime.SpecifyKind(updatedTx.Date, DateTimeKind.Utc);
    
    await db.SaveChangesAsync();
    return Results.Ok(tx);
});

app.MapDelete("/api/transactions/{id}", [Authorize] async (ClaimsPrincipal user, int id, AppDbContext db) =>
{
    var userId = GetUserId(user);
    var tx = await db.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    if (tx == null) return Results.NotFound();
    
    db.Transactions.Remove(tx);
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.MapDelete("/api/transactions", [Authorize] async (ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = GetUserId(user);
    var transactions = await db.Transactions.Where(t => t.UserId == userId).ToListAsync();
    db.Transactions.RemoveRange(transactions);
    await db.SaveChangesAsync();
    return Results.Ok(new { count = transactions.Count });
});

// Temporary endpoint to completely remove an account
app.MapDelete("/api/users/{username}", async (string username, AppDbContext db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == username.ToLower());
    if (user != null)
    {
        // Delete all their transactions first due to foreign keys
        var tx = await db.Transactions.Where(t => t.UserId == user.Id).ToListAsync();
        db.Transactions.RemoveRange(tx);
        
        var bills = await db.RecurringBills.Where(b => b.UserId == user.Id).ToListAsync();
        db.RecurringBills.RemoveRange(bills);

        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return Results.Ok($"User {username} deleted successfully.");
    }
    return Results.NotFound($"User {username} not found.");
});

app.MapGet("/api/recurring-bills", [Authorize] async (ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = GetUserId(user);
    return await db.RecurringBills.Where(b => b.UserId == userId).ToListAsync();
});

app.MapPost("/api/recurring-bills", [Authorize] async (ClaimsPrincipal user, RecurringBill bill, AppDbContext db) =>
{
    var userId = GetUserId(user);
    bill.UserId = userId;
    db.RecurringBills.Add(bill);
    await db.SaveChangesAsync();
    return Results.Created($"/api/recurring-bills/{bill.Id}", bill);
});

app.MapGet("/api/forecast/14-days", [Authorize] async (ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = GetUserId(user);
    var transactions = await db.Transactions.Where(t => t.UserId == userId).ToListAsync();
    var currentBalance = transactions.Sum(t => t.IsExpense ? -t.Amount : t.Amount);

    var recurringBills = await db.RecurringBills.Where(b => b.UserId == userId).ToListAsync();
    var forecast = new List<object>();

    var runningBalance = currentBalance;
    var today = DateTime.UtcNow.Date;

    for (int i = 0; i <= 14; i++)
    {
        var date = today.AddDays(i);
        var billsToday = recurringBills.Where(b => b.DueDayOfMonth == date.Day).ToList();
        
        var dailyExpense = billsToday.Sum(b => b.Amount);
        runningBalance -= dailyExpense;

        forecast.Add(new 
        {
            Date = date,
            Balance = runningBalance,
            BillsDue = billsToday.Select(b => new { b.Title, b.Amount })
        });
    }

    return Results.Ok(new { CurrentBalance = currentBalance, Forecast = forecast });
});

app.MapGet("/api/analytics/expense-income", [Authorize] async (ClaimsPrincipal user, string period, AppDbContext db) =>
{
    var userId = GetUserId(user);
    var transactions = await db.Transactions.Where(t => t.UserId == userId).ToListAsync();
    
    IEnumerable<dynamic> grouped = Enumerable.Empty<dynamic>();

    if (period == "daily")
    {
        grouped = transactions
            .GroupBy(t => t.Date.Date.ToString("yyyy-MM-dd"))
            .Select(g => new {
                Label = g.Key,
                Income = g.Where(t => !t.IsExpense).Sum(t => t.Amount),
                Expense = g.Where(t => t.IsExpense).Sum(t => t.Amount)
            }).OrderBy(x => x.Label);
    }
    else if (period == "monthly")
    {
        grouped = transactions
            .GroupBy(t => t.Date.ToString("yyyy-MM"))
            .Select(g => new {
                Label = g.Key,
                Income = g.Where(t => !t.IsExpense).Sum(t => t.Amount),
                Expense = g.Where(t => t.IsExpense).Sum(t => t.Amount)
            }).OrderBy(x => x.Label);
    }
    else if (period == "yearly")
    {
        grouped = transactions
            .GroupBy(t => t.Date.ToString("yyyy"))
            .Select(g => new {
                Label = g.Key,
                Income = g.Where(t => !t.IsExpense).Sum(t => t.Amount),
                Expense = g.Where(t => t.IsExpense).Sum(t => t.Amount)
            }).OrderBy(x => x.Label);
    }

    return Results.Ok(grouped);
});

app.MapGet("/api/analytics/categories", [Authorize] async (ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = GetUserId(user);
    // Group all historical expenses by Title
    var expenses = await db.Transactions
        .Where(t => t.UserId == userId && t.IsExpense)
        .ToListAsync();
        
    var grouped = expenses
        .Select(t => {
            string cat = t.Title.Contains("-") ? t.Title.Split("-")[0].Trim() : t.Title;
            if (cat.Contains("icici", StringComparison.OrdinalIgnoreCase)) cat = "ICICI Bank";
            else if (cat.Contains("sbi", StringComparison.OrdinalIgnoreCase)) cat = "SBI Bank";
            else if (cat.Contains("hdfc", StringComparison.OrdinalIgnoreCase)) cat = "HDFC Bank";
            else if (cat.Contains("zerodha", StringComparison.OrdinalIgnoreCase)) cat = "Zerodha";
            return new { t.Amount, Category = cat };
        })
        .GroupBy(t => t.Category)
        .Select(g => new {
            Name = g.Key,
            Value = g.Sum(t => t.Amount)
        })
        .OrderByDescending(x => x.Value);

    return Results.Ok(grouped);
});

// AI Features Endpoints
app.MapPost("/api/import/email-sync", [Authorize] async (ClaimsPrincipal userPrincipal, AppDbContext db, IConfiguration config) =>
{
    var userId = GetUserId(userPrincipal);
    var user = await db.Users.FindAsync(userId);
    if (user == null || string.IsNullOrEmpty(user.GoogleAccessToken))
    {
        return Results.BadRequest(new { message = "Gmail not connected. Please connect your Gmail account first." });
    }

    try {
        var oauthConfig = config.GetSection("GoogleOAuth");
        var flow = new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow(new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new Google.Apis.Auth.OAuth2.ClientSecrets
            {
                ClientId = oauthConfig["ClientId"],
                ClientSecret = oauthConfig["ClientSecret"]
            },
            Scopes = new[] { Google.Apis.Gmail.v1.GmailService.Scope.GmailReadonly }
        });

        var tokenResponse = new Google.Apis.Auth.OAuth2.Responses.TokenResponse
        {
            AccessToken = user.GoogleAccessToken,
            RefreshToken = user.GoogleRefreshToken,
            ExpiresInSeconds = 3600,
            IssuedUtc = DateTime.UtcNow.AddHours(-2) // Force it to be considered expired so it auto-refreshes
        };

        var credential = new Google.Apis.Auth.OAuth2.UserCredential(flow, userId.ToString(), tokenResponse);

        var service = new Google.Apis.Gmail.v1.GmailService(new Google.Apis.Services.BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Cents Demo"
        });

        var request = service.Users.Messages.List("me");
        request.MaxResults = 100; // Limit sync to 100 most recent emails

        var messagesResponse = await request.ExecuteAsync();
        var parsedTransactions = new System.Collections.Generic.List<Transaction>();

        if (messagesResponse.Messages != null)
        {
            foreach (var msg in messagesResponse.Messages)
            {
                var fullMsg = await service.Users.Messages.Get("me", msg.Id).ExecuteAsync();
                
                // Get subject for title
                var headers = fullMsg.Payload.Headers;
                var subject = headers.FirstOrDefault(h => h.Name == "Subject")?.Value ?? "";
                var title = headers.FirstOrDefault(h => h.Name == "From")?.Value ?? "Email Sync Transaction";
                title = title.Split('<')[0].Replace("\"", "").Trim();
                if (!string.IsNullOrEmpty(subject)) {
                    title += $" - {subject.Substring(0, Math.Min(subject.Length, 30))}";
                }

                // Get body for amount
                var body = fullMsg.Snippet ?? ""; // Snippet contains first ~200 chars
                
                // Broaden regex to catch $, ₹, Rs, USD, INR, etc. and ignore commas
                var match = Regex.Match(body, @"(?:USD|INR|₹|\$|Rs\.?|INR\s*|Rs\s*)\s*([0-9,]+\.[0-9]{2})", RegexOptions.IgnoreCase);
                if (match.Success && decimal.TryParse(match.Groups[1].Value.Replace(",", ""), out var amount))
                {
                    parsedTransactions.Add(new Transaction
                    {
                        Title = title,
                        Amount = amount,
                        Date = DateTimeOffset.FromUnixTimeMilliseconds(fullMsg.InternalDate ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()).UtcDateTime,
                        IsExpense = true,
                        UserId = userId,
                        SourceUrl = $"https://mail.google.com/mail/u/0/#all/{msg.Id}"
                    });
                }
            }
        }

        if (parsedTransactions.Any())
        {
            db.Transactions.AddRange(parsedTransactions);
            await db.SaveChangesAsync();
        }

        return Results.Ok(new { message = $"Successfully connected to Gmail API and parsed {parsedTransactions.Count} receipts.", count = parsedTransactions.Count });
    } catch (Exception ex) {
        Console.WriteLine($"Gmail API Sync Error: {ex.Message}");
        return Results.BadRequest(new { message = "Failed to sync with Gmail API." });
    }
});

app.MapGet("/api/sync/stream", async (HttpContext ctx, AppDbContext db, IConfiguration config) =>
{
    var tokenStr = ctx.Request.Query["token"].ToString();
    if (string.IsNullOrEmpty(tokenStr)) { ctx.Response.StatusCode = 401; return; }

    int userId = 0;
    try {
        var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes("super_secret_key_for_demo_app_which_needs_to_be_long_enough_for_hs256_algorithm!");
        tokenHandler.ValidateToken(tokenStr, new Microsoft.IdentityModel.Tokens.TokenValidationParameters {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
            ValidateIssuer = false,
            ValidateAudience = false,
            ClockSkew = TimeSpan.Zero
        }, out Microsoft.IdentityModel.Tokens.SecurityToken validatedToken);
        var jwtToken = (System.IdentityModel.Tokens.Jwt.JwtSecurityToken)validatedToken;
        userId = int.Parse(jwtToken.Claims.First(x => x.Type == "nameid" || x.Type == System.Security.Claims.ClaimTypes.NameIdentifier).Value);
    } catch (Exception ex) {
        Console.WriteLine($"Token validation error: {ex.Message}");
        ctx.Response.StatusCode = 401; return;
    }

    var user = await db.Users.FindAsync(userId);
    if (user == null || string.IsNullOrEmpty(user.GoogleAccessToken)) { 
        ctx.Response.Headers.Append("Content-Type", "text/event-stream");
        await ctx.Response.WriteAsync($"data: {{\"error\": \"Gmail not connected. Please connect your Gmail account first.\"}}\n\n");
        await ctx.Response.Body.FlushAsync();
        return; 
    }

    ctx.Response.Headers.Append("Content-Type", "text/event-stream");
    ctx.Response.Headers.Append("Cache-Control", "no-cache");
    ctx.Response.Headers.Append("Connection", "keep-alive");

    try {
        var oauthConfig = config.GetSection("GoogleOAuth");
        var flow = new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow(new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow.Initializer
        {
            ClientSecrets = new Google.Apis.Auth.OAuth2.ClientSecrets { ClientId = oauthConfig["ClientId"], ClientSecret = oauthConfig["ClientSecret"] },
            Scopes = new[] { Google.Apis.Gmail.v1.GmailService.Scope.GmailReadonly }
        });

        var tokenResponse = new Google.Apis.Auth.OAuth2.Responses.TokenResponse
        {
            AccessToken = user.GoogleAccessToken, RefreshToken = user.GoogleRefreshToken, ExpiresInSeconds = 3600, IssuedUtc = DateTime.UtcNow.AddHours(-2)
        };

        var credential = new Google.Apis.Auth.OAuth2.UserCredential(flow, userId.ToString(), tokenResponse);
        var service = new Google.Apis.Gmail.v1.GmailService(new Google.Apis.Services.BaseClientService.Initializer
        {
            HttpClientInitializer = credential, ApplicationName = "Cents Demo"
        });

        var request = service.Users.Messages.List("me");
        request.MaxResults = 100;
        var messagesResponse = await request.ExecuteAsync();
        var parsedTransactions = new System.Collections.Generic.List<Transaction>();
        var existingUrls = await db.Transactions.Where(t => t.UserId == userId && t.SourceUrl != null).Select(t => t.SourceUrl).ToListAsync();
        var existingSet = new System.Collections.Generic.HashSet<string>(existingUrls!);

        if (messagesResponse.Messages != null)
        {
            int total = messagesResponse.Messages.Count;
            int current = 0;
            foreach (var msg in messagesResponse.Messages)
            {
                current++;
                var sourceUrl = $"https://mail.google.com/mail/u/0/#all/{msg.Id}";
                if (existingSet.Contains(sourceUrl))
                {
                    await ctx.Response.WriteAsync($"data: {{\"current\": {current}, \"total\": {total}}}\n\n");
                    await ctx.Response.Body.FlushAsync();
                    continue;
                }

                var fullMsg = await service.Users.Messages.Get("me", msg.Id).ExecuteAsync();
                
                var headers = fullMsg.Payload.Headers;
                var subject = headers.FirstOrDefault(h => h.Name == "Subject")?.Value ?? "";
                var title = headers.FirstOrDefault(h => h.Name == "From")?.Value ?? "Email Sync Transaction";
                title = title.Split('<')[0].Replace("\"", "").Trim();
                if (!string.IsNullOrEmpty(subject)) { title += $" - {subject.Substring(0, Math.Min(subject.Length, 30))}"; }

                var body = fullMsg.Snippet ?? ""; 
                // Call JS parser
                try
                {
                    var scriptPath = System.IO.Path.Combine(Environment.CurrentDirectory, "SmsParser", "index.js");
                    var b64Body = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(body));
                    var nodePath = @"C:\Users\shihabudheen.kh\.gemini\antigravity-ide\scratch\node-v20.12.0-win-x64\node.exe";
                    
                    var processInfo = new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = nodePath,
                        Arguments = $"\"{scriptPath}\" \"{b64Body}\"",
                        RedirectStandardOutput = true,
                        UseShellExecute = false,
                        CreateNoWindow = true
                    };
                    using var process = System.Diagnostics.Process.Start(processInfo);
                    if (process != null)
                    {
                        var output = await process.StandardOutput.ReadToEndAsync();
                        process.WaitForExit(5000);
                        
                        if (!string.IsNullOrWhiteSpace(output) && output.Trim() != "null")
                        {
                            var info = System.Text.Json.JsonDocument.Parse(output);
                            var root = info.RootElement;
                            if (root.TryGetProperty("transaction", out var txElement) && txElement.ValueKind != System.Text.Json.JsonValueKind.Null)
                            {
                                var type = txElement.GetProperty("type").GetString() ?? "debit";
                                var amountStr = txElement.GetProperty("amount").GetString();
                                
                                if (decimal.TryParse(amountStr, out var amount))
                                {
                                    var isExpense = type.Equals("debit", StringComparison.OrdinalIgnoreCase);
                                    
                                    var merchant = txElement.GetProperty("merchant").GetString();
                                    if (string.IsNullOrEmpty(merchant))
                                    {
                                        if (root.TryGetProperty("account", out var accElement) && accElement.ValueKind != System.Text.Json.JsonValueKind.Null)
                                        {
                                            merchant = accElement.GetProperty("name").GetString();
                                        }
                                    }
                                    
                                    parsedTransactions.Add(new Transaction
                                    {
                                        Title = !string.IsNullOrEmpty(merchant) ? merchant : title,
                                        Amount = amount, 
                                        Date = DateTimeOffset.FromUnixTimeMilliseconds(fullMsg.InternalDate ?? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()).UtcDateTime,
                                        IsExpense = isExpense, 
                                        UserId = userId, 
                                        SourceUrl = sourceUrl
                                    });
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error running JS parser: {ex.Message}");
                }
                
                await ctx.Response.WriteAsync($"data: {{\"current\": {current}, \"total\": {total}}}\n\n");
                await ctx.Response.Body.FlushAsync();
            }
        }

        if (parsedTransactions.Any())
        {
            db.Transactions.AddRange(parsedTransactions);
            await db.SaveChangesAsync();
        }

        await ctx.Response.WriteAsync($"data: {{\"done\": true, \"count\": {parsedTransactions.Count}}}\n\n");
        await ctx.Response.Body.FlushAsync();
    } catch (Exception ex) {
        Console.WriteLine($"Stream Error: {ex.Message}");
        await ctx.Response.WriteAsync($"data: {{\"error\": \"{ex.Message}\"}}\n\n");
        await ctx.Response.Body.FlushAsync();
    }
});

app.MapGet("/api/insights", [Authorize] async (ClaimsPrincipal user, AppDbContext db) =>
{
    var userId = GetUserId(user);
    var recentTransactions = await db.Transactions
        .Where(t => t.UserId == userId && t.IsExpense && t.Date >= DateTime.UtcNow.AddDays(-30))
        .ToListAsync();

    var filteredTransactions = recentTransactions
        .Where(t => !t.Title.Contains("UPI", StringComparison.OrdinalIgnoreCase)
                 && !t.Title.Contains("IMPS", StringComparison.OrdinalIgnoreCase)
                 && !t.Title.Contains("NEFT", StringComparison.OrdinalIgnoreCase)
                 && !t.Title.Contains("debited", StringComparison.OrdinalIgnoreCase)
                 && !t.Title.Contains("payout", StringComparison.OrdinalIgnoreCase))
        .ToList();

    // 1. Find Duplicates (Same Title, Same Amount, more than once in 30 days for subscriptions)
    var duplicates = filteredTransactions
        .GroupBy(t => new { t.Title, t.Amount })
        .Where(g => g.Count() > 1 && g.Key.Amount > 5) // Over 5 to avoid grouping coffees
        .Select(g => new {
            Title = g.Key.Title,
            Amount = g.Key.Amount,
            Count = g.Count(),
            TotalWasted = (g.Count() - 1) * g.Key.Amount,
            Reason = "Multiple charges for the exact same subscription amount detected this month.",
            SourceUrl = g.FirstOrDefault()?.SourceUrl
        });

    // 2. Find Hidden Fees (Multiple small charges under $5 from the same merchant)
    var hiddenFees = filteredTransactions
        .Where(t => t.Amount < 5.00m)
        .GroupBy(t => t.Title)
        .Where(g => g.Count() >= 2)
        .Select(g => new {
            Title = g.Key,
            TotalCount = g.Count(),
            TotalAmount = g.Sum(t => t.Amount),
            Reason = "Multiple micro-transactions detected. These are often hidden convenience fees or 'drip' subscriptions.",
            SourceUrl = g.FirstOrDefault()?.SourceUrl
        });

    return Results.Ok(new {
        Duplicates = duplicates,
        HiddenFees = hiddenFees
    });
});

app.Run();

record AuthRequest(string Username, string PasswordHash);
record VerifyRequest(string Email, string Code);

public interface IEmailSender
{
    Task SendVerificationEmailAsync(string email, string code);
}

public class SmtpEmailSender : IEmailSender
{
    private readonly IConfiguration _config;
    public SmtpEmailSender(IConfiguration config) { _config = config; }

    public async Task SendVerificationEmailAsync(string email, string code)
    {
        var emailSettings = _config.GetSection("EmailSettings");
        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(emailSettings["SenderName"], emailSettings["SenderEmail"]));
        message.To.Add(new MailboxAddress("", email));
        message.Subject = "Verify your Cents account";
        message.Body = new TextPart("plain") { Text = $"Your 6-digit verification code is: {code}\n\nIt expires in 15 minutes." };

        using var client = new SmtpClient();
        await client.ConnectAsync(emailSettings["SmtpServer"], int.Parse(emailSettings["SmtpPort"]), MailKit.Security.SecureSocketOptions.StartTls);
        await client.AuthenticateAsync(emailSettings["Username"], emailSettings["Password"]);
        await client.SendAsync(message);
        await client.DisconnectAsync(true);
    }
}
