CREATE TABLE "adult_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"declared_adult_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardianship" (
	"adult_id" text NOT NULL,
	"student_id" text NOT NULL,
	"declared_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "guardianship_adult_id_student_id_pk" PRIMARY KEY("adult_id","student_id")
);
--> statement-breakpoint
ALTER TABLE "adult_profile" ADD CONSTRAINT "adult_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardianship" ADD CONSTRAINT "guardianship_adult_id_user_id_fk" FOREIGN KEY ("adult_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardianship" ADD CONSTRAINT "guardianship_student_id_user_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "guardianship_student_id_idx" ON "guardianship" USING btree ("student_id");