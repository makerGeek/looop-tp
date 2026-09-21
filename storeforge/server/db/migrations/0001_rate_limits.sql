CREATE TABLE "rate_limits" (
	"key" varchar(160) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE INDEX "idx_rate_limits_window" ON "rate_limits" USING btree ("window_start");