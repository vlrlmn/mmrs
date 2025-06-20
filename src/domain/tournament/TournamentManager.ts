import { TournamentService } from './services/TournamentService';

export class TournamentManager {
  private static tournaments = new Map<number, TournamentService>();

  static register(matchId: number, tournament: TournamentService) {
    this.tournaments.set(matchId, tournament);
  }

  static getTournamentByMatchId(matchId: number): TournamentService | undefined {
    return this.tournaments.get(matchId);
  }

  static unregister(matchId: number) {
    this.tournaments.delete(matchId);
  }
  
   static has(matchId: number): boolean {
    return this.tournaments.has(matchId);
  }

}
