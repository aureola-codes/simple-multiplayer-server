const Match = require('../models/Match');

module.exports = class MatchesRegistry {
    constructor(config) {
        this._config = config;
        this._matches = {};
        this._numMatches = 0;
    }

    get numMatches() {
        return this._numMatches;
    }

    get maxMatches() {
        return this._config.maxMatches;
    }

    find(id) {
        return this._matches[id] || null;
    }

    add(matchData, player) {
        if (this._numMatches >= this._config.maxMatches) {
            throw 'Max matches reached.';
        }

        let { name, password, isPrivate, maxPlayers, data } = matchData;
        if (name === undefined) {
            throw 'Match name is required.';
        }

        if (name.length < this._config.matchNameMinLength || name.length > this._config.matchNameMaxLength) {
            throw `Match name must be between ${this._config.matchNameMinLength} and ${this._config.matchNameMaxLength} characters.`;
        }

        if (password !== undefined && (password.length < this._config.matchPasswordMinLength || password.length > this._config.matchPasswordMaxLength)) {
            throw `Match password must be between ${this._config.matchPasswordMinLength} and ${this._config.matchPasswordMaxLength} characters.`;
        }

        if (maxPlayers !== undefined && (maxPlayers < 0 || maxPlayers > this._config.maxPlayersPerMatch)) {
            maxPlayers = this._config.maxPlayersPerMatch;
        }

        let match = new Match(player.id, name, password || '', isPrivate || false, maxPlayers || this._config.maxPlayersPerMatch, data || {});
        if (this._matches.hasOwnProperty(match.id)) {
            throw 'Match already exists.';
        }

        this._matches[match.id] = match;
        this._numMatches++;

        match.addPlayer(player);
        return match;
    }

    remove(id) {
        if (!this._matches.hasOwnProperty(id)) {
            return;
        }

        delete this._matches[id];
        this._numMatches--;
    }

    getListVisible() {
        return Object
            .values(this._matches)
            .filter(match => match.isVisible())
            .map(match => match.getMinResponse());
    }
};
