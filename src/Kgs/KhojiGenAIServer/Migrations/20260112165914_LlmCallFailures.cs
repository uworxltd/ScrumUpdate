using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class LlmCallFailures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "LlmCallFailures",
                schema: "kgs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LlmName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    PromptName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    StatusCode = table.Column<int>(type: "integer", nullable: true),
                    ErrorCode = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    TenantId = table.Column<int>(type: "integer", nullable: true),
                    ExceptionType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ExceptionMessage = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Exception = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LlmCallFailures", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallFailures_CreatedAt",
                schema: "kgs",
                table: "LlmCallFailures",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallFailures_LlmName",
                schema: "kgs",
                table: "LlmCallFailures",
                column: "LlmName");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallFailures_PromptName",
                schema: "kgs",
                table: "LlmCallFailures",
                column: "PromptName");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallFailures_StatusCode",
                schema: "kgs",
                table: "LlmCallFailures",
                column: "StatusCode");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallFailures_TenantId",
                schema: "kgs",
                table: "LlmCallFailures",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_LlmCallFailures_TenantId_CreatedAt",
                schema: "kgs",
                table: "LlmCallFailures",
                columns: new[] { "TenantId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LlmCallFailures",
                schema: "kgs");
        }
    }
}
