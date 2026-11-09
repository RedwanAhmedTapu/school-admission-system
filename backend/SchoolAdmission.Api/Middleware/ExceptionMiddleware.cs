using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Api.Middleware;

/// <summary>
/// Turns ApiException into a JSON error { "error": { "code", "message" } }.
/// Anything unexpected becomes a generic 500 with no internal details.
/// Also stamps every response with X-Server-Time so the UI countdown can correct clock skew.
/// </summary>
public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, TimeProvider clock)
{
    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Server-Time"] = clock.GetUtcNow().ToString("O");
            return Task.CompletedTask;
        });

        try
        {
            await next(context);
        }
        catch (ApiException ex)
        {
            await Write(context, ex.StatusCode, ex.Code, ex.Message);
        }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
        {
            // client went away; nothing to send
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            await Write(context, StatusCodes.Status500InternalServerError, "server_error",
                "Something went wrong on our side. Please try again.");
        }
    }

    private static Task Write(HttpContext context, int status, string code, string message)
    {
        if (context.Response.HasStarted) return Task.CompletedTask;
        // Deliberately NOT calling Response.Clear(): it would also wipe the CORS headers and the
        // browser could then not read this error body.
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(new { error = new { code, message } });
    }
}
