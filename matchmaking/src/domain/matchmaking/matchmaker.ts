// export class Matchmaker {
//     private queue: { userId: number; skill: number }[] = []
  
//     addToQueue(player: { userId: number; skill: number }) {
//       this.queue.push(player)
//     }
  
//     findMatch() {
//       if (this.queue.length >= 2) {
//         const match = this.queue.splice(0, 2)
//         return {
//           matchId: Date.now(),
//           players: match.map(p => p.userId)
//         }
//       }
//       return null
//     }
//   }
  