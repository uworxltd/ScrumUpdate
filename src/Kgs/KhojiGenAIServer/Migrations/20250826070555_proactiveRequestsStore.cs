using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class proactiveRequestsStore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom");

            migrationBuilder.CreateTable(
                name: "ProactiveMessageRequests",
                schema: "kgs",
                columns: table => new
                {
                    Guid = table.Column<Guid>(type: "uuid", nullable: false),
                    UserName = table.Column<string>(type: "text", nullable: true),
                    InstanceId = table.Column<int>(type: "integer", nullable: false),
                    TargetInstallationId = table.Column<string>(type: "text", nullable: true),
                    InsightJobId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProactiveMessageRequests", x => x.Guid);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProactiveMessageRequests",
                schema: "kgs");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom");
        }
    }
}
