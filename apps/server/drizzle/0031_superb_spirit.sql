ALTER TABLE "exercise" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "turn_record" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "exercise" CASCADE;--> statement-breakpoint
DROP TABLE "turn_record" CASCADE;--> statement-breakpoint
ALTER TABLE "message" ALTER COLUMN "content" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "text";--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "photo_text";--> statement-breakpoint
ALTER TABLE "message" DROP COLUMN "model_messages";--> statement-breakpoint
ALTER TABLE "study_session" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "study_session" DROP COLUMN "summary";--> statement-breakpoint
ALTER TABLE "study_session" DROP COLUMN "summary_until";--> statement-breakpoint
ALTER TABLE "study_session" DROP COLUMN "subject";--> statement-breakpoint
DROP TYPE "public"."decided_by";--> statement-breakpoint
DROP TYPE "public"."diagnosis_error_type";--> statement-breakpoint
DROP TYPE "public"."diagnosis_verdict";--> statement-breakpoint
DROP TYPE "public"."math_check";--> statement-breakpoint
DROP TYPE "public"."message_role";--> statement-breakpoint
DROP TYPE "public"."reasoning_effort";--> statement-breakpoint
DROP TYPE "public"."subject_family";--> statement-breakpoint
DROP TYPE "public"."turn_outcome";