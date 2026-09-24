# Guide: Integration / Unit Tests

## Test Categories

### Unit Tests (`TestCatory.Unit`)
- **Fast execution** (< 1 second per test)
- **No external dependencies** (database, APIs, file system)
- **Use mocks and in-memory providers**
- **Run in CI/CD pipeline**

### Integration Tests (`TestCatory.Integration`)
- **Slower execution** (seconds to minutes)
- **External dependencies** (real database, APIs, services)
- **Run locally or in dedicated test environments**
- **Not run in standard CI/CD pipeline**

## Migration Checklist

### ✅ Good Candidates for Unit Tests
- [ ] Business logic classes
- [ ] Data transformation methods
- [ ] Validation logic
- [ ] Algorithm implementations
- [ ] Configuration parsing
- [ ] In-memory database operations

### ❌ Keep as Integration Tests
- [ ] External API calls (JIRA, Claude, etc.)
- [ ] Real database operations with complex queries
- [ ] File system operations
- [ ] Network operations
- [ ] End-to-end workflows

## Migration Steps

### 1. Identify Dependencies
```csharp
// Before (Integration Test)
[TestFixture, Category(TestCatory.Integration)]
class MyServiceTests
{
    string connectionString = "Server=localhost;...";
    
    [Test]
    public void TestMethod()
    {
        var service = new MyService(connectionString);
        // Test with real database
    }
}
```

### 2. Replace with Mocks/In-Memory
```csharp
// After (Unit Test)
[TestFixture, Category(TestCatory.Unit)]
class MyServiceUnitTests
{
    Mock<IMyDependency> mockDependency;
    
    [SetUp]
    public void Setup()
    {
        mockDependency = new Mock<IMyDependency>();
    }
    
    [Test]
    public void TestMethod()
    {
        var service = new MyService(mockDependency.Object);
        // Test with mocked dependencies
    }
}
```

### 3. Use In-Memory Database
```csharp
[SetUp]
public void Setup()
{
    var options = new DbContextOptionsBuilder<MyDbContext>()
        .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
        .Options;
    
    dbContext = new MyDbContext(options);
    dbContext.Database.EnsureCreated();
}
```

## Running Tests

### CI/CD Pipeline (Unit Tests Only)
```bash
# PowerShell
.\run-unit-tests.ps1

# Command Line
dotnet test --filter "TestCategory=Unit" --configuration Release
```

### Local Development (All Tests)
```bash
# PowerShell
.\run-all-tests.ps1

# Command Line
dotnet test --configuration Debug
```

### Integration Tests Only
```bash
# PowerShell
.\run-integration-tests.ps1

# Command Line
dotnet test --filter "TestCategory=Integration" --configuration Debug
```

## Best Practices

### Unit Test Principles
1. **Fast** - Each test should run in milliseconds
2. **Independent** - Tests don't depend on each other
3. **Repeatable** - Same result every time
4. **Self-validating** - Clear pass/fail result
5. **Timely** - Written alongside production code

### Mocking Guidelines
- Mock external dependencies (databases, APIs, file system)
- Use `Mock<T>` for interfaces
- Verify behavior, not just state
- Keep mocks simple and focused

### In-Memory Database Usage
- Use `UseInMemoryDatabase()` for EF Core tests
- Create fresh database per test with `Guid.NewGuid().ToString()`
- Clean up with `EnsureDeleted()` in teardown

## Examples in Codebase

### ✅ Good Unit Tests
- `DateTimeTests.cs` - Pure logic testing
- `StrategyMapTests.cs` - Algorithm testing
- `IntentDetectorTests.cs` - Business logic with file dependencies
- `DictionaryUnitTests.cs` - In-memory database testing

### 🔄 Integration Tests (Keep as-is)
- `DapploJiraTests.cs` - External JIRA API calls
- `AnalyticsTests.cs` - Complex database operations
- `ClaudeClientTests.cs` - External Claude API calls

## Troubleshooting

### Common Issues
1. **Slow unit tests** - Check for external dependencies
2. **Flaky tests** - Ensure proper cleanup and isolation
3. **Complex setup** - Consider if test should be integration test
4. **Mock complexity** - Simplify or use real objects for unit tests

### Performance Targets
- Unit tests: < 100ms per test
- Integration tests: < 30 seconds per test
- Total unit test suite: < 30 seconds