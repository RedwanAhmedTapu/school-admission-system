# syntax=docker/dockerfile:1
# Build context: ./backend

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY SchoolAdmission.Api/SchoolAdmission.Api.csproj SchoolAdmission.Api/
RUN dotnet restore SchoolAdmission.Api/SchoolAdmission.Api.csproj
COPY SchoolAdmission.Api/ SchoolAdmission.Api/
RUN dotnet publish SchoolAdmission.Api/SchoolAdmission.Api.csproj -c Release -o /app/publish --no-restore

# Used by `docker compose --profile test run --rm backend-tests`
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS test
WORKDIR /src
COPY . .
RUN dotnet restore SchoolAdmission.sln
ENTRYPOINT ["dotnet", "test", "SchoolAdmission.sln", "--no-restore", "--logger", "console;verbosity=normal"]

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "SchoolAdmission.Api.dll"]
