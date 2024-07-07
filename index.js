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
    let player = new Player(socket.id, 'Player');
    players[socket.id] = player;

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
            callback({ message: 'You are already in a match.' });
            return;
        }

        match = new Match(matchData, player);
        matches.push(match);

        socket.leave('lobby');
        socket.join(match.getRoom());

        callback(match.getCreateResponse());
        
        io.to('lobby').emit('matches-updated', () => matches.filter(match => match.isVisible()).map(match => match.getCreateResponse()));
    });

    socket.on('reconnect', () => {
        
    });

    socket.on('disconnect', reason => {
        players = players.filter(p => p.id !== socket.id);
    });
});

io.listen(config.serverPort);
