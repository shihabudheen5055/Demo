
using System;
using System.Linq;
using Microsoft.EntityFrameworkCore;
using CentsDemo.Backend.Data;
using CentsDemo.Backend.Models;
using Microsoft.Extensions.Configuration;
using System.IO;

namespace ResetApp {
    class Program2 {
        static void Run() {
            var builder = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false);
            var config = builder.Build();

            var optionsBuilder = new DbContextOptionsBuilder<AppDbContext>();
            optionsBuilder.UseNpgsql(config.GetConnectionString("DefaultConnection"));

            using (var db = new AppDbContext(optionsBuilder.Options))
            {
                var user = db.Users.FirstOrDefault(u => u.Username == "khshihabkh@gmail.com");
                if (user != null)
                {
                    var transactions = db.Transactions.Where(t => t.UserId == user.Id);
                    db.Transactions.RemoveRange(transactions);
                    
                    var recurringBills = db.RecurringBills.Where(b => b.UserId == user.Id);
                    db.RecurringBills.RemoveRange(recurringBills);

                    db.Users.Remove(user);
                    db.SaveChanges();
                    Console.WriteLine("User khshihabkh@gmail.com successfully deleted from the database!");
                }
                else
                {
                    Console.WriteLine("User not found!");
                }
            }
        }
    }
}

