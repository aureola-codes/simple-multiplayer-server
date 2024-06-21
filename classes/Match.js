const config = require('../config');

class Match {
    constructor(matchData) {
        this.id = this.getRandomIdentifier();
        this.name = matchData.name;
        this.password = matchData.password;
        this.isProtected = !!matchData.password;
        this.isPrivate = matchData.isPrivate;
        this.isStarted = false;
        this.maxPlayers = config.maxPlayersPerMatch;
        if (matchData.maxPlayers) {
            this.maxPlayers = Match.max(2, Math.min(config.maxPlayersPerMatch, Math.abs(matchData.maxPlayers)));
        }
        this.numPlayers = 0;
        this.owner = null;
        this.players = [];
        this.chat = [];
    }

    setOwner(playerData) {
        this.owner = playerData.id;
    }

    isOwner(playerId) {
        return this.owner = playerId;
    }

    authorize(password) {
        if (this.password !== "" && this.password !== password) {
            throw new Error("Match password mismatch.");
        }

        if (this.numPlayers >= this.maxPlayers) {
            throw new Error("Match full.");
        }

        return this;
    }

    addPlayer(playerData) {
        this.players.push(playerData);
        this.numPlayers = this.players.length;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(player => player.id !== playerId);
        this.numPlayers = this.players.length;
    }

    getRandomIdentifier(digits = 8) {
        let randomNumberString = '';
        for (let i = 0; i < digits; i++) {
            randomNumberString += Math.floor(Math.random() * 10);
        }
    
        return randomNumberString;
    }
}

module.exports = Match;
