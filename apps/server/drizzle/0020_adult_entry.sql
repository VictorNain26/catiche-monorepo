ALTER TABLE "adult_profile" ALTER COLUMN "declared_adult_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "adult_profile" ADD COLUMN "email_entries" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "adult_profile" ADD COLUMN "passkey_offer_closed_at" timestamp with time zone;