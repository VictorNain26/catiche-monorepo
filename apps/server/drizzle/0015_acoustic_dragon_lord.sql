ALTER TABLE "study_session" DROP COLUMN "accompanied";--> statement-breakpoint
ALTER TABLE "study_session" DROP COLUMN "parent_cues";--> statement-breakpoint
ALTER TABLE "study_session" DROP COLUMN "last_parent_cue";--> statement-breakpoint
DROP TYPE "public"."parent_cue_kind";