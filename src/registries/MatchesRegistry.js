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
