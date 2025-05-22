import Database from 'better-sqlite3';
import path from 'path';
import IStorage from './IStorage';
import { syncMigrations } from './migrate'

export class Storage implements IStorage {

    async testRequestToDB(): Promise<string> {
        return 'connected to database';
    }
    private db: Database.Database;

    constructor () {
        const dbPath = path.resolve(__dirname, 'database.db');
        this.db = new Database(dbPath);

        const migrationsDir = path.resolve(__dirname, 'migrations');
        syncMigrations(this.db, migrationsDir);
    }

    addParticipant(matchId: number, userId: number): void {
        const stmt = this.db.prepare(
            'INSERT INTO participants (match_id, user_id) VALUES (?, ?)'
        );
        stmt.run(matchId, userId);
    }

    public addMatch(mode: number, participants: number[]): number {
        const insertMatch = this.db.prepare(`
        INSERT INTO match (mode)
        VALUES (?);
        `);

        const insertParticipant = this.db.prepare(`
        INSERT INTO participant (match_id, user_id, rating_change)
        VALUES (?, ?, 0);
        `);

        let matchId = 0;

        const transaction = this.db.transaction(() => {
        const result = insertMatch.run(mode);
        matchId = result.lastInsertRowid as number;

        for (const userId of participants) {
            insertParticipant.run(matchId, userId);
        }
        });

        transaction();
        return matchId;
    }

    public getPlayer(id: number) {
        return this.db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    }

    public close() : void {
        this.db.close();
    }
}