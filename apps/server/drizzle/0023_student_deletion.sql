ALTER TYPE "public"."child_event_kind" ADD VALUE 'deletion_requested';--> statement-breakpoint
ALTER TYPE "public"."child_event_kind" ADD VALUE 'deletion_cancelled';--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "deletion_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "student_profile" ADD COLUMN "deletion_requested_by" text;--> statement-breakpoint
ALTER TABLE "student_profile" ADD CONSTRAINT "student_profile_deletion_requested_by_user_id_fk" FOREIGN KEY ("deletion_requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;