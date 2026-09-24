using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class JobDefinitions2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom")
                .Annotation("Npgsql:Enum:kgs.job_status", "pending,running,success,failed,skipped")
                .OldAnnotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom");

            migrationBuilder.CreateTable(
                name: "JobDefinitions",
                schema: "kgs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    JobType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InstanceId = table.Column<int>(type: "integer", nullable: false),
                    ConstructionString = table.Column<string>(type: "text", nullable: false),
                    LastRunTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastRunStatus = table.Column<int>(type: "integer", nullable: false),
                    LastRunResult = table.Column<string>(type: "text", nullable: true),
                    ConsecutiveFailureCount = table.Column<int>(type: "integer", nullable: false),
                    MaxRetries = table.Column<int>(type: "integer", nullable: false, defaultValue: 5),
                    IsDisabled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    NextRunTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsRunning = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    LockedBy = table.Column<string>(type: "text", nullable: true),
                    LockTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "JobRunHistories",
                schema: "kgs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    JobDefinitionId = table.Column<int>(type: "integer", nullable: false),
                    RunTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    Result = table.Column<string>(type: "text", nullable: true),
                    Duration = table.Column<TimeSpan>(type: "interval", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_JobRunHistories", x => x.Id);
                    table.ForeignKey(
                        name: "FK_JobRunHistories_JobDefinitions_JobDefinitionId",
                        column: x => x.JobDefinitionId,
                        principalSchema: "kgs",
                        principalTable: "JobDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_JobDefinitions_JobType_InstanceId",
                schema: "kgs",
                table: "JobDefinitions",
                columns: new[] { "JobType", "InstanceId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobRunHistories_JobDefinitionId",
                schema: "kgs",
                table: "JobRunHistories",
                column: "JobDefinitionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "JobRunHistories",
                schema: "kgs");

            migrationBuilder.DropTable(
                name: "JobDefinitions",
                schema: "kgs");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom")
                .OldAnnotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom")
                .OldAnnotation("Npgsql:Enum:kgs.job_status", "pending,running,success,failed,skipped");
        }
    }
}
