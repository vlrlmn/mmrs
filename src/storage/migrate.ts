import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export function syncMigrations(db: Database.Database, migrationsDir: string): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);


  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  const appliedMigrationsStmt = db.prepare(`SELECT name FROM migrations`);
  const appliedMigrations = new Set(
    appliedMigrationsStmt.all().map((row: any) => row.name)
  );

  for (const file of migrationFiles) {
    if (appliedMigrations.has(file)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    const transaction = db.transaction(() => {
      db.exec(sql);
      db.prepare(`INSERT INTO migrations (name) VALUES (?)`).run(file);
    });

    try {
      transaction();
    } catch (err) {
      break;
    }
  }
}
