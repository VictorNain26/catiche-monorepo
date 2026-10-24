CREATE TYPE "public"."child_event_kind" AS ENUM('name_changed', 'level_changed', 'memory_proposed', 'memory_withdrawn', 'device_code', 'forgotten_code', 'device_unblocked', 'device_removed', 'adult_invited', 'invitation_withdrawn', 'adult_joined', 'adult_removed', 'adult_left');--> statement-breakpoint
CREATE TABLE "child_event" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "child_event_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"student_id" text NOT NULL,
	"actor_id" text,
	"subject_id" text,
	"kind" "child_event_kind" NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "child_event" ADD CONSTRAINT "child_event_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_event" ADD CONSTRAINT "child_event_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_event" ADD CONSTRAINT "child_event_subject_id_user_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "child_event_student_created_idx" ON "child_event" USING btree ("student_id","created_at");