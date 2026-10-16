/**
 * The suite's own database, recreated each run, on the Postgres of docker-compose.yml, locally as
 * in CI. A test sets in it what no screen gives: an invitation, which the server's own command
 * makes, and the exercises a session with Tom would leave, which need Mistral.
 */

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import postgres from 'postgres';

export const DATABASE_URL = 'postgresql://tomai_dev:tomai_dev_password@localhost:5432/tom_e2e';

/** Invites the address, as an operator does, by the built server's command. */
export function invite(email: string) {
  execFileSync('bun', ['--no-env-file', 'dist/invite.js', email], {
    cwd: resolve(import.meta.dirname, '../../apps/server'),
    env: { ...process.env, DATABASE_URL },
    stdio: 'pipe',
  });
}

/**
 * A session of the student, one exercise per notion in it, as a turn of Tom leaves them: what the
 * learner memory reads (modules/tutor/repository.ts, `pastExercises`), the sheet's notions only.
 */
export async function exercisesOn(studentId: string, notionIds: readonly string[]) {
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => undefined });
  try {
    const [session] = await sql<{ id: string }[]>`insert into study_session (student_id) values (${studentId}) returning id`;
    if (!session) throw new Error('No session returned by its insert');
    for (const notionId of notionIds) {
      await sql`insert into exercise (session_id, sheet, uncertain, drawn_forms, math_check, prompt_version)
        values (${session.id},${sql.json({ entries: [notionId] })}, false, ${sql.json([])}, 'not-applicable', 'e2e')`;
    }
  } finally {
    await sql.end();
  }
}
