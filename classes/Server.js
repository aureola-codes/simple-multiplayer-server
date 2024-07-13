const Match = require('./Match');
const Player = require('./Player');

module.exports = class Server {
    constructor() {
        this.players = [];
        this.matches = [];

        this.numPlayers = 0;
        this.numMatches = 0;
    }

    findPlayer(id) {
        return this.players.find(player => player.id === id);
    }

    addPlayer(id, name, socketId) {
        let player = new Player(id, name, socketId);
        this.players.push(player);
        this.numPlayers++;
        return player;
    }

    removePlayer(id) {
        this.players = this.players.filter(player => {
            return player.id !== id;
        });

        this.numPlayers--;
    }

    findMatch(id) {
        return this.matches.find(match => match.id === id);
    }

    addMatch(matchData, player) {
        let match = new Match(matchData, player);
        this.matches.push(match);
        this.numMatches++;
        return match;
    }

    removeMatch(id) {
        this.matches = this.matches.filter(match => {
            return match.id !== id;
        });

        this.numMatches--;
    }

    getPublicMatches()
    {
        return this.matches
            .filter(match => match.isVisible())
            .map(match => match.getMinResponse());
    }
}
