-- Each message as the AI SDK's UIMessage, without its id (the row's): the student's as a user's,
-- Tom's as an assistant's, its text in one part. What a message held of a photo or a replay stays
-- out: the new Tom reads neither.
UPDATE "message" SET "content" = jsonb_build_object(
  'role', CASE "role" WHEN 'student' THEN 'user' ELSE 'assistant' END,
  'parts', jsonb_build_array(jsonb_build_object('type', 'text', 'text', "text"))
);
