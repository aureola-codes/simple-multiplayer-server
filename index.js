const socketio = require('socket.io');
const config = require('./config');

const Match = require('./classes/Match');
const Player = require('./classes/Player');

const io = socketio();

let match;
let player;

let matches = [];
let players = [];

io.on('connection', socket => {
    // Check if the player is allowed to connect.
    const authToken = socket.handshake.auth.token;
    if (config.authToken !== "" && authToken !== config.authToken) {
        socket.disconnect();
        return;
    }

    // Check if the number of players exceeds the maximum.
    if (players.length >= config.maxPlayers) {
        socket.disconnect();
        return;
    }

    // Add new player to the players registry.
    player = new Player(socket.id, 'Player');
    players.push(player);

    // Add the player to the lobby.
    socket.join('lobby');

    socket.on('chat-message', message => {
        // Send the message to all players in the lobby or match.
        io.to(match ? match.getRoom() : 'lobby').emit('chat-message', {
            player: player,
            message: message
        });
    });

    socket.on('match-create', (matchData, callback) => {
        if (match) {
            callback('ERROR: Player already joined a match.');
            return;
        }

        match = new Match(matchData, player);
        matches.push(match);

        socket.leave('lobby');
        socket.join(match.getRoom());

        callback(match.getCreateResponse());
        emitMatchesUpdated();
    });

    socket.on('match-join', (joinData, callback) => {
        if (match) {
            callback('ERROR: Player already joined a match.');
            return;
        }

        let joinedMatch = matches.find(match => match.id === joinData.match);
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

        joinedMatch.addPlayer(player);
        match = joinedMatch;

        io.to(match.getRoom()).emit('player-joined', player);

        socket.leave('lobby');
        socket.join(match.getRoom());

        callback(match.getCreateResponse());
    });

    socket.on('match-leave', () => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (match.isOwner(player)) {
            io.to(match.getRoom()).emit('match-canceled');
            io.to(match.getRoom()).clients((error, clients) => {
                clients.forEach(client => {
                    io.sockets.sockets[client].leave(match.getRoom());
                    io.sockets.sockets[client].join('lobby');
                });
            });

            matches = matches.filter(m => m.id !== match.id);
            emitMatchesUpdated();
        } else {
            match.removePlayer(player.id);

            socket.leave(match.getRoom());
            socket.join('lobby');

            io.to(match.getRoom()).emit('player-left', player);
        }

        match = null;
    });

    socket.on('match-start', () => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (!match.isOwner(player)) {
            console.log($`Player ${player.id} does not own match ${match.id}.`);
            return;
        }

        if (match.isStarted) {
            console.log($`Match ${match.id} is already started.`);
            return;
        }

        match.isStarted = true;
        io.to(match.getRoom()).emit('match-started');
    });

    socket.on('match-finish', () => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (!match.isOwner(player)) {
            console.log($`Player ${player.id} does not own match ${match.id}.`);
            return;
        }

        if (!match.isStarted) {
            console.log($`Match ${match.id} is not started.`);
            return;
        }

        io.to(match.getRoom()).emit('match-finished');
        io.to(match.getRoom()).clients((error, clients) => {
            clients.forEach(client => {
                io.sockets.sockets[client].leave(match.getRoom());
                io.sockets.sockets[client].join('lobby');
            });
        });

        matches = matches.filter(m => m.id !== match.id);
        emitMatchesUpdated();

        match = null;
    });

    socket.on('match-kick', playerId => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (!match.isOwner(player)) {
            console.log($`Player ${player.id} does not own match ${match.id}.`);
            return;
        }

        if (playerId === player.id) {
            console.log($`Player ${player.id} cannot kick himself.`);
            return;
        }

        match.removePlayer(playerId);

        io.sockets.sockets[client].leave(match.getRoom());
        io.sockets.sockets[client].join('lobby');

        io.to(match.getRoom()).emit('player-kicked', playerId);
    });

    socket.on('guest-request', requestData => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (match.isOwner(player)) {
            console.log($`Owners ${player.id} cannot send guest requests.`);
            return;
        }

        io.to(match.getOwner()).emit('guest-request', {
            type: requestData.type,
            context: requestData.context,
            player: player.id
        });
    });

    socket.on('host-command', commandData => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (!match.isOwner(player)) {
            console.log($`Player ${player.id} does not own match ${match.id}.`);
            return;
        }

        io.to(commandData.player ? commandData.player : match.getOwner()).emit('host-command', {
            type: commandData.type,
            context: commandData.context
        });
    });

    socket.on('disconnect', reason => {
        players = players.filter(p => p.id !== socket.id);
    });
});

io.listen(config.serverPort);

const emitMatchesUpdated = () => {
    let filteredMatches = matches
        .filter(entry => entry.isVisible())
        .map(entry => entry.getListResponse());

    io.to('lobby').emit('matches-updated', filteredMatches);
}
