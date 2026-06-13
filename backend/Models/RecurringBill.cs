using System;

namespace CentsDemo.Backend.Models
{
    public class RecurringBill
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int DueDayOfMonth { get; set; } // e.g., 15 for 15th of every month
        public int UserId { get; set; }
    }
}
