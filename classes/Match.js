const config = require('../config');

module.exports = class Match {
    constructor(matchData, player) {
        this.id = player.id;
        this.name = matchData.name;
        this.password = matchData.password || "";

        this.isPrivate = matchData.isPrivate || false;
        this.isProtected = this.password !== "";

        this.numPlayers = 0;
        this.maxPlayers = config.maxPlayersPerMatch;
        if (matchData.maxPlayers > 0 && matchData.maxPlayers < config.maxPlayersPerMatch) {
            this.maxPlayers = matchData.maxPlayers;
        }

        this.room = 'match_' + this.id;
        this.owner = player.id;

        this.players = [];
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
        this.numPlayers++;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(player => player.id !== playerId);
        this.numPlayers--;
    }

    isVisible() {
        return !this.isPrivate;
    }

    isOwner(player) {
        return this.id === player.id;
    }
    
    getCreateResponse() {
        return {
            id: this.id,
            name: this.name,
            isPrivate: this.isPrivate,
            isProtected: this.isProtected,
            numPlayers: this.numPlayers,
            maxPlayers: this.maxPlayers,
            players: this.players
        };
    }

    getListResponse() {
        return {
            id: this.id,
            name: this.name,
            isPrivate: this.isPrivate,
            isProtected: this.isProtected,
            numPlayers: this.numPlayers,
            maxPlayers: this.maxPlayers
        };
    }
}
