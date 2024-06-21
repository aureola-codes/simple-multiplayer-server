const dotenv = require('dotenv');
dotenv.config();

module.exports = {
    // Server
    serverPort: process.env.SERVER_PORT || 9000,
    maxPlayers: process.env.MAX_PLAYERS || 100,
    maxPlayersPerMatch: process.env.MAX_PLAYERS_PER_MATCH || 4,

    // Admin UI
    adminEnabled: process.env.ADMINUI_ENABLED || false,
    adminMode: process.env.ADMINUI_MODE || 'development',
    adminPort: process.env.ADMINUI_PORT || 3000,
    adminUsername: process.env.ADMINUI_USERNAME || 'admin',
    adminPassword: process.env.ADMINUI_PASSWORD || 'admin',
};
