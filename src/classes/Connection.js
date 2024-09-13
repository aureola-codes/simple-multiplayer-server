module.exports = class Connection {
    constructor(socket, player, server) {
        this._socket = socket;
        this._socket._match = null;
        this._socket._player = player;
        this._server = server;
    }

    get room() {
        return this._socket._match ? this._socket._match.room : 'lobby';
    }

    get player() {
        return this._socket._player;
    }

    get playerDataFull() {
        return this._socket._player.getFullResponse();
    }

    get playerDataMin() {
        return this._socket._player.getMinResponse();
    }

    get match() {
        return this._socket._match;
    }

    set match(match) {
        this._socket._match = match;
    }

    get matchDataFull() {
        if (!this.match) {
            return null;
        }

        return this.match.getFullResponse();
    }

    get matchDataMin() {
        if (!this.match) {
            return null;
        }

        return this.match.getMinResponse();
    }

    init() {
        this._socket.on('chat-message', this.sendChatMessage.bind(this));
        this._socket.on('match-create', this.createMatch.bind(this));
        this._socket.on('match-join', this.joinMatch.bind(this));
        this._socket.on('match-leave', this.leaveMatch.bind(this));
        this._socket.on('match-start', this.startMatch.bind(this));
        this._socket.on('match-finish', this.finishMatch.bind(this));
        this._socket.on('player-update', this.updatePlayer.bind(this));
        this._socket.on('player-kick', this.kickPlayer.bind(this));
        this._socket.on('tick', this.tick.bind(this));
        this._socket.on('tock', this.tock.bind(this));
        this._socket.on('disconnect', this.disconnect.bind(this));

        this._socket.emit('init', {
            player: this.playerDataFull,
            matches: this._server.matches,
            settings: this._server.settings,
        });

        this._socket.join('lobby');
    }

    sendChatMessage(message) {
        this._server.emitChatMessage(this.room, message, this.playerDataMin);
    }

    createMatch(matchDataJson, callback) {
        if (this.inMatch()) {
            callback('ERROR: Player already joined a match.');
            return;
        }

        try {
            let matchData = JSON.parse(matchDataJson);
            this.match = this._server.createMatch(matchData, this.player);
        } catch (error) {
            callback('ERROR: ' + error.message);
            return;
        }

        this.changeRoom(this._socket._match.room);
        callback(this.matchDataFull);
    }

    joinMatch(joinDataJson, callback) {
        if (this.inMatch()) {
            callback('ERROR: Player already joined a match.');
            return;
        }

        try {
            let joinData = JSON.parse(joinDataJson);
            this.match = this._server.joinMatch(joinData.match, joinData.password, this.player);
        } catch (error) {
            callback('ERROR: ' + error.message);
            return;
        }

        this.changeRoom(this.match.room);
        callback(this.matchDataFull);
    }

    leaveMatch() {
        if (!this.inMatch()) {
            console.log(`Player ${this.player.id} is not in a match.`);
            return;
        }

        if (this.isMatchOwner()) {
            if (!this.match.isFinished) {
                this._server.cancelMatch(this.match);
            } else {
                this._server.removeMatch(this.match);
            }

            return;
        }

        const room = this.match.room;
        const isVisible = this.match.isVisible();
        const playerData = this.playerDataFull;

        this.match.removePlayer(this.player);

        this._server.resetSocket(this._socket);
        this._server.emitPlayerLeft(room, playerData);
        this._server.emitMatchUpdated(room, this.matchDataFull);
        
        if (isVisible) {
            this._server.emitMatchesUpdated();
        }
    }

    startMatch() {
        if (!this.isMatchOwner()) {
            console.warn(`Player ${this.player.id} tried to start match ${this.match.id} without permission.`);
            return;
        }

        if (this.match.isStarted) {
            console.warn(`Match ${this.match.id} is already started.`);
            return;
        }

        if (!this.match.allPlayersReady()) {
            console.warn(`Match ${this.match.id} cannot be started because not all players are ready.`);
            return;
        }

        const wasVisible = this.match.isVisible();
        this.match.isStarted = true;

        this._server.emitMatchStarted(this.match.room);
        if (wasVisible) {
            this._server.emitMatchesUpdated();
        }
    }

    finishMatch(finishMatchJson) {
        let finishMatchData;
        try {
            finishMatchData = JSON.parse(finishMatchJson);
        } catch (error) {
            console.error('ERROR: Invalid data received.', finishMatchJson);
            return;
        }

        if (!this.isMatchOwner()) {
            console.warn(`Player ${this.player.id} tried to finish match ${this.match.id} without permission.`);
            return;
        }

        if (!this.match.isStarted) {
            console.warn(`Match ${this.match.id} is not started.`);
            return;
        }
        
        this.match.isFinished = true;
        this._server.emitMatchFinished(this.match.room, finishMatchData);
        if (this.match.isVisible()) {
            this._server.emitMatchesUpdated();
        }
    }

    kickPlayer(playerId) {
        if (!this.isMatchOwner()) {
            console.warn(`Player ${this.player.id} tried to kick player ${playerId} without permission.`);
            return;
        }

        if (!this.match.hasPlayer(playerId)) {
            console.warn(`Player ${playerId} is not in match ${this.match.id}.`);
            return;
        }

        if (playerId === this.player.id) {
            console.warn(`Player ${this.player.id} cannot kick self.`);
            return;
        }

        this.match.kickPlayer(playerId);

        const playerData = this.playerDataFull;
        const otherSocket = this._server.findSocket(playerId);
        if (otherSocket) {
            this._server.resetSocket(otherSocket);
            otherSocket.emit('player-kicked', otherSocket._player.getMinResponse());
        }

        this._server.emitPlayerKicked(this.match.room, playerData);
        this._server.emitMatchUpdated(this.match.room, this.matchDataFull);

        if (this.match.isVisible()) {
            this._server.emitMatchesUpdated();
        }
    }

    updatePlayer(playerDataJson) {
        let playerData;
        try {
            playerData = JSON.parse(playerDataJson);
        } catch (error) {
            console.error('ERROR: Invalid data received.', playerDataJson);
            return;
        }

        this.player.name = playerData.name || this.player.name;
        this.player.data = Object.assign({}, this.player.data, playerData.data || {});
        this.player.isReady = playerData.isReady !== undefined ? playerData.isReady : this.player.isReady;

        this._server.emitPlayerUpdated(this.room, this.inMatch() ? this.playerDataFull : this.playerDataMin);
        if (this.inMatch()) {
            this._server.emitMatchUpdated(this.room, this.matchDataFull);
        }
    }

    tick(tickDataJson) {
        try {
            let tickData = JSON.parse(tickDataJson);
            tickData.player = this.player.id;

            this._server.emitTick(this.match.owner, tickData);
        } catch (error) {
            console.error('ERROR: Invalid data received.', tockDataJson);
        }
    }

    tock(tockDataJson) {
        if (!this.isMatchOwner()) {
            console.warn(`Player ${this.player.id} tried to send tock without permission.`);
            return;
        }

        try {
            let tockData = JSON.parse(tockDataJson);
            tockData.player = this.player.id;

            this._server.emitTock(this.match.room, tockData);
        } catch (error) {
            console.error('ERROR: Invalid data received.', tockDataJson);
        }
    }

    disconnect(reason) {
        this.leaveMatch();
        this._server.removePlayer(this.player);

        console.log(`Player ${this.player.id} disconnected. Reason: ${reason}`);
    }

    changeRoom(room) {
        this._socket.leave(this.room);
        this._socket.join(room);
    }

    inMatch() {
        return this.match !== null;
    }

    isMatchOwner() {
        return this.inMatch() && this.match.isOwner(this.player.id);
    }

    isMatchGuest() {
        return this.inMatch() && !this.match.isOwner(this.player.id);
    }
};
