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
        if (!this._players.hasOwnProperty(id)) {
            this._players[id] = new Player(id, name);
            this._numPlayers++;
        }

        return this._players[id];
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
        let match = new Match(matchData, player);
        if (!this._matches.hasOwnProperty(match.id)) {
            this._matches[match.id] = match;
            this._numMatches++;
            return match;
        }

        return null;
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
