CREATE TYPE "public"."child_event_kind" AS ENUM('name_changed', 'level_changed', 'memory_proposed', 'memory_withdrawn', 'device_code', 'forgotten_code', 'device_unblocked', 'device_removed', 'adult_invited', 'invitation_withdrawn', 'adult_joined', 'adult_removed', 'adult_left');--> statement-breakpoint
CREATE TABLE "child_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"actor_id" text,
	"kind" "child_event_kind" NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "child_event" ADD CONSTRAINT "child_event_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_event" ADD CONSTRAINT "child_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "child_event_student_created_idx" ON "child_event" USING btree ("student_id","created_at");