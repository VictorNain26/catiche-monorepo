CREATE TYPE "public"."evening_phase" AS ENUM('note', 'order', 'steps', 'bag', 'done');--> statement-breakpoint
CREATE TYPE "public"."homework_state" AS ENUM('todo', 'done');--> statement-breakpoint
CREATE TYPE "public"."school_subject" AS ENUM('mathematiques', 'francais', 'anglais', 'espagnol', 'allemand', 'italien', 'histoire-geo', 'physique-chimie', 'svt', 'technologie', 'autre');--> statement-breakpoint
CREATE TABLE "evening" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"day" date NOT NULL,
	"phase" "evening_phase" DEFAULT 'note' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homework" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"subject" "school_subject" NOT NULL,
	"task" text NOT NULL,
	"due_on" date,
	"evening_id" uuid,
	"rank" integer,
	"state" "homework_state" DEFAULT 'todo' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upcoming_test" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"subject" "school_subject" NOT NULL,
	"day" date NOT NULL,
	"topic" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "evening" ADD CONSTRAINT "evening_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homework" ADD CONSTRAINT "homework_evening_id_evening_id_fk" FOREIGN KEY ("evening_id") REFERENCES "public"."evening"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upcoming_test" ADD CONSTRAINT "upcoming_test_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evening_student_id_day_idx" ON "evening" USING btree ("student_id","day");--> statement-breakpoint
CREATE INDEX "homework_student_id_state_idx" ON "homework" USING btree ("student_id","state");--> statement-breakpoint
CREATE INDEX "homework_evening_id_idx" ON "homework" USING btree ("evening_id");--> statement-breakpoint
CREATE UNIQUE INDEX "upcoming_test_student_id_subject_day_idx" ON "upcoming_test" USING btree ("student_id","subject","day");