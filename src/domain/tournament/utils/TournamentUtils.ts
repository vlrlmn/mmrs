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

interface stageProgressionContext {
    currentStage: TournamentStage;
    confirmedWinners: Player[];
    setStage: (s: TournamentStage) => void;
    setMatches: (m: Match[]) => void;
    onWin: (champion: Player) => void;
}

export function handleStageProgression({
    currentStage,
    confirmedWinners,
    setStage,
    setMatches,
    onWin,
}: stageProgressionContext): void {
    if (currentStage === 'quarter' && confirmedWinners.length === 4) {
        setStage('semi');
        setMatches(createNextRoundMatches(confirmedWinners, 'semi'));
    } else if (currentStage === 'semi' && confirmedWinners.length === 2) {
        setStage('final');
        setMatches(createNextRoundMatches(confirmedWinners, 'final'));
    } else if (currentStage === 'final' && confirmedWinners.length === 1) {
        setStage('complete');
        onWin(confirmedWinners[0]);
    }
}

export function createNextRoundMatches(players: Player[], stage: TournamentStage): Match[] {
    const randomized = [...players].sort(() => Math.random() - 0.5);
    const matches : Match[] = [];

    for (let i = 0; i < randomized.length; i += 2) {
        const match: Match = {
            player1: randomized[i],
            player2: randomized[i + 1],
            isConfirmed: false,
        };
        matches.push(match);
    }

    for (const match of matches) {
        const {player1, player2} = match;

        if (player1.socket.readyState === 1) {
            player1.socket.send(JSON.stringify({
                type: 'next_stage',
                stage,
                opponent: player2.name,
            }));
        }

        if (player2.socket.readyState === 1) {
            player2.socket.send(JSON.stringify({
                type: 'next_stage',
                stage,
                opponent: player1.name,
            }));
        }
    }
    return matches;
} 