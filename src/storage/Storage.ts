import Database from 'better-sqlite3';
import path from 'path';
import IStorage from './IStorage';
import { syncMigrations } from './migrate'
import { Match } from '../domain/matchmaking/types';

export class Storage implements IStorage {

    async testRequestToDB(): Promise<string> {
        return 'connected to database';
    }
    private db: Database.Database;

    constructor () {
        const dbPath = path.resolve(__dirname, '../../db/database.db');
        this.db = new Database(dbPath);

        const migrationsDir = path.resolve(__dirname, '../../db/migrations');
        syncMigrations(this.db, migrationsDir);
    }

    public setMatchStatus(matchId: number, status: 'pending' | 'active' | 'failed' | 'finished'): void {
        const stmt = this.db.prepare(`UPDATE match SET status = ? WHERE id = ?`);
        stmt.run(status, matchId);
    }
    public updateMatchWinner(matchId: number, winnerId: number): void {
        const stmt = this.db.prepare(`
            UPDATE match
            SET winner_id = ?
            WHERE id = ?
        `)
        stmt.run(winnerId, matchId);
    }

    public getRatingUpdates(userId: number): {
        playedMatches: number;
        updates: { date: string; rate: number }[];
    }
    {
        const countStmt = this.db.prepare(`
            SELECT COUNT(*) as count
            FROM participant
            WHERE user_id = ?
        `);
        const { count: playedMatches } = countStmt.get(userId) as { count: number };

        const updatesStmt = this.db.prepare(`
            SELECT m.started_at as date, COALESCE(p.rating_change, 0) as rate
            FROM participant p
            JOIN match m ON p.match_id = m.id
            WHERE p.user_id = ?
            AND p.rating_change != 0
            ORDER BY m.started_at DESC
            LIMIT 10
        `);
        const updates = updatesStmt.all(userId) as { date: string; rate: number }[];

        return {
            playedMatches,
            updates
            };
    }

    public updateRatingTransaction( matchId: number, updates: { id: number; rating: number }[]): void {
         const stmt = this.db.prepare(`
            UPDATE participant
            SET rating_change = ?
            WHERE user_id = ?
            AND match_id = ?
        `);

        const transaction = this.db.transaction((updates: {id: number; rating: number }[]) => {
            for (const update of updates) {
                stmt.run(update.rating, update.id, matchId);
            }
        });
        transaction(updates);
    }

    public getMatchesForUser(userId: number, page: number): any[] {
        const offset = page * 10;
        const stmt = this.db.prepare(`
            SELECT m.*
            FROM match m
            JOIN participant p ON m.id = p.match_id
            WHERE p.user_id = ?
            ORDER BY m.started_at DESC
            LIMIT 10 OFFSET ?
        `);
        return stmt.all(userId, offset) as Match[];
    }

    public addParticipant(matchId: number, userId: number): void {
        const stmt = this.db.prepare(`
            INSERT INTO participant (match_id, user_id, rating_change)
            VALUES (?, ?, 0);
        `);
        stmt.run(matchId, userId);
    }

    public addMatch(mode: number): number {
        const stmt = this.db.prepare(`
            INSERT INTO match (mode)
            VALUES (?);
        `);
        const result = stmt.run(mode);
        return result.lastInsertRowid as number; 
    }

    public addOfflineMatch(mode: number): number {
        const stmt = this.db.prepare(`
            INSERT INTO match (mode, is_online)
            VALUES (?, 0);
        `);
        const result = stmt.run(mode);
        return result.lastInsertRowid as number;
    }


    public getPlayer(id: number) {
        return this.db.prepare('SELECT * FROM participant WHERE user_id = ?').all(id);
    }

    public close() : void {
        this.db.close();
    }
}