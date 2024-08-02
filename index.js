const config = require('./config');
const Server = require('./classes/Server');

const io = require('socket.io')();
new Server(io, config).init();
