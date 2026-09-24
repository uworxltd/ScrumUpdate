using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class AddLlmCallLogTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LlmCallLogs",
                schema: "kgs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LlmName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PromptName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InputTokens = table.Column<int>(type: "integer", nullable: false),
                    OutputTokens = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<int>(type: "integer", maxLength: 50, nullable: true),
                    ResponseTime = table.Column<TimeSpan>(type: "interval", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LlmCallLogs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallLogs_CreatedAt",
                schema: "kgs",
                table: "LlmCallLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallLogs_LlmName",
                schema: "kgs",
                table: "LlmCallLogs",
                column: "LlmName");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallLogs_PromptName",
                schema: "kgs",
                table: "LlmCallLogs",
                column: "PromptName");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallLogs_TenantId",
                schema: "kgs",
                table: "LlmCallLogs",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallLogs_TenantId_CreatedAt",
                schema: "kgs",
                table: "LlmCallLogs",
                columns: new[] { "TenantId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LlmCallLogs",
                schema: "kgs");
        }
    }
}
