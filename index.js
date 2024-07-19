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
    socket.emit('init', socket._player.getMinResponse());

    console.log('player:', socket._player);

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
    socket.on('request', tick.bind(this));

    socket.on('tock', tock.bind(this));
    socket.on('command', tock.bind(this));

    socket.on('disconnect', onDisconnect.bind(this));

    emitMatchesUpdated(socket.id);

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
        socket._match.addPlayer(socket._player);

        socket.leave('lobby');
        socket.join(socket._match.room);

        callback(socket._match.getFullResponse());

        if (socket._match.isVisible()) {
            emitMatchesUpdated();
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

        let joinedMatch = state.findMatch(joinData.match);
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
            console.log(`Player ${socket._player.id} is not in a match.`);
            return;
        }

        const isVisible = socket._match.isVisible();
        if (socket._match.isOwner(socket._player.id)) {
            io.to(socket._match.room).emit('match-canceled');

            removeMatch(socket._match);
        } else {
            const room = socket._match.room;
            socket._match.removePlayer(socket._player.id);

            resetSocket(socket);

            io.to(room).emit('player-left', socket._player);
        }
        
        if (isVisible) {
            emitMatchesUpdated();
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

        io.to(socket._match.room).emit('match-started');

        if (isVisible) {
            emitMatchesUpdated();
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

        io.to(socket._match.room).emit('match-finished');
        
        const isVisible = socket._match.isVisible();
        removeMatch(socket._match);

        if (isVisible) {
            emitMatchesUpdated();
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

        const otherSocket = io.sockets.sockets.get(playerId);
        if (otherSocket) {
            resetSocket(otherSocket);
            otherSocket.emit('player-kicked', otherSocket._player.getMinResponse());
        }
        
        io.to(socket._match.room).emit('player-kicked', otherSocket._player.getMinResponse());
        
        if (socket._match.isVisible()) {
            emitMatchesUpdated();
        }
    }

    function updatePlayer(playerDataJson) {

        let playerData;
        try {
            playerData = JSON.parse(playerDataJson);
        } catch (error) {
            console.log('ERROR: Invalid data received.');
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
            io.to(socket._match.room).emit('player-updated', socket._player.getFullResponse());
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

    function tock(tockData) {
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
        if (!socket._match) {
            console.log(`Player ${socket._player.id} is not in a match.`);
            return false;
        }

        return true;
    }

    function isMatchOwner() {
        if (!hasMatch()) {
            return false;
        }
        
        if (!socket._match.isOwner(socket._player.id)) {
            console.log(`Player ${socket._player.id} does not own match ${socket._match.id}.`);
            return false;
        }

        return true;
    }

    function isMatchGuest() {
        if (!hasMatch()) {
            return false;
        }
        
        if (socket._match.isOwner(socket._player.id)) {
            console.log(`Owners ${socket._player.id} cannot send guest requests.`);
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
    otherSocket.leave(otherSocket._match.room);
    
    otherSocket._match = null;
    otherSocket._player.isReady = false;

    emitMatchesUpdated(otherSocket.id);
}

function emitMatchesUpdated(room = 'lobby') {
    io.to(room).emit('matches-updated', {
        matches: state.getVisibleMatches()
    });
}
