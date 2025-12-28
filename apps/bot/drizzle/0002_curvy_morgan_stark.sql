CREATE TABLE "custom_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"match_domain" text NOT NULL,
	"replace_domain" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	CONSTRAINT "custom_services_guild_id_match_domain_unique" UNIQUE("guild_id","match_domain")
);
