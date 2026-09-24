using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class JsonDocToJObject : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ServiceType",
                schema: "kgs",
                table: "ProactiveSubscriptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.AlterColumn<string>(
                name: "ChannelId",
                schema: "kgs",
                table: "ProactiveSubscriptions",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "ServiceType",
                schema: "kgs",
                table: "ProactiveSubscriptions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AlterColumn<string>(
                name: "ChannelId",
                schema: "kgs",
                table: "ProactiveSubscriptions",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text");
        }
    }
}
