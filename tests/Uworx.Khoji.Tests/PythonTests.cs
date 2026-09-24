// Copyright 2026 UWorx Services.
// Licensed under the Apache License, Version 2.0.
// See LICENSE for the full license text.

using static Uworx.Khoji.Tests.NUnitConstants;

namespace Uworx.Khoji.Tests;

[TestFixture, Category(TestCatory.Integration)]

class PythonTests
{
    [TestCase("src", "khoji-analytics")]
    [TestCase("src", "kss")]
    public void AddDisclaimerToPythonFiles(params string[] relativePath)
    {
        var baseFolder = AppDomain.CurrentDomain.BaseDirectory;
        var fullPathParts = new string[] { "..", "..", "..", "..", ".." }
            .Concat(relativePath)
            .ToArray();
        var folder = Path.GetFullPath(Path.Combine(baseFolder, Path.Combine(fullPathParts)));

        var disclaimer =
            """
            ##############################################################################
            # Copyright 2026 UWorx Services.
            # Licensed under the Apache License, Version 2.0.
            # See LICENSE for the full license text.
            ##############################################################################
            
            """;

        int errorCount = 0;

        foreach (var file in Directory.EnumerateFiles(folder, "*.py", SearchOption.AllDirectories))
        {
            string[] firstLines = Array.Empty<string>();

            try
            {
                // Read only the first two lines — safe even on small files
                firstLines = File.ReadLines(file).Take(2).ToArray();
            }
            catch
            {
                errorCount++;
                continue;
            }

            if (firstLines.Any(l => l.Contains("Copyright") && l.Contains("UWorx Services")))
                continue;

            try
            {
                string original = File.ReadAllText(file);

                // Prepend disclaimer and an empty line after it
                string updated = disclaimer + Environment.NewLine + original;

                File.WriteAllText(file, updated);
            }
            catch
            {
                errorCount++;
                continue;
            }
        }

        Assert.That(errorCount, Is.Zero, $"{errorCount} file(s) failed while adding the disclaimer");
    }
}
