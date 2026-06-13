using System.Text.Json.Serialization;

namespace CentsDemo.Backend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        public bool IsEmailVerified { get; set; } = false;
        public string? VerificationCode { get; set; }
        public DateTime? VerificationCodeExpiry { get; set; }
        public string? GoogleRefreshToken { get; set; }
        public string? GoogleAccessToken { get; set; }
        public long? TelegramChatId { get; set; }
        public string? TelegramLinkToken { get; set; }
        public DateTime? TelegramLinkTokenExpiry { get; set; }
    }
}
