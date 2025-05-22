import 'fastify'

export interface IStorage {
    addMatch(mode: number, participants: number[]) : number;
    getPlayer(id: number) : any ;
    close() : void;
    testRequestToDB(): Promise<string>;
    addParticipant(matchId: number, userId: number): void;
};

export default IStorage