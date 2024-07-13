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
        this.blockedPlayers = [];
    }

    authorize(password) {
        if (this.password !== "" && this.password !== password) {
            throw new Error("Match password mismatch.");
        }

        if (this.numPlayers >= this.maxPlayers) {
            throw new Error("Match full.");
        }

        if (this.blockedPlayers.includes(player.id)) {
            throw new Error("Player blocked.");
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

    kickPlayer(playerId) {
        this.blockedPlayers.push(playerId);
        this.removePlayer(playerId);
    }

    isVisible() {
        return !this.isPrivate;
    }

    isOwner(playerId) {
        return this.owner === playerId;
    }

    hasPlayer(playerId) {
        return this.players.some(player => player.id === playerId);
    }

    getMinResponse() {
        return {
            id: this.id,
            name: this.name,
            isPrivate: this.isPrivate,
            isProtected: this.isProtected,
            numPlayers: this.numPlayers,
            maxPlayers: this.maxPlayers
        };
    }

    getFullResponse() {
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
}
