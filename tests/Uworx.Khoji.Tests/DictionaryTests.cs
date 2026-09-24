// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using KhojiGenAIServer.Data;
using KhojiGenAIServer.DatabaseCollections;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text.Json;
using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

// public because of ILogger<T>
[TestFixture, Category(TestCatory.Unit)]
public class DictionaryTests
{
    class TestValue
    {
        public int Id { get; set; }
        public string Data { get; set; }

        public override bool Equals(object obj)
        {
            if (obj is TestValue other)
            {
                return Id == other.Id && Data == other.Data;
            }
            return false;
        }

        public override int GetHashCode() => HashCode.Combine(Id, Data);
    }

    Mock<ILogger<DictionaryTests>> loggerMock;
    //KGSDbContext dbContext;
    int testInstanceId;
    //PersistedDictionary<string, TestValue> dictionary;

    //[OneTimeSetUp]
    //public void OneTimeSetup()
    //{
    //    // Use a unique database for testing to avoid conflicts
    //    connectionString = "Server=localhost;Port=5432;Username=khoji-admin;Password=khoji;Database=khoji-test-dictionaries";

    //    // Create test database and schema
    //    using var context = new KGSDbContext(connectionString);
    //    context.Database.EnsureDeleted(); // Start fresh
    //    context.Database.EnsureCreated();
    //}

    [SetUp]
    public void Setup()
    {
        loggerMock = new Mock<ILogger<DictionaryTests>>();
        testInstanceId = new Random().Next(1, 1000000); // Use random instance ID to isolate tests
    }

    (PersistedDictionary<string, TestValue>, KGSDbContext) getInMemoryDictionary(string dictionaryName = "TestDictionary")
    {
        // Use in-memory database for unit tests
        var options = new DbContextOptionsBuilder<KGSDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        var dbContext = new KGSDbContext(options, dontLetItDispose: true);  // preventing memory database from disposing as
        dbContext.Database.EnsureCreated();                                 // individual dictionary methods dispose the context
                                                                            // so we dont keep the connections opened
        var dictionary = new PersistedDictionary<string, TestValue>(loggerMock.Object,
            () => dbContext,
            testInstanceId, dictionaryName);
        return (dictionary, dbContext);
    }

    //[TearDown]
    //public void TearDown()
    //{
    //    dictionary?.Clear();
    //    dbContext?.Dispose();
    //}

    //[OneTimeTearDown]
    //public void OneTimeTearDown()
    //{
    //    // Clean up test database
    //    using var context = new KGSDbContext(connectionString);
    //    context.Database.EnsureDeleted();
    //}

    [Test]
    public void Add_WhenKeyIsNew_ShouldAddToMemoryAndDatabase()
    {
        // Arrange
        var testValue = new TestValue { Id = 1, Data = "Test" };
        (var dictionary, var dbContext) = getInMemoryDictionary();

        // Act
        dictionary.Add("key1", testValue);

        // Assert
        // Check memory
        Assert.That(dictionary.ContainsKey("key1"), Is.True);
        Assert.That(dictionary["key1"], Is.EqualTo(testValue));

        // Check database
        var dbValue = dbContext.StoredKeyValues.FirstOrDefault(x => x.InstanceId == testInstanceId && x.Key == "key1");
        Assert.That(dbValue, Is.Not.Null);
        var deserializedValue = JsonSerializer.Deserialize<TestValue>(dbValue.ValueJson);
        Assert.That(deserializedValue, Is.EqualTo(testValue));
    }

    [Test]
    public void Add_WhenKeyExists_ShouldThrowException()
    {
        // Arrange
        var testValue = new TestValue { Id = 1, Data = "Test" };
        (var dictionary, var dbContext) = getInMemoryDictionary();

        // Act
        dictionary.Add("key1", testValue);

        // Assert
        Assert.Throws<ArgumentException>(() =>
                 dictionary.Add("key1", new TestValue { Id = 2, Data = "Test2" }));
    }

    [Test]
    public void Remove_WhenKeyExists_ShouldRemoveFromMemoryAndDatabase()
    {
        // Arrange
        var testValue = new TestValue { Id = 1, Data = "Test" };
        (var dictionary, var dbContext) = getInMemoryDictionary();

        // Act
        dictionary.Add("key1", testValue);
        var result = dictionary.Remove("key1");

        // Assert
        Assert.That(result, Is.True);
        Assert.That(dictionary.ContainsKey("key1"), Is.False);

        var dbValue = dbContext.StoredKeyValues.FirstOrDefault(x => x.InstanceId == testInstanceId && x.Key == "key1");
        Assert.That(dbValue, Is.Null);
    }

