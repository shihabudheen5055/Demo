using System;

namespace CentsDemo.Backend.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public bool IsExpense { get; set; } // true if money out, false if money in
        public int UserId { get; set; }
        public string? SourceUrl { get; set; }
    }
}
