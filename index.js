const socketio = require('socket.io');
const config = require('./config');

const ServerState = require('./classes/ServerState');

const io = socketio();

const serverState = new ServerState();

io.on('connection', socket => {
    // TODO: Check if number of players allowed.
    // TODO: Check auth.

    let match;
    let player = serverState.addPlayer(socket.handshake.query.id, socket.handshake.query.name, socket.id);

    socket.join('lobby');
    socket.emit('matches:list', {"matches": serverState.getMatchesPublic()});

    socket.on('matches:create', matchData => {
        console.log('matches:start', matchData);

        try {
            if (match !== null) {
                throw new Error('Player has already joined a match.');
            }

            match = serverState.createMatch(matchData);

            socket.leave('lobby');
            socket.join(match.id);

            io.in('lobby').emit('matches:list', serverState.getMatchesPublic());
        } catch (errorMessage) {
            socket.emit('error', {message: errorMessage});
        }
    });

    socket.on('matches:join', joinData => {
        console.log('matches:join', joinData);

        try {
            if (match !== null) {
                throw new Error('Player has already joined a match.');
            }

            match = serverState.joinMatch(joinData.match, joinData.password, player);

            socket.leave('lobby');
            socket.join(matchData.id);
        } catch (errorMessage) {
            socket.emit('error', {message: errorMessage});
        }
    });

    socket.in('matches:start', () => {
        console.log('matches:start', match);

        try {
            if (match === null) {
                throw new Error('Player is not part of a match.');
            }

            serverState.startMatch(match.id, player.id);

            io.in(match.id).emit('match:started');
        } catch (errorMessage) {
            socket.emit('error', {message: errorMessage});
        }
    });

    socket.on('matches:leave', () => {
        console.log('matches:leave', match);

        try {
            if (match === null) {
                throw new Error('Player is not part of a match.');
            }

            if (match.isOwner(player.id)) {
                serverState.cancelMatch(match.id);

                io.in(match.id).emit('match:canceled');
                io.in('lobby').emit('matches:list', serverState.getMatches());
            } else {
                serverState.leaveMatch(match.id, player);
                socket.leave(match.id);

                io.in(match.id).emit('match:updated');
            }

            socket.join('lobby');
    
            match = null;
        } catch (errorMessage) {
            socket.emit('error', {message: errorMessage});
        }
    });

    socket.on('reconnect', () => {
        console.log('test');
    });

    socket.on('disconnect', reason => {
        serverState.removePlayer(player);
    });
});

io.listen(config.serverPort);
