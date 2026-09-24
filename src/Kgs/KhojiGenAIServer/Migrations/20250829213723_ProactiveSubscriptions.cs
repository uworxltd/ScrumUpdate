using System;
using System.Text.Json;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace KhojiGenAIServer.Migrations
{
    /// <inheritdoc />
    public partial class ProactiveSubscriptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProactiveMessageRequests",
                schema: "kgs");

            migrationBuilder.CreateTable(
                name: "ProactiveSubscriptions",
                schema: "kgs",
                columns: table => new
                {
                    SubscriptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    ServiceType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    ChannelId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    InstanceId = table.Column<int>(type: "integer", nullable: false),
                    UserEmail = table.Column<string>(type: "text", nullable: true),
                    Created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    Updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    SubscriptionParameters = table.Column<JsonDocument>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProactiveSubscriptions", x => x.SubscriptionId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProactiveSubscriptions_ServiceType_ChannelId_InstanceId_Use~",
                schema: "kgs",
                table: "ProactiveSubscriptions",
                columns: new[] { "ServiceType", "ChannelId", "InstanceId", "UserEmail" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProactiveSubscriptions",
                schema: "kgs");

            migrationBuilder.CreateTable(
                name: "ProactiveMessageRequests",
                schema: "kgs",
                columns: table => new
                {
                    Guid = table.Column<Guid>(type: "uuid", nullable: false),
                    InsightJobId = table.Column<int>(type: "integer", nullable: false),
                    InstanceId = table.Column<int>(type: "integer", nullable: false),
                    TargetInstallationId = table.Column<string>(type: "text", nullable: true),
                    UserName = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProactiveMessageRequests", x => x.Guid);
                });
        }
    }
}
