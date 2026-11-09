using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using SchoolAdmission.Api.Services;

namespace SchoolAdmission.Tests;

public class AdmissionTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _f;
    private readonly HttpClient _http;

    public AdmissionTests(ApiFactory factory)
    {
        _f = factory;
        _http = factory.CreateClient();
    }

    // ---- Test 1: successful reservation ---------------------------------------------------

    [Fact]
    public async Task Apply_creates_a_hold_and_updates_seat_counts()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 10);
        var student = ApiFactory.NewStudentId();

        var res = await _f.ApplyAsync(_http, cls.Id, student);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var hold = await ApiFactory.ReadAsync<HoldBody>(res);
        Assert.Equal("HELD", hold.Status);
        Assert.Equal(cls.Id, hold.ClassId);
        Assert.Equal(student, hold.StudentId);
        Assert.True(hold.ExpiresAt > DateTime.UtcNow.AddSeconds(-5));

        var after = await _f.GetClassAsync(_http, cls.Id);
        Assert.Equal(10, after.TotalSeats);
        Assert.Equal(1, after.HeldSeats);
        Assert.Equal(0, after.ConfirmedSeats);
        Assert.Equal(9, after.AvailableSeats);

        var status = await _http.GetFromJsonAsync<HoldStatusBody>($"/holds/{hold.HoldId}");
        Assert.Equal("HELD", status!.Status);
    }

    // ---- Test 2: expiry releases the seat --------------------------------------------------

    [Fact]
    public async Task Expired_hold_is_swept_and_the_seat_becomes_available_again()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 1);
        var student = ApiFactory.NewStudentId();
        var hold = await ApiFactory.ReadAsync<HoldBody>(await _f.ApplyAsync(_http, cls.Id, student));
        Assert.Equal(0, (await _f.GetClassAsync(_http, cls.Id)).AvailableSeats);

        // Move the clock past the deadline and run the same sweep the background worker runs.
        _f.Clock.Advance(TimeSpan.FromSeconds(ApiFactory.HoldSeconds + 1));
        using (var scope = _f.Services.CreateScope())
        {
            var swept = await scope.ServiceProvider.GetRequiredService<HoldExpiryService>().SweepAsync(default);
            Assert.True(swept >= 1);
        }

        var status = await _http.GetFromJsonAsync<HoldStatusBody>($"/holds/{hold.HoldId}");
        Assert.Equal("EXPIRED", status!.Status);

        var after = await _f.GetClassAsync(_http, cls.Id);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(1, after.AvailableSeats);

        // The freed seat can be taken by someone else, and the first student can no longer confirm.
        Assert.Equal(HttpStatusCode.Created, (await _f.ApplyAsync(_http, cls.Id, ApiFactory.NewStudentId())).StatusCode);
        var confirm = await _f.SendAsync(_http, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", student);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);
    }

    [Fact]
    public async Task Hold_past_its_deadline_is_reported_expired_even_before_the_sweeper_runs()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 1);
        var hold = await ApiFactory.ReadAsync<HoldBody>(await _f.ApplyAsync(_http, cls.Id, ApiFactory.NewStudentId()));

        _f.Clock.Advance(TimeSpan.FromSeconds(ApiFactory.HoldSeconds + 1));

        var status = await _http.GetFromJsonAsync<HoldStatusBody>($"/holds/{hold.HoldId}");
        Assert.Equal("EXPIRED", status!.Status);
        Assert.Equal(1, (await _f.GetClassAsync(_http, cls.Id)).AvailableSeats);
    }

    // ---- Test 3: real concurrency against PostgreSQL ---------------------------------------

    [Fact]
    public async Task Many_concurrent_applications_never_exceed_total_seats()
    {
        const int seats = 5;
        const int applicants = 60;
        var cls = await _f.CreateClassAsync(_http, seats);

        var students = Enumerable.Range(0, applicants).Select(_ => ApiFactory.NewStudentId()).ToList();
        using var gate = new ManualResetEventSlim(false);

        var tasks = students.Select(s => Task.Run(async () =>
        {
            gate.Wait();
            return (await _f.ApplyAsync(_http, cls.Id, s)).StatusCode;
        })).ToList();

        gate.Set(); // release everyone at the same moment
        var codes = await Task.WhenAll(tasks);

        Assert.Equal(seats, codes.Count(c => c == HttpStatusCode.Created));
        Assert.Equal(applicants - seats, codes.Count(c => c == HttpStatusCode.Conflict));
        Assert.DoesNotContain(codes, c => (int)c >= 500);

        var after = await _f.GetClassAsync(_http, cls.Id);
        Assert.Equal(seats, after.HeldSeats);
        Assert.Equal(0, after.AvailableSeats);
        Assert.True(after.HeldSeats + after.ConfirmedSeats <= after.TotalSeats);
    }

    [Fact]
    public async Task Concurrent_applications_from_the_same_student_create_exactly_one_hold()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 20);
        var student = ApiFactory.NewStudentId();
        using var gate = new ManualResetEventSlim(false);

        var tasks = Enumerable.Range(0, 15).Select(_ => Task.Run(async () =>
        {
            gate.Wait();
            return (await _f.ApplyAsync(_http, cls.Id, student)).StatusCode;
        })).ToList();
        gate.Set();
        var codes = await Task.WhenAll(tasks);

        Assert.Equal(1, codes.Count(c => c == HttpStatusCode.Created));
        Assert.Equal(14, codes.Count(c => c == HttpStatusCode.Conflict));
        Assert.Equal(1, (await _f.GetClassAsync(_http, cls.Id)).HeldSeats);
    }

    // ---- duplicate / confirm / ownership / cancel / validation -----------------------------

    [Fact]
    public async Task Second_application_by_the_same_student_for_the_same_class_is_a_conflict()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 5);
        var student = ApiFactory.NewStudentId();

        Assert.Equal(HttpStatusCode.Created, (await _f.ApplyAsync(_http, cls.Id, student)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await _f.ApplyAsync(_http, cls.Id, student)).StatusCode);
        Assert.Equal(1, (await _f.GetClassAsync(_http, cls.Id)).HeldSeats);
    }

    [Fact]
    public async Task Confirm_is_idempotent_and_counts_the_seat_exactly_once()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 3);
        var student = ApiFactory.NewStudentId();
        var hold = await ApiFactory.ReadAsync<HoldBody>(await _f.ApplyAsync(_http, cls.Id, student));

        for (var i = 0; i < 3; i++)
        {
            var res = await _f.SendAsync(_http, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", student);
            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            Assert.Equal("CONFIRMED", (await ApiFactory.ReadAsync<ConfirmBody>(res)).Status);
        }

        var after = await _f.GetClassAsync(_http, cls.Id);
        Assert.Equal(1, after.ConfirmedSeats);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(2, after.AvailableSeats);
    }

    [Fact]
    public async Task Concurrent_confirms_of_one_hold_count_once()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 3);
        var student = ApiFactory.NewStudentId();
        var hold = await ApiFactory.ReadAsync<HoldBody>(await _f.ApplyAsync(_http, cls.Id, student));
        using var gate = new ManualResetEventSlim(false);

        var tasks = Enumerable.Range(0, 10).Select(_ => Task.Run(async () =>
        {
            gate.Wait();
            return (await _f.SendAsync(_http, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", student)).StatusCode;
        })).ToList();
        gate.Set();
        var codes = await Task.WhenAll(tasks);

        Assert.All(codes, c => Assert.Equal(HttpStatusCode.OK, c));
        Assert.Equal(1, (await _f.GetClassAsync(_http, cls.Id)).ConfirmedSeats);
    }

    [Fact]
    public async Task Only_the_owner_can_confirm_or_cancel()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 3);
        var owner = ApiFactory.NewStudentId();
        var other = ApiFactory.NewStudentId();
        var hold = await ApiFactory.ReadAsync<HoldBody>(await _f.ApplyAsync(_http, cls.Id, owner));

        var confirm = await _f.SendAsync(_http, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", other);
        var cancel = await _f.SendAsync(_http, HttpMethod.Delete, $"/holds/{hold.HoldId}", other);

        Assert.Equal(HttpStatusCode.Forbidden, confirm.StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, cancel.StatusCode);
        var status = await _http.GetFromJsonAsync<HoldStatusBody>($"/holds/{hold.HoldId}");
        Assert.Equal("HELD", status!.Status);
    }

    [Fact]
    public async Task Cancel_releases_the_seat_and_cannot_be_confirmed_afterwards()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 1);
        var student = ApiFactory.NewStudentId();
        var hold = await ApiFactory.ReadAsync<HoldBody>(await _f.ApplyAsync(_http, cls.Id, student));

        var cancel = await _f.SendAsync(_http, HttpMethod.Delete, $"/holds/{hold.HoldId}", student);
        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);

        var after = await _f.GetClassAsync(_http, cls.Id);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(1, after.AvailableSeats);

        var confirm = await _f.SendAsync(_http, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", student);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);

        // The same student may apply again once the earlier application is cancelled.
        Assert.Equal(HttpStatusCode.Created, (await _f.ApplyAsync(_http, cls.Id, student)).StatusCode);
    }

    [Fact]
    public async Task Cancelling_a_confirmed_admission_is_refused_and_keeps_the_count()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 2);
        var student = ApiFactory.NewStudentId();
        var hold = await ApiFactory.ReadAsync<HoldBody>(await _f.ApplyAsync(_http, cls.Id, student));
        await _f.SendAsync(_http, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", student);

        var cancel = await _f.SendAsync(_http, HttpMethod.Delete, $"/holds/{hold.HoldId}", student);

        Assert.Equal(HttpStatusCode.Conflict, cancel.StatusCode);
        Assert.Equal(1, (await _f.GetClassAsync(_http, cls.Id)).ConfirmedSeats);
    }

    [Fact]
    public async Task My_holds_lists_only_the_requesting_students_applications()
    {
        var cls = await _f.CreateClassAsync(_http, seats: 5, name: "Class 9 - Morning Shift");
        var mine = ApiFactory.NewStudentId();
        var theirs = ApiFactory.NewStudentId();
        await _f.ApplyAsync(_http, cls.Id, mine);
        await _f.ApplyAsync(_http, cls.Id, theirs);

        var res = await _f.SendAsync(_http, HttpMethod.Get, "/me/holds", mine);
        res.EnsureSuccessStatusCode();
        var list = await ApiFactory.ReadAsync<List<MyHoldBody>>(res);

        var only = Assert.Single(list);
        Assert.Equal(cls.Id, only.ClassId);
        Assert.Equal("Class 9 - Morning Shift", only.ClassName);
        Assert.Equal("HELD", only.Status);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("123")]
    [InlineData("1234567890123456a")]
    [InlineData("123456789012345678")]
    public async Task Missing_or_malformed_student_id_is_a_400_not_a_500(string? studentId)
    {
        var cls = await _f.CreateClassAsync(_http, seats: 2);

        Assert.Equal(HttpStatusCode.BadRequest, (await _f.ApplyAsync(_http, cls.Id, studentId)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _f.SendAsync(_http, HttpMethod.Get, "/me/holds", studentId)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await _f.SendAsync(_http, HttpMethod.Post, "/holds/h_x/confirm", studentId)).StatusCode);
    }

    [Theory]
    [InlineData("{}")]
    [InlineData("{\"name\":\"\",\"totalSeats\":10}")]
    [InlineData("{\"name\":\"   \",\"totalSeats\":10}")]
    [InlineData("{\"name\":\"Class 1\",\"totalSeats\":0}")]
    [InlineData("{\"name\":\"Class 1\",\"totalSeats\":-4}")]
    [InlineData("{\"name\":\"Class 1\",\"totalSeats\":\"many\"}")]
    [InlineData("{\"name\":\"Class 1\",\"totalSeats\":12.5}")]
    [InlineData("{not json")]
    public async Task Invalid_class_payloads_are_a_400_not_a_500(string body)
    {
        var res = await _http.PostAsync("/classes", new StringContent(body, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Unknown_ids_are_404()
    {
        var student = ApiFactory.NewStudentId();

        Assert.Equal(HttpStatusCode.NotFound, (await _http.GetAsync("/classes/c_missing")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _f.ApplyAsync(_http, "c_missing", student)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _http.GetAsync("/holds/h_missing")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _f.SendAsync(_http, HttpMethod.Post, "/holds/h_missing/confirm", student)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _f.SendAsync(_http, HttpMethod.Delete, "/holds/h_missing", student)).StatusCode);
    }

    [Fact]
    public async Task Create_class_returns_201_with_the_contract_fields_and_appears_in_the_list()
    {
        var res = await _http.PostAsJsonAsync("/classes", new { name = "Class 6 - Morning Shift", totalSeats = 120 });
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var created = await ApiFactory.ReadAsync<ClassCreatedBody>(res);
        Assert.Equal("Class 6 - Morning Shift", created.Name);
        Assert.Equal(120, created.TotalSeats);

        var list = await _http.GetFromJsonAsync<List<ClassBody>>("/classes");
        var found = Assert.Single(list!, c => c.Id == created.Id);
        Assert.Equal(120, found.AvailableSeats);
    }

    private record MyHoldBody(string HoldId, string ClassId, string ClassName, string Status, DateTime ExpiresAt);
    private record ClassCreatedBody(string Id, string Name, int TotalSeats);
}
