import 'fastify'

export interface IStorage {
    addMatch(mode: number, participants: number[]) : number;
    getPlayer(id: number) : any ;
    close() : void;
    testRequestToDB(): Promise<string>;
};

export default IStorage