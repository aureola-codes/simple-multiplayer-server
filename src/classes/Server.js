const Connection = require('./Connection');
const MatchesRegistry = require('../registries/MatchesRegistry');
const PlayersRegistry = require('../registries/PlayersRegistry');

module.exports = class Server {
    constructor(io, config) {
        this._io = io;
        this._config = config;
        this._players = new PlayersRegistry(this._config);
        this._matches = new MatchesRegistry(this._config);
    }

    get status() {
        return {
            numPlayers: this._players.numPlayers,
            maxPlayers: this._players.maxPlayers,
            numMatches: this._matches.numMatches,
            maxMatches: this._matches.maxMatches,
        }
    }

    get settings() {
        return {
            chatMinLength: this._config.chatMinLength,
            chatMaxLength: this._config.chatMaxLength,
            matchNameMinLength: this._config.matchNameMinLength,
            matchNameMaxLength: this._config.matchNameMaxLength,
            matchPasswordMinLength: this._config.matchPasswordMinLength,
            matchPasswordMaxLength: this._config.matchPasswordMaxLength,
            maxPlayersPerMatch: this._config.maxPlayersPerMatch,
        }
    }

    get players() {
        return this._players.getList();
    }

    get matches() {
        return this._matches.getListVisible();
    }

    init() {
        this._io.on('connection', socket => {
            console.log(`Player ${socket.id} connected.`);

            if (this.authenticate(socket)) {
                let player = this.createPlayer(socket);
                if (player) {
                    new Connection(socket, player, this).init();
                }
            }
        });

        this._io.listen(this._config.port);

        console.log(`Server started! Listening on port: ${this._config.port}`);
    }

    emitChatMessage(room, message, player) {
        if (message.length <= this._config.chatMinLength) {
            console.warn(`Player ${player.id} sent a chat message that is too short.`);
            return;
        }

        if (this._config.chatMaxLength > 0 && message.length > this._config.chatMaxLength) {
            console.warn(`Player ${player.id} sent a chat message that is too long.`);
            message = message.substring(0, this._config.chatMaxLength - 3) + '...';
        }

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

    emitMatchUpdated(room, match) {
        this._io.to(room).emit('match-updated', match);
    }

    emitMatchStarted(room) {
        this._io.to(room).emit('match-started');
    }

    emitMatchFinished(room, finishData) {
        this._io.to(room).emit('match-finished', finishData);
    }

    emitTick(room, tickData) {
        this._io.to(room).emit('tick', tickData);
    }

    emitTock(room, tockData) {
        this._io.to(room).emit('tock', tockData);
    }

    emitMatchesUpdated(room = 'lobby') {
        this._io.to(room).emit('matches-updated', {
            matches: this._matches.getListVisible()
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

    createPlayer(socket) {
        let player;
        try {
            player = this._players.add(socket.id, 'Player');
        } catch (error) {
            socket.emit('error', error.message);
            socket.disconnect(true);

            console.warn(error.message);
        }

        return player;
    }

    removePlayer(player) {
        this._players.remove(player.id);
    }

    createMatch(matchData, player) {
        let match = this._matches.add(matchData, player);
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

        this._matches.remove(match.id);
        if (match.isVisible) {
            this.emitMatchesUpdated();
        }
    }

    joinMatch(matchId, password, player) {
        let joinedMatch = this._matches.find(matchId);
        if (!joinedMatch) {
            throw new Error('Match not found.');
        }

        if (joinedMatch.password && joinedMatch.password !== password) {
            throw new Error('Match password mismatch.');
        }

        if (joinedMatch.numPlayers >= joinedMatch.maxPlayers) {
            throw new Error('Match full.');
        }

        if (joinedMatch.blockedPlayers.includes(player.id)) {
            throw new Error('Player blocked.');
        }

        joinedMatch.addPlayer(player);

        this.emitPlayerJoined(joinedMatch.room, player);
        this.emitMatchUpdated(joinedMatch.room, joinedMatch);

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
