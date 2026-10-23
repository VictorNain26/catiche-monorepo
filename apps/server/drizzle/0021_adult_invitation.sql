CREATE TYPE "public"."adult_role" AS ENUM('guardian', 'relative');--> statement-breakpoint
CREATE TABLE "adult_invitation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"invited_by" text NOT NULL,
	"email" text NOT NULL,
	"role" "adult_role" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "adult_invitation_student_email_key" UNIQUE("student_id","email")
);
--> statement-breakpoint
ALTER TABLE "guardianship" ADD COLUMN "role" "adult_role" DEFAULT 'guardian' NOT NULL;--> statement-breakpoint
ALTER TABLE "adult_invitation" ADD CONSTRAINT "adult_invitation_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adult_invitation" ADD CONSTRAINT "adult_invitation_invited_by_user_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "adult_invitation_email_idx" ON "adult_invitation" USING btree ("email");