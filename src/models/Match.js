module.exports = class Match {
    constructor(id, name, password = '', isPrivate = false, maxPlayers = 0, data = {}) {
        this.id = id;
        this.name = name;
        this.data = data;
        this.password = password;

        this.isStarted = false;
        this.isFinished = false;
        this.isPrivate = isPrivate;
        this.isProtected = this.password !== '';

        this.numPlayers = 0;
        this.maxPlayers = maxPlayers;

        this.room = 'match_' + this.id;

        this.players = [];
        this.blockedPlayers = [];
    }

    addPlayer(playerData) {
        // We will set the owner of the match to the first player that joins.
        if (this.numPlayers === 0) {
            this.owner = playerData.id;
        }

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

    isBlocked(playerId) {
        return this.blockedPlayers.includes(playerId);
    }

    isVisible() {
        return !this.isPrivate 
            && !this.isStarted 
            && !this.isFinished;
    }

    isOwner(playerId) {
        return this.owner === playerId;
    }

    allPlayersReady() {
        for (let player of this.players) {
            if (!player.isReady) {
                return false;
            }
        }

        return true;
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
            data: this.data,
            isPrivate: this.isPrivate,
            isProtected: this.isProtected,
            numPlayers: this.numPlayers,
            maxPlayers: this.maxPlayers,
            players: this.players
        };
    }
}
