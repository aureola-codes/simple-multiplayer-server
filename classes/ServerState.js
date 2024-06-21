const Match = require("./Match");
const Player = require("./Player");

class ServerState {
    constructor() {
        this.players = [];
        this.matches = [
            new Match({name: "Test1"}),
            new Match({name: "Test2"}),
            new Match({name: "Test3"}),
            new Match({name: "Test4"}),
            new Match({name: "Test5"}),
        ];
    }

    findPlayer(id) {
        return this.players.find(player => player.id === id);
    }

    findPlayerOrFail(id) {
        let player = this.findPlayer(id);
        if (player === null) {
            throw new Error(`Player ${id} not found.`);
        }

        return player;
    }

    addPlayer(id, name, socketId) {
        let player = new Player(id, name, socketId);
        this.players.push(player);
        return player;
    }

    removePlayer(id) {
        this.players = this.players.filter(player => {
            return player.id !== id;
        });
    }

    getMatchesPublic() {
        return this.matches
            .filter(match => {
                return !match.isStarted && !match.isPrivate;
            })
            .map(match => {
                return {
                    id: match.id,
                    name: match.name,
                    isProtected: match.isProtected,
                    numPlayers: match.numPlayers,
                    maxPlayers: match.maxPlayers,
                };
            });
    }

    findMatch(id) {
        return this.matches.find(match => match.id === id);
    }

    findMatchOrFail(id) {
        let match = this.findMatch(id);
        if (match === null) {
            throw new Error(`Match ${id} not found.`);
        }

        return match;
    }

    createMatch(matchData, player) {
        // TODO: Check if player is part of any other match.

        let match = new Match(matchData);
        match.setOwner(player.id);
        match.addPlayer(player);

        this.matches.push(match);
        return match;
    }

    cancelMatch(id) {
        this.matches = matches.filter(match => {
            return match.id !== id;
        });
    }

    joinMatch(id, password, player) {
        this.findMatchOrFail(id)
            .authorize(password)
            .addPlayer(player);
    }

    leaveMatch(id, player) {
        this.findMatchOrFail(id)
            .removePlayer(player.id);
    }

    startMatch(id, playerId) {
        let match = this.findMatchOrFail(id);
        if (!match.isOwner(playerId)) {
            throw new Error('Player is not the owner of the match.');
        }
        if (match.inProgress) {
            throw new Error('Match is already in started.');
        }

        match.inProgress = true;
    }
}

module.exports = ServerState;
