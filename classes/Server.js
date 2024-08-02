const State = require('./State');

module.exports = class Server {
    constructor(config) {
        this._config = config;
        this._io = require('socket.io')();
        this._state = new State(this._config);
    }

    init() {
        this.registerEventListeners();
        this._io.listen(this._config.port);

        console.log(`Server started! Listening on port: ${this._config.port}`);
    }

    registerEventListeners() {
        this._io.on('connection', socket => {
            console.log(`Player ${socket.id} connected.`);

            if (!this.authenticate(socket)) {
                return;
            }

            socket._player = this.registerPlayer(socket);
            if (!socket._player) {
                return;
            }

            socket._match = null;

            socket.emit('init', {
                player: socket._player.getFullResponse(),
                status: this._state.status
            });

            socket.join('lobby');

            socket.on('chat-message', sendChatMessage.bind(this));
            socket.on('match-create', createMatch.bind(this));
            socket.on('match-join', joinMatch.bind(this));
            socket.on('match-leave', leaveMatch.bind(this));
            socket.on('match-start', startMatch.bind(this));
            socket.on('match-finish', finishMatch.bind(this));
            socket.on('player-update', updatePlayer.bind(this));
            socket.on('player-kick', kickPlayer.bind(this));
            socket.on('tick', tick.bind(this));
            socket.on('tock', tock.bind(this));
            socket.on('disconnect', onDisconnect.bind(this));

            this.emitMatchesUpdated(socket.id);

            function sendChatMessage(message) {
                const room = socket._match ? socket._match.room : 'lobby';
                this.emit(room, 'chat-message', {
                    message: message,
                    player: socket._player.getMinResponse()
                });
            }

            function createMatch(matchDataJson, callback) {
                if (socket._match) {
                    callback('ERROR: Player already joined a match.');
                    return;
                }

                let matchData;
                try {
                    matchData = JSON.parse(matchDataJson);
                } catch (error) {
                    callback('ERROR: Invalid data received.');
                    return;
                }

                socket._match = this._state.addMatch(matchData, socket._player);
                socket._match.addPlayer(socket._player);

                socket.leave('lobby');
                socket.join(socket._match.room);

                callback(socket._match.getFullResponse());

                if (socket._match.isVisible()) {
                    this.emitMatchesUpdated();
                }
            }

            function joinMatch(joinDataJson, callback) {
                if (socket._match) {
                    callback('ERROR: Player already joined a match.');
                    return;
                }

                let joinData;
                try {
                    joinData = JSON.parse(joinDataJson);
                } catch (error) {
                    callback('ERROR: Invalid data received.');
                    return;
                }

                let joinedMatch = this._state.findMatch(joinData.match);
                if (!joinedMatch) {
                    callback('ERROR: Match not found.');
                    return;
                }

                try {
                    joinedMatch.authorize(socket._player, joinData.password);
                } catch (error) {
                    callback('ERROR: ' + error.message);
                    return;
                }

                joinedMatch.addPlayer(socket._player);
                socket._match = joinedMatch;

                this.emit(socket._match.room, 'player-joined', socket._player);

                socket.leave('lobby');
                socket.join(socket._match.room);

                callback(socket._match.getFullResponse());

                if (socket._match.isVisible()) {
                    this.emitMatchesUpdated();
                }
            }

            function leaveMatch() {
                if (!inMatch()) {
                    console.log(`Player ${socket._player.id} is not in a match.`);
                    return;
                }

                const isVisible = socket._match.isVisible();
                if (socket._match.isOwner(socket._player.id)) {
                    this.emit(socket._match.room, 'match-canceled');

                    this.removeMatch(socket._match);
                } else {
                    const room = socket._match.room;
                    socket._match.removePlayer(socket._player.id);

                    this.resetSocket(socket);

                    this.emit(room, 'player-left', socket._player);
                }

                if (isVisible) {
                    this.emitMatchesUpdated();
                }
            }

            function startMatch() {
                if (!isMatchOwner()) {
                    return;
                }

                if (socket._match.isStarted) {
                    console.log(`Match ${socket._match.id} is already started.`);
                    return;
                }

                const isVisible = socket._match.isVisible();
                socket._match.isStarted = true;

                this.emit(socket._match.room, 'match-started');

                if (isVisible) {
                    this.emitMatchesUpdated();
                }
            }

            function finishMatch() {
                if (!isMatchOwner()) {
                    return;
                }

                if (!socket._match.isStarted) {
                    console.log(`Match ${socket._match.id} is not started.`);
                    return;
                }

                this.emit.to(socket._match.room, 'match-finished');

                const isVisible = socket._match.isVisible();
                this.removeMatch(socket._match);

                if (isVisible) {
                    this.emitMatchesUpdated();
                }
            }

            function kickPlayer(playerId) {
                if (!isMatchOwner()) {
                    return;
                }

                if (!socket._match.hasPlayer(playerId)) {
                    console.log(`Player ${playerId} is not in match ${socket._match.id}.`);
                    return;
                }

                if (playerId === socket._player.id) {
                    console.log(`Player ${socket._player.id} cannot kick himself.`);
                    return;
                }

                socket._match.kickPlayer(playerId);

                const otherSocket = this.findSocket(playerId);
                if (otherSocket) {
                    this.resetSocket(otherSocket);
                    otherSocket.emit('player-kicked', otherSocket._player.getMinResponse());
                }

                this.emit(socket._match.room, 'player-kicked', otherSocket._player.getMinResponse());

                if (socket._match.isVisible()) {
                    this.emitMatchesUpdated();
                }
            }

            function updatePlayer(playerDataJson) {
                let playerData;
                try {
                    playerData = JSON.parse(playerDataJson);
                } catch (error) {
                    console.log('ERROR: Invalid data received.', playerDataJson);
                    return;
                }

                let playerUpdated = false;
                if (playerData.name && playerData.name !== socket._player.name) {
                    socket._player.name = playerData.name;
                    playerUpdated = true;
                }
                if (playerData.isReady !== undefined && playerData.isReady !== socket._player.isReady) {
                    socket._player.isReady = playerData.isReady;
                    playerUpdated = true;
                }

                if (playerUpdated && socket._match) {
                    this.emit(socket._match.room, 'player-updated', socket._player.getFullResponse());
                }
            }

            function tick(tickData) {
                if (isMatchGuest()) {
                    this.emit(socket._match.owner, 'tick', {
                        type: tickData.type,
                        context: tickData.context,
                        player: socket._player.id
                    });
                }
            }

            function tock(tockData) {
                if (isMatchOwner()) {
                    this.emit(socket._match.room, 'tock', {
                        type: tockData.type,
                        context: tockData.context
                    });
                }
            }

            function onDisconnect(reason) {
                leaveMatch();
                this._state.removePlayer(socket._player.id);

                console.log(`Player ${socket._player.id} disconnected. Reason: ${reason}`);
            }

            function inMatch() {
                return socket._match !== null;
            }

            function isMatchOwner() {
                return inMatch() && socket._match.isOwner(socket._player.id);
            }

            function isMatchGuest() {
                return inMatch() && !socket._match.isOwner(socket._player.id);
            }
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

    removeMatch(match) {
        for (let player of match.players) {
            const playerSocket = this.findSocket(player.id);
            if (playerSocket) {
                this.resetSocket(playerSocket);
            }
        }

        this._state.removeMatch(match.id);
    }

    findSocket(socketId) {
        return this._io.sockets.sockets.get(socketId) || null;
    }

    resetSocket(otherSocket) {
        otherSocket.join('lobby');
        otherSocket.leave(otherSocket._match.room);

        otherSocket._match = null;
        otherSocket._player.isReady = false;

        this.emitMatchesUpdated(otherSocket.id);
    }

    emit(room, event, data = null) {
        this._io.to(room).emit(event, data);
    }

    emitMatchesUpdated(room = 'lobby') {
        this._io.to(room).emit('matches-updated', {
            matches: this._state.getVisibleMatches()
        });
    }
}
