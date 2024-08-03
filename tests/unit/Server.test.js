const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;

const Server = require('../../src/classes/Server');
const Connection = require('../../src/classes/Connection');

describe('Server', () => {
    let ioMock, config, server, socketMock, playerMock;

    beforeEach(() => {
        ioMock = {
            on: sinon.stub(),
            listen: sinon.stub(),
            to: sinon.stub().returns({
                emit: sinon.stub()
            }),
            sockets: {
                sockets: new Map()
            }
        };
        config = {
            port: 3000,
            chatMinLength: 1,
            chatMaxLength: 200,
            maxPlayers: 100,
            maxMatches: 50,
            authToken: ''
        };
        server = new Server(ioMock, config);

        socketMock = {
            id: 'socket-id',
            handshake: { auth: {} },
            emit: sinon.stub(),
            disconnect: sinon.stub(),
            join: sinon.stub(),
            leave: sinon.stub()
        };

        playerMock = { id: 'player-id' };

        sinon.stub(server._players, 'add').returns(playerMock);
        sinon.stub(server._players, 'remove');
        sinon.stub(server._matches, 'add').returns({});
        sinon.stub(server._matches, 'remove');
        sinon.stub(server._matches, 'find').returns({});
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('init', () => {
        it('should start the server and listen on the specified port', () => {
            server.init();
            expect(ioMock.on.calledWith('connection')).to.be.true;
            expect(ioMock.listen.calledWith(config.port)).to.be.true;
        });

        it('should handle a new connection', () => {
            const authenticateStub = sinon.stub(server, 'authenticate').returns(true);
            const createPlayerStub = sinon.stub(server, 'createPlayer').returns(playerMock);
            const connectionStub = sinon.stub(Connection.prototype, 'init');

            server.init();
            const connectionCallback = ioMock.on.getCall(0).args[1];
            connectionCallback(socketMock);

            expect(authenticateStub.calledWith(socketMock)).to.be.true;
            expect(createPlayerStub.calledWith(socketMock)).to.be.true;
            expect(connectionStub.calledOnce).to.be.true;
        });
    });

    describe('emitChatMessage', () => {
        it('should emit a chat message', () => {
            const message = 'Hello World';
            server.emitChatMessage('room', message, playerMock);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('chat-message', {
                message,
                player: playerMock
            })).to.be.true;
        });

        it('should drop messages that are too short', () => {
            const message = 'a'.repeat(config.chatMinLength - 1);
            server.emitChatMessage('room', message, playerMock);
            expect(ioMock.to.calledWith('room')).to.be.false;
            expect(ioMock.to().emit.calledWith('chat-message', {
                message: message.substring(0, config.chatMaxLength - 3) + '...',
                player: playerMock
            })).to.be.false;
        });

        it('should truncate messages that are too long', () => {
            const message = 'a'.repeat(config.chatMaxLength + 1);
            server.emitChatMessage('room', message, playerMock);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('chat-message', {
                message: message.substring(0, config.chatMaxLength - 3) + '...',
                player: playerMock
            })).to.be.true;
        });
    });

    describe('authenticate', () => {
        it('should authenticate a socket with a valid token', () => {
            config.authToken = 'valid-token';
            socketMock.handshake.auth.token = 'valid-token';
            const result = server.authenticate(socketMock);
            expect(result).to.be.true;
        });

        it('should not authenticate a socket with an invalid token', () => {
            config.authToken = 'valid-token';
            socketMock.handshake.auth.token = 'invalid-token';
            const result = server.authenticate(socketMock);
            expect(result).to.be.false;
            expect(socketMock.emit.calledWith('error', 'Invalid authentication token.')).to.be.true;
            expect(socketMock.disconnect.calledOnce).to.be.true;
        });
    });

    describe('createPlayer', () => {
        it('should create a new player', () => {
            const result = server.createPlayer(socketMock);
            expect(result).to.equal(playerMock);
            expect(server._players.add.calledWith(socketMock.id, 'Player')).to.be.true;
        });

        it('should handle errors when creating a player', () => {
            server._players.add.throws(new Error('Test Error'));
            const result = server.createPlayer(socketMock);
            expect(result).to.be.undefined;
            expect(socketMock.emit.calledWith('error', 'Test Error')).to.be.true;
            expect(socketMock.disconnect.calledOnce).to.be.true;
        });
    });

    describe('removePlayer', () => {
        it('should remove a player', () => {
            server.removePlayer(playerMock);
            expect(server._players.remove.calledWith(playerMock.id)).to.be.true;
        });
    });

    describe('emitPlayerJoined', () => {
        it('should emit a player joined message', () => {
            server.emitPlayerJoined('room', playerMock);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('player-joined', playerMock)).to.be.true;
        });
    });

    describe('emitPlayerLeft', () => {
        it('should emit a player left message', () => {
            server.emitPlayerLeft('room', playerMock);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('player-left', playerMock)).to.be.true;
        });
    });

    describe('emitPlayerKicked', () => {
        it('should emit a player kicked message', () => {
            server.emitPlayerKicked('room', playerMock);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('player-kicked', playerMock)).to.be.true;
        });
    });

    describe('emitPlayerUpdated', () => {
        it('should emit a player updated message', () => {
            server.emitPlayerUpdated('room', playerMock);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('player-updated', playerMock)).to.be.true;
        });
    });

    describe('emitMatchStarted', () => {
        it('should emit a match started message', () => {
            server.emitMatchStarted('room');
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('match-started')).to.be.true;
        });
    });

    describe('emitMatchFinished', () => {
        it('should emit a match finished message', () => {
            server.emitMatchFinished('room');
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('match-finished')).to.be.true;
        });
    });

    describe('emitTick', () => {
        it('should emit a tick message', () => {
            const tickData = { tick: 'data' };
            server.emitTick('room', tickData);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('tick', tickData)).to.be.true;
        });
    });

    describe('emitTock', () => {
        it('should emit a tock message', () => {
            const tockData = { tock: 'data' };
            server.emitTock('room', tockData);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('tock', tockData)).to.be.true;
        });
    });

    describe('emitMatchesUpdated', () => {
        it('should emit a matches updated message with visible matches', () => {
            const visibleMatches = ['match1', 'match2'];
            sinon.stub(server._matches, 'getListVisible').returns(visibleMatches);

            server.emitMatchesUpdated('lobby');

            expect(ioMock.to.calledWith('lobby')).to.be.true;
            expect(ioMock.to().emit.calledWith('matches-updated', { matches: visibleMatches })).to.be.true;
        });

        it('should default to the "lobby" room if no room is specified', () => {
            const visibleMatches = ['match1', 'match2'];
            sinon.stub(server._matches, 'getListVisible').returns(visibleMatches);

            server.emitMatchesUpdated();

            expect(ioMock.to.calledWith('lobby')).to.be.true;
            expect(ioMock.to().emit.calledWith('matches-updated', { matches: visibleMatches })).to.be.true;
        });
    });

    describe('createMatch', () => {
        it('should create a new match and emit matches updated', () => {
            const matchData = { match: 'data' };
            const matchMock = {
                isVisible: sinon.stub().returns(true)
            };
            server._matches.add.returns(matchMock);
            const result = server.createMatch(matchData, playerMock);
            expect(result).to.equal(matchMock);
            expect(server._matches.add.calledWith(matchData, playerMock)).to.be.true;
            expect(ioMock.to.calledWith('lobby')).to.be.true;
            expect(ioMock.to().emit.calledWith('matches-updated', { matches: sinon.match.any })).to.be.true;
        });
    });

    describe('cancelMatch', () => {
        it('should cancel a match and emit match canceled', () => {
            const matchMock = {
                room: 'room',
                players: [{ id: 'player1' }, { id: 'player2' }]
            };
            const findSocketStub = sinon.stub(server, 'findSocket').returns(socketMock);
            const resetSocketStub = sinon.stub(server, 'resetSocket');

            server.cancelMatch(matchMock);
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('match-canceled')).to.be.true;
            expect(server._matches.remove.calledWith(matchMock.id)).to.be.true;
            expect(resetSocketStub.calledTwice).to.be.true;
        });
    });

    describe('joinMatch', () => {
        it('should allow a player to join a match', () => {
            const matchMock = {
                id: 'match-id',
                password: '',
                numPlayers: 0,
                maxPlayers: 10,
                blockedPlayers: [],
                addPlayer: sinon.stub(),
                room: 'room',
                isVisible: sinon.stub().returns(true)
            };
            server._matches.find.returns(matchMock);

            const result = server.joinMatch('match-id', '', playerMock);
            expect(result).to.equal(matchMock);
            expect(matchMock.addPlayer.calledWith(playerMock)).to.be.true;
            expect(ioMock.to.calledWith('room')).to.be.true;
            expect(ioMock.to().emit.calledWith('player-joined', playerMock)).to.be.true;
            expect(ioMock.to.calledWith('lobby')).to.be.true;
            expect(ioMock.to().emit.calledWith('matches-updated', { matches: sinon.match.any })).to.be.true;
        });

        it('should throw an error if match not found', () => {
            server._matches.find.returns(null);
            expect(() => server.joinMatch('match-id', '', playerMock)).to.throw('Match not found.');
        });

        it('should throw an error if password mismatch', () => {
            const matchMock = { password: 'password' };
            server._matches.find.returns(matchMock);
            expect(() => server.joinMatch('match-id', 'wrong-password', playerMock)).to.throw('Match password mismatch.');
        });

        it('should throw an error if match is full', () => {
            const matchMock = { numPlayers: 10, maxPlayers: 10 };
            server._matches.find.returns(matchMock);
            expect(() => server.joinMatch('match-id', '', playerMock)).to.throw('Match full.');
        });

        it('should throw an error if player is blocked', () => {
            const matchMock = { blockedPlayers: ['player-id'] };
            server._matches.find.returns(matchMock);
            expect(() => server.joinMatch('match-id', '', playerMock)).to.throw('Player blocked.');
        });
    });

    describe('removeMatch', () => {
        it('should reset player sockets and remove the match', () => {
            const matchMock = {
                id: 'match-id',
                players: [{ id: 'player1' }, { id: 'player2' }],
                isVisible: true
            };

            const player1SocketMock = {
                id: 'player1',
                join: sinon.stub(),
                leave: sinon.stub(),
                _match: { room: 'room' },
                _player: { isReady: true }
            };
            const player2SocketMock = {
                id: 'player2',
                join: sinon.stub(),
                leave: sinon.stub(),
                _match: { room: 'room' },
                _player: { isReady: true }
            };

            sinon.stub(server, 'findSocket')
                .withArgs('player1').returns(player1SocketMock)
                .withArgs('player2').returns(player2SocketMock);

            const resetSocketStub = sinon.stub(server, 'resetSocket');

            server.removeMatch(matchMock);

            expect(resetSocketStub.calledTwice).to.be.true;
            expect(resetSocketStub.calledWith(player1SocketMock)).to.be.true;
            expect(resetSocketStub.calledWith(player2SocketMock)).to.be.true;

            expect(server._matches.remove.calledWith(matchMock.id)).to.be.true;
            expect(ioMock.to.calledWith('lobby')).to.be.true;
            expect(ioMock.to().emit.calledWith('matches-updated', { matches: sinon.match.any })).to.be.true;
        });

        it('should not emit matches updated if match is not visible', () => {
            const matchMock = {
                id: 'match-id',
                players: [{ id: 'player1' }, { id: 'player2' }],
                isVisible: false
            };

            sinon.stub(server, 'findSocket').returns(null);
            const resetSocketStub = sinon.stub(server, 'resetSocket');

            server.removeMatch(matchMock);

            expect(resetSocketStub.called).to.be.false;
            expect(server._matches.remove.calledWith(matchMock.id)).to.be.true;
            expect(ioMock.to.calledWith('lobby')).to.be.false;
            expect(ioMock.to().emit.calledWith('matches-updated', { matches: sinon.match.any })).to.be.false;
        });
    });

    describe('findSocket', () => {
        it('should find a socket by id', () => {
            ioMock.sockets.sockets.set('socket-id', socketMock);
            const result = server.findSocket('socket-id');
            expect(result).to.equal(socketMock);
        });

        it('should return null if socket not found', () => {
            const result = server.findSocket('unknown-id');
            expect(result).to.be.null;
        });
    });

    describe('resetSocket', () => {
        it('should reset a socket to lobby', () => {
            socketMock._match = { room: 'room' };
            socketMock._player = { isReady: true };

            server.resetSocket(socketMock);
            expect(socketMock.join.calledWith('lobby')).to.be.true;
            expect(socketMock.leave.calledWith('room')).to.be.true;
            expect(socketMock._match).to.be.null;
            expect(socketMock._player.isReady).to.be.false;
            expect(ioMock.to.calledWith(socketMock.id)).to.be.true;
            expect(ioMock.to().emit.calledWith('matches-updated', { matches: sinon.match.any })).to.be.true;
        });
    });

});
