const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    serverPort: process.env.SERVER_PORT || 9000,
    authToken: process.env.AUTH_TOKEN || '',
    maxPlayers: process.env.MAX_PLAYERS || 100,
    maxPlayersPerMatch: process.env.MAX_PLAYERS_PER_MATCH || 4,
};
