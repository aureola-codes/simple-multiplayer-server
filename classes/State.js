const Match = require('./Match');
const Player = require('./Player');

module.exports = class State {
    constructor(config) {
        this._config = config;

        this._players = {};
        this._matches = {};

        this._numPlayers = 0;
        this._numMatches = 0;
    }

    get numPlayers() {
        return this._numPlayers;
    }

    get numMatches() {
        return this._numMatches;
    }

    get status() {
        return {
            numPlayers: this._numPlayers,
            maxPlayer: this._config.maxPlayers,
            numMatches: this._numMatches,
            maxMatches: this._config.maxMatches,
        };
    }

    findPlayer(id) {
        return this._players[id] || null;
    }

    addPlayer(id, name) {
        if (this._numPlayers >= this._config.maxPlayers) {
            throw new Error('Max players reached.');
        }

        let player = new Player(id, name);
        if (this._players.hasOwnProperty(id)) {
            throw new Error('Player already exists.');
        }

        this._players[id] = player;
        this._numPlayers++;

        return player;
    }

    removePlayer(id) {
        if (!this._players.hasOwnProperty(id)) {
            return;
        }

        delete this._players[id];
        this._numPlayers--;
    }

    findMatch(id) {
        return this._matches[id] || null;
    }

    addMatch(matchData, player) {
        if (this._numMatches >= this._config.maxMatches) {
            throw new Error('Max matches reached.');
        }

        let match = new Match(matchData, player);
        if (this._matches.hasOwnProperty(match.id)) {
            throw new Error('Match already exists.');
        }

        this._matches[match.id] = match;
        this._numMatches++;

        return match;
    }

    removeMatch(id) {
        if (!this._matches.hasOwnProperty(id)) {
            return;
        }

        delete this._matches[id];
        this._numMatches--;
    }

    getVisibleMatches() {
        return Object
            .values(this._matches)
            .filter(match => match.isVisible())
            .map(match => match.getMinResponse());
    }
}
