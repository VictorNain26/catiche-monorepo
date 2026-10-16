CREATE TYPE "public"."decided_by" AS ENUM('mathjs', 'model');--> statement-breakpoint
CREATE TYPE "public"."diagnosis_error_type" AS ENUM('guess', 'misinterpret', 'careless', 'right-idea', 'imprecise', 'not-sure', 'n/a');--> statement-breakpoint
CREATE TYPE "public"."diagnosis_verdict" AS ENUM('correct', 'right-step', 'incorrect', 'unclear');--> statement-breakpoint
CREATE TYPE "public"."parent_cue_kind" AS ENUM('launch', 'newExercise', 'block', 'frustration', 'end');--> statement-breakpoint
CREATE TYPE "public"."reasoning_effort" AS ENUM('none', 'high');--> statement-breakpoint
ALTER TABLE "study_session" ALTER COLUMN "last_parent_cue" SET DATA TYPE "public"."parent_cue_kind" USING "last_parent_cue"::"public"."parent_cue_kind";--> statement-breakpoint
ALTER TABLE "turn_record" ALTER COLUMN "verdict" SET DATA TYPE "public"."diagnosis_verdict" USING "verdict"::"public"."diagnosis_verdict";--> statement-breakpoint
ALTER TABLE "turn_record" ALTER COLUMN "error_type" SET DATA TYPE "public"."diagnosis_error_type" USING "error_type"::"public"."diagnosis_error_type";--> statement-breakpoint
ALTER TABLE "turn_record" ALTER COLUMN "decided_by" SET DATA TYPE "public"."decided_by" USING "decided_by"::"public"."decided_by";--> statement-breakpoint
ALTER TABLE "turn_record" ALTER COLUMN "reasoning_effort" SET DATA TYPE "public"."reasoning_effort" USING "reasoning_effort"::"public"."reasoning_effort";