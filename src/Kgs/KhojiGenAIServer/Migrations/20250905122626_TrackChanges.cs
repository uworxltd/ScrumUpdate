using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class TrackChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StoredKeyValues",
                schema: "kgs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InstanceId = table.Column<int>(type: "integer", nullable: false),
                    DictionaryName = table.Column<string>(type: "text", nullable: true),
                    Key = table.Column<string>(type: "text", nullable: false),
                    Order = table.Column<int>(type: "integer", nullable: false),
                    ValueType = table.Column<string>(type: "text", nullable: true),
                    ValueJson = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoredKeyValues", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoredKeyValues_Key_Unique",
                schema: "kgs",
                table: "StoredKeyValues",
                columns: new[] { "InstanceId", "DictionaryName", "Key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StoredKeyValues_Order_Unique",
                schema: "kgs",
                table: "StoredKeyValues",
                columns: new[] { "InstanceId", "DictionaryName", "Order" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoredKeyValues",
                schema: "kgs");
        }
    }
}
