DROP TABLE "learner_notion_reset" CASCADE;--> statement-breakpoint
ALTER TABLE "student_profile" DROP COLUMN "memory_proposed_at";--> statement-breakpoint
ALTER TABLE "student_profile" DROP COLUMN "memory_answer";--> statement-breakpoint
ALTER TABLE "student_profile" DROP COLUMN "memory_reset_after";--> statement-breakpoint
DROP TYPE "public"."memory_answer";