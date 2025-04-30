import { Player, PendingMatch } from '../types';

export function getDynamicWindow(player: Player): number {
    const elapsed = Date.now() - player.joinedAt;
    return 100 + Math.floor(elapsed / 5000) * 100;
}

export function isWithinMatchWindow(player1: Player, player2: Player, window: number): boolean {
    return Math.abs(player1.mmr - player2.mmr) <= window;
}

export function createMatch(player1: Player, player2: Player, timeoutMs: number): PendingMatch {
    const createdAt = Date.now();
    const timeLeft = Math.floor(timeoutMs / 1000);

    player1.socket.send(JSON.stringify({ type: 'confirm_match', opponent: player2.name, timeLeft }));
    player2.socket.send(JSON.stringify({ type: 'confirm_match', opponent: player1.name, timeLeft }));

    return { 
        player1, 
        player2,
        confirmations: {
            [player1.id]: false,
            [player2.id]: false
        },
        createdAt
    };
}

export function evaluateMatchTimeout(match: PendingMatch, now: number, timeout: number, requeue: (p: Player) => void): boolean {
    if (now - match.createdAt > timeout) {
        if (match.player1.socket.readyState === 1) {
          match.player1.socket.send(JSON.stringify({ type: 'match_timeout' }));
        }
        if (match.player2.socket.readyState === 1) {
          match.player2.socket.send(JSON.stringify({ type: 'match_timeout' }));
        }
    
        if (!match.confirmations[match.player1.id]) requeue(match.player1);
        if (!match.confirmations[match.player2.id]) requeue(match.player2);
    
        return false;
    }
    return true;
}