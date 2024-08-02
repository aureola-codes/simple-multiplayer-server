const Connection = require('./Connection');
const State = require('./State');

module.exports = class Server {
    constructor(io, config) {
        this._config = config;
        this._io = io;
        this._state = new State(this._config);
    }

    get status() {
        return this._state.status;
    }

    init() {
        this._io.on('connection', socket => {
            console.log(`Player ${socket.id} connected.`);

            if (this.authenticate(socket)) {
                let player = this.registerPlayer(socket);
                if (player) {
                    new Connection(socket, player, this).init();
                }
            }
        });

        this._io.listen(this._config.port);

        console.log(`Server started! Listening on port: ${this._config.port}`);
    }

    emitChatMessage(room, message, player) {
        this._io.to(room).emit('chat-message', {
            message: message,
            player: player,
        });
    }

    emitPlayerJoined(room, player) {
        this._io.to(room).emit('player-joined', player);
    }

    emitPlayerLeft(room, player) {
        this._io.to(room).emit('player-left', player);
    }

    emitPlayerKicked(room, player) {
        this._io.to(room).emit('player-kicked', player);
    }

    emitPlayerUpdated(room, player) {
        this._io.to(room).emit('player-updated', player);
    }

    emitMatchStarted(room) {
        this._io.to(room).emit('match-started');
    }

    emitMatchFinished(room) {
        this._io.to(room).emit('match-finished');
    }

    emitTick(room, tickData) {
        this._io.to(room).emit('tick', tickData);
    }

    emitTock(room, tockData) {
        this._io.to(room).emit('tock', tockData);
    }

    emitMatchesUpdated(room = 'lobby') {
        this._io.to(room).emit('matches-updated', {
            matches: this._state.getVisibleMatches()
        });
    }

    authenticate(socket) {
        const authToken = socket.handshake.auth.token;
        if (this._config.authToken !== '' && authToken !== this._config.authToken) {
            socket.emit('error', 'Invalid authentication token.');
            socket.disconnect(true);

            console.warn(`Player ${socket.id} has invalid authentication token.`);
            return false;
        }

        return true;
    }

    registerPlayer(socket) {
        let player;
        try {
            player = this._state.addPlayer(socket.id, 'Player');
        } catch (error) {
            socket.emit('error', error.message);
            socket.disconnect(true);

            console.warn(error.message);
        }

        return player;
    }

    removePlayer(player) {
        this._state.removePlayer(player.id);
    }

    registerMatch(matchData, player) {
        let match = this._state.addMatch(matchData, player);
        if (match.isVisible()) {
            this.emitMatchesUpdated();
        }

        return match;
    }

    cancelMatch(match) {
        this._io.to(match.room).emit('match-canceled');
        this.removeMatch(match);
    }

    removeMatch(match) {
        for (let player of match.players) {
            const playerSocket = this.findSocket(player.id);
            if (playerSocket) {
                this.resetSocket(playerSocket);
            }
        }

        this._state.removeMatch(match.id);
        if (match.isVisible) {
            this.emitMatchesUpdated();
        }
    }

    joinMatch(matchId, password, player) {
        let joinedMatch = this._state.findMatch(matchId);
        if (!joinedMatch) {
            throw 'Match not found.';
        }

        joinedMatch.authorize(player, password);
        joinedMatch.addPlayer(player);

        this.emitPlayerJoined(joinedMatch.room, player);
        if (joinedMatch.isVisible()) {
            this.emitMatchesUpdated();
        }

        return joinedMatch;
    }

    findSocket(socketId) {
        return this._io.sockets.sockets.get(socketId) || null;
    }

    resetSocket(socket) {
        socket.join('lobby');
        socket.leave(socket._match.room);

        socket._match = null;
        socket._player.isReady = false;

        this.emitMatchesUpdated(socket.id);
    }
}
