using Microsoft.EntityFrameworkCore;
using CentsDemo.Backend.Models;
using System;

namespace CentsDemo.Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Transaction> Transactions { get; set; }
        public DbSet<RecurringBill> RecurringBills { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Seed User
            modelBuilder.Entity<User>().HasData(
                new User { Id = 1, Username = "demo", PasswordHash = "demo", IsEmailVerified = true } // Simple plain-text for demo MVP
            );

            // Seed some realistic initial data for UserId = 1
            var transactions = new System.Collections.Generic.List<Transaction>
            {
                new Transaction { Id = 1, Title = "Initial Balance", Amount = 5000.00m, Date = DateTime.UtcNow.AddDays(-5), IsExpense = false, UserId = 1 },
                new Transaction { Id = 2, Title = "Groceries", Amount = 150.00m, Date = DateTime.UtcNow.AddDays(-2), IsExpense = true, UserId = 1 },
                new Transaction { Id = 3, Title = "Gas", Amount = 45.00m, Date = DateTime.UtcNow.AddDays(-1), IsExpense = true, UserId = 1 }
            };

            int nextId = 4;
            var random = new Random(12345); // Deterministic random seed
            var startDate = DateTime.UtcNow.AddYears(-2);
            for (int i = 0; i < 24; i++) // 24 months
            {
                var monthDate = startDate.AddMonths(i);
                
                // Income
                transactions.Add(new Transaction { Id = nextId++, Title = "Salary", Amount = 4000.00m, Date = monthDate.AddDays(random.Next(1, 5)), IsExpense = false, UserId = 1 });
                
                // Recurring Expenses
                transactions.Add(new Transaction { Id = nextId++, Title = "Rent", Amount = 1500.00m, Date = monthDate.AddDays(1), IsExpense = true, UserId = 1 });
                transactions.Add(new Transaction { Id = nextId++, Title = "Utilities", Amount = random.Next(150, 250), Date = monthDate.AddDays(10), IsExpense = true, UserId = 1 });
                
                // Variable Expenses
                for (int j = 0; j < 5; j++)
                {
                    transactions.Add(new Transaction { Id = nextId++, Title = "Groceries/Shopping", Amount = random.Next(50, 300), Date = monthDate.AddDays(random.Next(5, 28)), IsExpense = true, UserId = 1 });
                }
            }

            modelBuilder.Entity<Transaction>().HasData(transactions);

            modelBuilder.Entity<RecurringBill>().HasData(
                new RecurringBill { Id = 1, Title = "Rent", Amount = 1500.00m, DueDayOfMonth = 1, UserId = 1 },
                new RecurringBill { Id = 2, Title = "Netflix", Amount = 15.99m, DueDayOfMonth = 15, UserId = 1 },
                new RecurringBill { Id = 3, Title = "Gym", Amount = 40.00m, DueDayOfMonth = 20, UserId = 1 }
            );
        }
    }
}
