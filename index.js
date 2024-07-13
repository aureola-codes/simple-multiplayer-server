const config = require('./config');
const State = require('./classes/State');

const io = require('socket.io')();
const state = new State();

io.on('connection', socket => {
    socket._match;
    socket._player;

    const authToken = socket.handshake.auth.token;
    if (config.authToken !== "" && authToken !== config.authToken) {
        socket.emit('error', 'Invalid authentication token.');
        socket.disconnect();
        return;
    }

    if (state.numPlayers >= config.maxPlayers) {
        socket.emit('error', 'Server is full.');
        socket.disconnect();
        return;
    }

    socket._player = state.addPlayer(socket.id, 'Player');

    socket.join('lobby');

    socket.on('chat-message', sendChatMessage.bind(this));
    socket.on('match-create', createMatch.bind(this));
    socket.on('match-join', joinMatch.bind(this));
    socket.on('match-leave', leaveMatch.bind(this));
    socket.on('match-start', startMatch.bind(this));
    socket.on('match-finish', finishMatch.bind(this));
    socket.on('player-kick', kickPlayer.bind(this));
    socket.on('tick', tick.bind(this));
    socket.on('tock', tick.bind(this));
    socket.on('disconnect', onDisconnect.bind(this));

    function sendChatMessage(message) {
        const room = socket._match ? socket._match.room : 'lobby';
        io.to(room).emit('chat-message', {
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

        socket._match = state.addMatch(matchData, socket._player);

        socket.leave('lobby');
        socket.join(socket._match.room);

        callback(socket._match.getFullResponse());

        if (socket._match.isVisible()) {
            emitMatchesUpdated();
        }
    }

    function joinMatch(joinDataJson, callback) {
        if (socket._match !== null) {
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

        let joinedMatch = state.findMatch(joinData.match);
        if (!joinedMatch) {
            callback('ERROR: Match not found.');
            return;
        }

        try {
            joinedMatch.authorize(joinData.password);
        } catch (error) {
            callback('ERROR: ' + error.message);
            return;
        }

        joinedMatch.addPlayer(socket._player);
        socket._match = joinedMatch;

        io.to(socket._match.room).emit('player-joined', socket._player);

        socket.leave('lobby');
        socket.join(socket._match.room);

        callback(socket._match.getFullResponse());

        if (socket._match.isVisible()) {
            emitMatchesUpdated();
        }
    }

    function leaveMatch() {
        if (!socket._match) {
            console.log($`Player ${socket._player.id} is not in a match.`);
            return;
        }

        if (socket._match.isOwner(socket._player.id)) {
            io.to(socket._match.room).emit('match-canceled');

            removeMatch(socket._match);
        } else {
            socket._match.removePlayer(socket._player.id);

            socket.join('lobby');
            socket.leave(socket._match.room);

            io.to(socket._match.room).emit('player-left', socket._player);
        }

        if (socket._match.isVisible()) {
            emitMatchesUpdated();
        }

        socket._match = null;
    }

    function startMatch() {
        if (!isMatchOwner()) {
            return;
        }

        if (socket._match.isStarted) {
            console.log($`Match ${socket._match.id} is already started.`);
            return;
        }

        socket._match.isStarted = true;

        io.to(socket._match.room).emit('match-started');
        emitMatchesUpdated();
    }

    function finishMatch() {
        if (!isMatchOwner()) {
            return;
        }

        if (!socket._match.isStarted) {
            console.log($`Match ${socket._match.id} is not started.`);
            return;
        }

        io.to(socket._match.room).emit('match-finished');

        removeMatch(socket._match);
        emitMatchesUpdated();
    }

    function kickPlayer(playerId) {
        if (!isMatchOwner()) {
            return;
        }

        if (!socket._match.hasPlayer(playerId)) {
            console.log($`Player ${playerId} is not in match ${socket._match.id}.`);
            return;
        }

        if (playerId === socket._player.id) {
            console.log($`Player ${socket._player.id} cannot kick himself.`);
            return;
        }

        socket._match.kickPlayer(playerId);

        const otherSocket = io.sockets.sockets.get(playerId);
        if (otherSocket) {
            resetSocket(otherSocket);
        }

        io.to(socket._match.room).emit('player-kicked', playerId);
        if (socket._match.isVisible()) {
            emitMatchesUpdated();
        }
    }

    function tick(tickData) {
        if (isMatchGuest()) {
            io.to(socket._match.owner).emit('tick', {
                type: tickData.type,
                context: tickData.context,
                player: socket._player.id
            });
        }
    }

    function tick(tockData) {
        if (isMatchOwner()) {
            io.to(socket._match.room).emit('tock', {
                type: tockData.type,
                context: tockData.context
            });
        }
    }

    function onDisconnect(reason) {
        leaveMatch();
        state.removePlayer(socket._player.id);
    }

    function hasMatch() {
        if (socket._match === null) {
            console.log($`Player ${socket._player.id} is not in a match.`);
            return false;
        }

        return true;
    }

    function isMatchOwner() {
        if (!hasMatch()) {
            return false;
        }
        
        if (!socket._match.isOwner(socket._player.id)) {
            console.log($`Player ${socket._player.id} does not own match ${socket._match.id}.`);
            return false;
        }

        return true;
    }

    function isMatchGuest() {
        if (!hasMatch()) {
            return false;
        }
        
        if (socket._match.isOwner(socket._player.id)) {
            console.log($`Owners ${socket._player.id} cannot send guest requests.`);
            return false;
        }

        return true;
    }
});

io.listen(config.serverPort);

function removeMatch(match) {
    for (let player of match.players) {
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
            resetSocket(playerSocket);
        }
    }

    state.removeMatch(match.id);
}

function resetSocket(otherSocket) {
    otherSocket.join('lobby');
    otherSocket.leave(match.room);

    otherSocket._match = null;
}

function emitMatchesUpdated(room = 'lobby') {
    io.to(room).emit('matches-updated', {
        matches: state.getVisibleMatches()
    });
}
