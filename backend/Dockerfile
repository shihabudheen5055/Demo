FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

# Copy csproj and restore as distinct layers
COPY ["CentsDemo.Backend.csproj", "./"]
RUN dotnet restore "CentsDemo.Backend.csproj"

# Copy everything else and build
COPY . .
RUN dotnet publish "CentsDemo.Backend.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# Note: Remember to set connection string in Render environment variables
ENTRYPOINT ["dotnet", "CentsDemo.Backend.dll"]
