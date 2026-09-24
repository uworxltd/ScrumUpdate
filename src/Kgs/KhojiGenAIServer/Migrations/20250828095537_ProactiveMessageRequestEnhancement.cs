using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class ProactiveMessageRequestEnhancement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InsightJobId",
                schema: "kgs",
                table: "ProactiveMessageRequests");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom");

            migrationBuilder.AddColumn<string>(
                name: "InsightJobType",
                schema: "kgs",
                table: "ProactiveMessageRequests",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InsightMetadata",
                schema: "kgs",
                table: "ProactiveMessageRequests",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "InsightJobType",
                schema: "kgs",
                table: "ProactiveMessageRequests");

            migrationBuilder.DropColumn(
                name: "InsightMetadata",
                schema: "kgs",
                table: "ProactiveMessageRequests");

            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:Enum:kgs.insight_job", "x_jql,jql_custom");

            migrationBuilder.AddColumn<int>(
                name: "InsightJobId",
                schema: "kgs",
                table: "ProactiveMessageRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
