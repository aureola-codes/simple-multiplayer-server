module.exports = class PlayersRegistry {
    constructor(config) {
        this._config = config;
        this._players = {};
        this._numPlayers = 0;
    }

    get numPlayers() {
        return this._numPlayers;
    }

    get maxPlayers() {
        return this._config.maxPlayers;
    }

    findPlayer(id) {
        return this._players[id] || null;
    }

    add(id, name) {
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

    remove(id) {
        if (!this._players.hasOwnProperty(id)) {
            return;
        }

        delete this._players[id];
        this._numPlayers--;
    }
}
