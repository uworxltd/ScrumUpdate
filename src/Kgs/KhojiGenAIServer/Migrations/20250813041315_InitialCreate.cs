using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "kgs");

            migrationBuilder.CreateTable(
                name: "TeamUserPreferences",
                schema: "kgs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MsftTeamsAadObjectId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PreferredInstanceId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamUserPreferences", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeamUserPreferences_MsftTeamsAadObjectId",
                schema: "kgs",
                table: "TeamUserPreferences",
                column: "MsftTeamsAadObjectId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TeamUserPreferences",
                schema: "kgs");
        }
    }
}
