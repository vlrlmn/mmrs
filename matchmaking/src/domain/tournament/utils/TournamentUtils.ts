import { Match, Player, TournamentStage } from "../../matchmaking/types"

export function findMatchForWinner(matches: Match[], winner: Player): Match | undefined {
    return matches.find(m => m.player1.id === winner.id || m.player2.id === winner.id);
}

export function confirmWinner(match: Match, winner: Player): void {
    match.winner = winner;
    match.isConfirmed = true;

    const loser = match.player1.id === winner.id ? match.player2 : match.player1;
    if (loser.socket.readyState === 1) {
        loser.socket.send(JSON.stringify({
            type: 'match_lost'
        }));
    }
}

export function getConfirmedWinners(matches: Match[]): Player[] {
    return matches
        .filter(m => m.isConfirmed && m.winner)
        .map(m => m.winner!);
}