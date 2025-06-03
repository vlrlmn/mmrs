import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

/**
 * Synchronizes .sql migrations with the database.
 * Applies any .sql files that haven't been executed yet.
 */
export function syncMigrations(db: Database.Database, migrationsDir: string): void {
  // Create a table to track applied migrations (if it doesn't exist)
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get all .sql files in the specified directory
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // sort alphabetically to ensure consistent execution order

  const appliedMigrationsStmt = db.prepare(`SELECT name FROM migrations`);
  const appliedMigrations = new Set(
    appliedMigrationsStmt.all().map((row: any) => row.name)
  );

  for (const file of migrationFiles) {
    if (appliedMigrations.has(file)) {
      console.log(`[skip] Migration ${file} has already been applied`);
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
      console.log(`[ok] Migration ${file} applied successfully`);
    } catch (err) {
      console.error(`[fail] Error applying migration ${file}:`, err);
      break; // stop execution on error
    }
  }
}
