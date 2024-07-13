const Match = require('./Match');
const Player = require('./Player');

module.exports = class State {
    constructor() {
        this._players = {};
        this._matches = {};

        this._numPlayers = 0;
        this._numMatches = 0;
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
        if (!this._matches.hasOwnProperty(matchData.id)) {
            this._matches[matchData.id] = new Match(matchData, player);
            this._numMatches++;
        }

        return this._matches[matchData.id];
    }

    removeMatch(id) {
        if (!this._matches.hasOwnProperty(id)) {
            return;
        }

        delete this._matches[id];
        this._numMatches--;
    }

    getVisibleMatches() {
        return this._matches
            .filter(match => match.isVisible())
            .map(match => match.getMinResponse());
    }
}
