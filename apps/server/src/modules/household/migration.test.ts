/**
 * The migration from households to links between an adult and a student, on a database that holds
 * households: the journal up to the last migration that knew them, data, then the rest.
 */

import { afterAll, describe, expect, it } from 'bun:test';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sql } from 'drizzle-orm';
import { createDb } from '../../platform/db/client';
import { MIGRATIONS_FOLDER, runMigrations } from '../../platform/db/migrations';
import { emptyDatabase } from '../../testing/database';
import { adultProfile, guardianship } from './schema';

describe('the migration from households', () => {
  it('links every guardian of a household to each of its students, undeclared, and drops the households', async () => {
    const { url } = await emptyDatabase();
    const before = await mkdtemp(join(tmpdir(), 'catiche-migrations-'));
    afterAll(() => rm(before, { recursive: true, force: true }));
    await cp(MIGRATIONS_FOLDER, before, { recursive: true });
    const journalPath = join(before, 'meta', '_journal.json');
    const journal = JSON.parse(await readFile(journalPath, 'utf8')) as { entries: { tag: string }[] };
    await writeFile(journalPath, JSON.stringify({ ...journal, entries: journal.entries.filter(({ tag }) => tag < '0017') }));
    await runMigrations(url, { production: false }, before);

    const database = createDb(url, { production: false, max: 1 });
    try {
      await database.db.execute(sql`INSERT INTO "user" (id, name, email) VALUES
        ('nadia', 'Nadia', 'nadia@example.com'), ('karim', 'Karim', 'karim@example.com'), ('lea', 'Léa', 'lea@student.invalid'),
        ('ines', 'Inès', 'ines@student.invalid'), ('sam', 'Sam', 'sam@example.com'), ('tom', 'Tom', 'tom@student.invalid')`);
      await database.db.execute(sql`INSERT INTO household (id) VALUES
        ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002')`);
      await database.db.execute(sql`INSERT INTO household_member (user_id, household_id, role) VALUES
        ('nadia', '00000000-0000-4000-8000-000000000001', 'guardian'), ('karim', '00000000-0000-4000-8000-000000000001', 'guardian'),
        ('lea', '00000000-0000-4000-8000-000000000001', 'student'), ('ines', '00000000-0000-4000-8000-000000000001', 'student'),
        ('sam', '00000000-0000-4000-8000-000000000002', 'guardian'), ('tom', '00000000-0000-4000-8000-000000000002', 'student')`);

      await runMigrations(url, { production: false });

      const links = await database.db
        .select({ adultId: guardianship.adultId, studentId: guardianship.studentId, declaredAt: guardianship.declaredAt })
        .from(guardianship)
        .orderBy(guardianship.adultId, guardianship.studentId);
      expect(links).toEqual([
        { adultId: 'karim', studentId: 'ines', declaredAt: null },
        { adultId: 'karim', studentId: 'lea', declaredAt: null },
        { adultId: 'nadia', studentId: 'ines', declaredAt: null },
        { adultId: 'nadia', studentId: 'lea', declaredAt: null },
        { adultId: 'sam', studentId: 'tom', declaredAt: null },
      ]);
      expect(await database.db.select().from(adultProfile)).toEqual([]);
      const [left] = await database.db.execute<{ household: string | null; member: string | null }>(
        sql`SELECT to_regclass('household')::text AS household, to_regclass('household_member')::text AS member`,
      );
      expect(left).toEqual({ household: null, member: null });
    } finally {
      await database.close();
    }
  });
});