    [Test]
    public void Remove_WhenKeyDoesNotExist_ShouldReturnFalse()
    {
        // Arrange
        (var dictionary, _) = getInMemoryDictionary();

        // Act
        var result = dictionary.Remove("nonexistent");

        // Assert
        Assert.That(result, Is.False);
    }

    [Test]
    public void Clear_ShouldRemoveAllItemsFromMemoryAndDatabase()
    {
        // Arrange
        (var dictionary, var dbContext) = getInMemoryDictionary();

        // Act
        for (int i = 0; i < 5; i++)
            dictionary.Add($"key{i}", new TestValue { Id = i, Data = $"Test{i}" });
        dictionary.Clear();

        // Assert
        Assert.That(dictionary, Is.Empty);
        var dbValues = dbContext.StoredKeyValues.Where(x => x.InstanceId == testInstanceId)
            .ToList();
        Assert.That(dbValues, Is.Empty);
    }

    [Test]
    public void Constructor_ShouldLoadExistingData()
    {
        // Arrange
        var testValues = new Dictionary<string, TestValue>
        {
            { "key1", new TestValue { Id = 1, Data = "Test1" } },
            { "key2", new TestValue { Id = 2, Data = "Test2" } }
        };
        (var dictionary, var dbContext) = getInMemoryDictionary("TestDictionary");

        // Act
        foreach (var kvp in testValues)
            dictionary.Add(kvp.Key, kvp.Value);

        var newDictionary = new PersistedDictionary<string, TestValue>(loggerMock.Object,
            () => dbContext,
            testInstanceId, "TestDictionary"); // same name

        // Assert
        Assert.That(newDictionary.Count, Is.EqualTo(testValues.Count));
        foreach (var kvp in testValues)
            Assert.That(newDictionary[kvp.Key], Is.EqualTo(kvp.Value));
    }

    [Test]
    public void Constructor_WithInvalidData_ShouldSkipInvalidItems()
    {
        // Arrange
        (var dictionary, var dbContext) = getInMemoryDictionary("TestDictionary");

        // Act
        dictionary.Add("valid", new TestValue { Id = 1, Data = "Valid" });  // valid item

        var invalidItem = new StoredKeyValue
        {
            InstanceId = testInstanceId,
            DictionaryName = "TestDictionary",
            Key = "invalid",
            Order = 1,
            ValueType = "InvalidType",
            ValueJson = "{\"invalid\":\"json\"}"
        };
        dbContext.StoredKeyValues.Add(invalidItem);                         // invalid item directly to database
        dbContext.SaveChanges();

        var newDictionary = new PersistedDictionary<string, TestValue>(loggerMock.Object,
            () => dbContext,
            testInstanceId, "TestDictionary"); // same name

        // Assert
        Assert.That(newDictionary.Count, Is.EqualTo(1));
        Assert.That(newDictionary.ContainsKey("valid"), Is.True);
        Assert.That(newDictionary.ContainsKey("invalid"), Is.False);
    }

    //[Test]
    //public void Add_WhenDatabaseFails_ShouldRollbackMemoryChanges()
    //{
    //    // Arrange
    //    var invalidValue = new TestValue { Id = 1, Data = new string('x', 10000) }; // Its not too large

    //    // Act & Assert
    //    Assert.Throws<ApplicationException>(() => dictionary.Add("key1", invalidValue));
    //    Assert.That(dictionary.ContainsKey("key1"), Is.False);
    //}

    [Test]
    public void MultipleInstances_ShouldNotInterfereWithEachOther()
    {
        // Arrange
        (var dict1, var dbContext) = getInMemoryDictionary("Dict1");
        var dict2 = new PersistedDictionary<string, TestValue>(loggerMock.Object,
            () => dbContext,
            testInstanceId, "Dict2");

        // Act
        dict1.Add("key1", new TestValue { Id = 1, Data = "Dict1" });
        dict2.Add("key1", new TestValue { Id = 2, Data = "Dict2" });

        // Assert
        Assert.That(dict1["key1"].Data, Is.EqualTo("Dict1"));
        Assert.That(dict2["key1"].Data, Is.EqualTo("Dict2"));
    }
}
