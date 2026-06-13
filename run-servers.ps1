$env:Path = "C:\Users\shihabudheen.kh\.gemini\antigravity-ide\scratch\node-v20.12.0-win-x64;" + $env:Path

Write-Host "Starting Backend..."
Start-Process "dotnet" -ArgumentList "run --project backend/CentsDemo.Backend.csproj" -NoNewWindow

Write-Host "Starting Frontend..."
cd frontend
Start-Process "npm.cmd" -ArgumentList "run dev" -NoNewWindow
