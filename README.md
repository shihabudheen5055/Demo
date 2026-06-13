# Cents Demo

This is a demonstration application containing a React/Vite frontend and a .NET/C# backend with a PostgreSQL database.

## Prerequisites
- Node.js (v20+)
- .NET 8 SDK
- PostgreSQL (Local Docker container `expense-tracker-postgres-1` is used)

## Getting Started

You can quickly run both the frontend and backend simultaneously using the provided PowerShell script:

```powershell
powershell.exe -ExecutionPolicy Bypass -File .\run-servers.ps1
```

### Manual Startup

**Backend**
1. Navigate to the `backend` folder.
2. Run the application:
   ```bash
   dotnet run --project CentsDemo.Backend.csproj
   ```
   The backend API will run on `http://localhost:5163`.

**Frontend**
1. Navigate to the `frontend` folder.
2. Install dependencies (if you haven't already):
   ```bash
   npm install
   ```
3. Start the Vite dev server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5173` (or `5174` if `5173` is in use).

## Demo Login

You can test the application without registering by using the built-in demo account:
- **Email/Username**: `demo`
- **Password**: `demo`

If you register a new account, you must verify your email. For testing purposes, you can enter the bypass verification code **`000000`**.
