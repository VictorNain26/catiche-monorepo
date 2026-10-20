CREATE TABLE "device" (
	"id" text PRIMARY KEY NOT NULL,
	"shared" boolean DEFAULT false NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "device_profile" (
	"device_id" text NOT NULL,
	"student_id" text NOT NULL,
	"failures" integer DEFAULT 0 NOT NULL,
	"code_window_until" timestamp with time zone,
	"choose_token_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_profile_device_id_student_id_pk" PRIMARY KEY("device_id","student_id")
);
--> statement-breakpoint
CREATE TABLE "student_code" (
	"user_id" text PRIMARY KEY NOT NULL,
	"hash" text,
	"failures" integer DEFAULT 0 NOT NULL,
	"set_at" timestamp with time zone,
	"reset_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "device_id" text;--> statement-breakpoint
ALTER TABLE "device_profile" ADD CONSTRAINT "device_profile_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_profile" ADD CONSTRAINT "device_profile_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_code" ADD CONSTRAINT "student_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_profile_student_id_idx" ON "device_profile" USING btree ("student_id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_device_id_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."device"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_device_id_idx" ON "session" USING btree ("device_id");