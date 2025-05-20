
export interface IStorage {
    addMatch(mode: number, participants: number[]) : number;
    getPlayer(id: number) : any ;
    close() : void;
};

export default IStorage