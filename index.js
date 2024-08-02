const config = require('./config');
const Server = require('./classes/Server');

new Server(config).init();
