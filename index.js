const socketio = require('socket.io');
const config = require('./config');

const { Server } = require('./classes');

const io = socketio();
const server = new Server();

io.on('connection', socket => {
    let match;
    let player;

    const authToken = socket.handshake.auth.token;
    if (config.authToken !== "" && authToken !== config.authToken) {
        socket.disconnect();
        return;
    }

    if (server.numPlayers >= config.maxPlayers) {
        socket.disconnect();
        return;
    }

    player = server.addPlayer(socket.id, 'Player');

    socket.join('lobby');

    socket.on('chat-message', message => {
        io.to(match ? match.room : 'lobby').emit('chat-message', {
            player: player,
            message: message
        });
    });

    socket.on('match-create', (matchData, callback) => {
        if (match) {
            callback('ERROR: Player already joined a match.');
            return;
        }

        match = server.addMatch(matchData, player)

        socket.leave('lobby');
        socket.join(match.room);

        callback(match.getCreateResponse());
        io.to('lobby').emit('matches-updated', server.getPublicMatches());
    });

    socket.on('match-join', (joinData, callback) => {
        if (match) {
            callback('ERROR: Player already joined a match.');
            return;
        }

        let joinedMatch = server.findMatch(joinData.match);
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

        io.to(match.room).emit('player-joined', player);

        socket.leave('lobby');
        socket.join(match.room);

        callback(match.getCreateResponse());
    });

    socket.on('match-leave', () => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (match.isOwner(player)) {
            io.to(match.room).emit('match-canceled');
            io.to(match.room).clients((error, clients) => {
                clients.forEach(client => {
                    io.sockets.sockets[client].leave(match.room);
                    io.sockets.sockets[client].join('lobby');
                });
            });

            server.removeMatch(match.id);
            io.to('lobby').emit('matches-updated', server.getPublicMatches());
        } else {
            match.removePlayer(player.id);

            socket.leave(match.room);
            socket.join('lobby');

            io.to(match.room).emit('player-left', player);
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

        io.to(match.room).emit('match-started');
        io.to('lobby').emit('matches-updated', server.getPublicMatches());
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

        io.to(match.room).emit('match-finished');
        io.to(match.room).clients((error, clients) => {
            clients.forEach(client => {
                io.sockets.sockets[client].leave(match.room);
                io.sockets.sockets[client].join('lobby');
            });
        });

        server.removeMatch(match.id);
        io.to('lobby').emit('matches-updated', server.getPublicMatches());

        match = null;
    });

    socket.on('player-kick', playerId => {
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

        io.sockets.sockets[client].leave(match.room);
        io.sockets.sockets[client].join('lobby');

        io.to(match.room).emit('player-kicked', playerId);
    });

    socket.on('tick', requestData => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (match.isOwner(player)) {
            console.log($`Owners ${player.id} cannot send guest requests.`);
            return;
        }

        io.to(match.owner).emit('tick', {
            type: requestData.type,
            context: requestData.context,
            player: player.id
        });
    });

    socket.on('tock', commandData => {
        if (!match) {
            console.log($`Player ${player.id} is not in a match.`);
            return;
        }

        if (!match.isOwner(player)) {
            console.log($`Player ${player.id} does not own match ${match.id}.`);
            return;
        }

        io.to(commandData.player ? commandData.player : match.room).emit('tock', {
            type: commandData.type,
            context: commandData.context
        });
    });

    socket.on('disconnect', reason => {
        server.removePlayer(player.id);
    });
});

io.listen(config.serverPort);
