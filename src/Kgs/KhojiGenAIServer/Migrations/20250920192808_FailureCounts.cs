using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class FailureCounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ConsecutiveFailureCount",
                schema: "kgs",
                table: "ProactiveSubscriptions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "LastFailureMessage",
                schema: "kgs",
                table: "ProactiveSubscriptions",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConsecutiveFailureCount",
                schema: "kgs",
                table: "ProactiveSubscriptions");

            migrationBuilder.DropColumn(
                name: "LastFailureMessage",
                schema: "kgs",
                table: "ProactiveSubscriptions");
        }
    }
}
