CREATE TABLE "server_settings" (
	"guild_id" text PRIMARY KEY NOT NULL,
	"twitter" boolean DEFAULT false,
	"x" boolean DEFAULT false,
	"tiktok" boolean DEFAULT false,
	"instagram" boolean DEFAULT false,
	"reddit" boolean DEFAULT false
);
