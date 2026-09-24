using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class DistributedCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DistributedCacheEntry",
                schema: "kgs",
                columns: table => new
                {
                    Key = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<byte[]>(type: "bytea", nullable: true),
                    AbsoluteExpiration = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SlidingExpiration = table.Column<TimeSpan>(type: "interval", nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DistributedCacheEntry", x => x.Key);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DistributedCacheEntry",
                schema: "kgs");
        }
    }
}
