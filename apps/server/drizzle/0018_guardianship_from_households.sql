-- Every guardian of a household follows each of its students. No declaration was ever made: the
-- links stay undeclared, and the adult confirms them at their next visit.
INSERT INTO "guardianship" ("adult_id", "student_id", "declared_at", "created_at")
SELECT "adult"."user_id", "student"."user_id", NULL, "student"."created_at"
FROM "household_member" AS "adult"
INNER JOIN "household_member" AS "student" ON "student"."household_id" = "adult"."household_id"
WHERE "adult"."role" = 'guardian' AND "student"."role" = 'student'
ON CONFLICT DO NOTHING;
