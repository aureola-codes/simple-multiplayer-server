const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    serverPort: process.env.SERVER_PORT || 9000,
    authToken: process.env.AUTH_TOKEN || '',
    maxPlayers: process.env.MAX_PLAYERS || 1000,
    maxMatches: process.env.MAX_MATCHES || 100,
    maxPlayersPerMatch: process.env.MAX_PLAYERS_PER_MATCH || 10,
    chatMinLength: process.env.CHAT_MIN_LENGTH || 1,
    chatMaxLength: process.env.CHAT_MAX_LENGTH || 256,
    matchNameMinLength: process.env.MATCH_NAME_MIN_LENGTH || 1,
    matchNameMaxLength: process.env.MATCH_NAME_MAX_LENGTH || 32,
    matchPasswordMinLength: process.env.MATCH_PASSWORD_MIN_LENGTH || 8,
    matchPasswordMaxLength: process.env.MATCH_PASSWORD_MAX_LENGTH || 32,
    playerNameMinLength: process.env.PLAYER_NAME_MIN_LENGTH || 1,
    playerNameMaxLength: process.env.PLAYER_NAME_MAX_LENGTH || 32,
};
