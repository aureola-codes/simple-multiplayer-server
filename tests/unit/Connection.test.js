const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;
const Connection = require('../../src/classes/Connection');

describe('Connection', () => {
    let socketMock, playerMock, serverMock, connection;

    beforeEach(() => {
        socketMock = {
            id: 'socket-id',
            on: sinon.stub(),
            emit: sinon.stub(),
            join: sinon.stub(),
            leave: sinon.stub(),
            _match: null,
            _player: {
                id: 'player-id',
                getFullResponse: sinon.stub().returns({}),
                getMinResponse: sinon.stub().returns({})
            }
        };

        playerMock = socketMock._player;

        serverMock = {
            emitChatMessage: sinon.stub(),
            emitMatchesUpdated: sinon.stub(),
            createMatch: sinon.stub(),
            joinMatch: sinon.stub(),
            resetSocket: sinon.stub(),
            cancelMatch: sinon.stub(),
            removePlayer: sinon.stub(),
            emitPlayerLeft: sinon.stub(),
            emitMatchStarted: sinon.stub(),
            emitMatchFinished: sinon.stub(),
            emitPlayerKicked: sinon.stub(),
            emitPlayerUpdated: sinon.stub(),
            findSocket: sinon.stub(),
            emitTick: sinon.stub(),
            emitTock: sinon.stub()
        };

        connection = new Connection(socketMock, playerMock, serverMock);
    });

    describe('Properties', () => {
        it('should get the correct room', () => {
            expect(connection.room).to.equal('lobby');
            connection._socket._match = { room: 'room-id' };
            expect(connection.room).to.equal('room-id');
        });

        it('should get the correct player', () => {
            expect(connection.player).to.equal(playerMock);
        });

        it('should get the full player data', () => {
            expect(connection.playerDataFull).to.deep.equal({});
        });

        it('should get the minimum player data', () => {
            expect(connection.playerDataMin).to.deep.equal({});
        });

        it('should get the correct match', () => {
            expect(connection.match).to.be.null;
            connection._socket._match = { id: 'match-id' };
            expect(connection.match).to.deep.equal({ id: 'match-id' });
        });

        it('should set the correct match', () => {
            connection.match = { id: 'match-id' };
            expect(connection._socket._match).to.deep.equal({ id: 'match-id' });
        });

        it('should get the full match data', () => {
            connection._socket._match = {
                getFullResponse: sinon.stub().returns({ match: 'data' })
            };
            expect(connection.matchDataFull).to.deep.equal({ match: 'data' });
        });

        it('should get the minimum match data', () => {
            connection._socket._match = {
                getMinResponse: sinon.stub().returns({ match: 'data' })
            };
            expect(connection.matchDataMin).to.deep.equal({ match: 'data' });
        });
    });

    describe('init', () => {
        it('should initialize connection and emit initial data', () => {
            connection.init();
            expect(socketMock.emit.calledWith('init', { player: {} })).to.be.true;
            expect(socketMock.join.calledWith('lobby')).to.be.true;
            expect(serverMock.emitMatchesUpdated.calledWith(socketMock.id)).to.be.true;
        });
    });

    describe('sendChatMessage', () => {
        it('should call emitChatMessage with correct parameters', () => {
            connection.sendChatMessage('Hello World');
            expect(serverMock.emitChatMessage.calledWith('lobby', 'Hello World', {})).to.be.true;
        });
    });

    describe('createMatch', () => {
        it('should allow a player to create a match', () => {
            const matchMock = { room: 'room-id', getFullResponse: sinon.stub().returns({}) };
            serverMock.createMatch.returns(matchMock);

            const matchDataJson = JSON.stringify({ name: 'match-name' });
            const callback = sinon.stub();

            connection.createMatch(matchDataJson, callback);

            expect(serverMock.createMatch.calledWith({ name: 'match-name' }, playerMock)).to.be.true;
            expect(connection.match).to.equal(matchMock);
            expect(socketMock.join.calledWith('room-id')).to.be.true;
            expect(callback.calledWith({})).to.be.true;
        });

        it('should handle JSON parsing errors', () => {
            const matchDataJson = 'invalid-json';
            const callback = sinon.stub();

            connection.createMatch(matchDataJson, callback);

            expect(callback.calledWith('ERROR: Unexpected token \'i\', "invalid-json" is not valid JSON')).to.be.true;
        });

        it('should handle server errors', () => {
            serverMock.createMatch.throws(new Error('Server error'));

            const matchDataJson = JSON.stringify({ name: 'match-name' });
            const callback = sinon.stub();

            connection.createMatch(matchDataJson, callback);

            expect(callback.calledWith('ERROR: Server error')).to.be.true;
        });

        it('should not allow a player to create a match if already in one', () => {
            connection.match = { id: 'existing-match' };
            const matchDataJson = JSON.stringify({ name: 'match-name' });
            const callback = sinon.stub();

            connection.createMatch(matchDataJson, callback);

            expect(callback.calledWith('ERROR: Player already joined a match.')).to.be.true;
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
                isVisible: sinon.stub().returns(true),
                getFullResponse: sinon.stub().returns({})
            };
            serverMock.joinMatch.returns(matchMock);

            const joinDataJson = JSON.stringify({ match: 'match-id', password: '' });
            const callback = sinon.stub();

            connection.joinMatch(joinDataJson, callback);

            expect(serverMock.joinMatch.calledWith('match-id', '', playerMock)).to.be.true;
            expect(connection.match).to.equal(matchMock);
            expect(socketMock.join.calledWith('room')).to.be.true;
            expect(callback.calledWith(matchMock.getFullResponse())).to.be.true;
        });

        it('should throw an error if match not found', () => {
            serverMock.joinMatch.throws(new Error('Match not found.'));
            const joinDataJson = JSON.stringify({ match: 'match-id', password: '' });
            const callback = sinon.stub();

            connection.joinMatch(joinDataJson, callback);

            expect(callback.calledWith('ERROR: Match not found.')).to.be.true;
        });

        it('should throw an error if password mismatch', () => {
            serverMock.joinMatch.throws(new Error('Match password mismatch.'));
            const joinDataJson = JSON.stringify({ match: 'match-id', password: 'wrong-password' });
            const callback = sinon.stub();

            connection.joinMatch(joinDataJson, callback);

            expect(callback.calledWith('ERROR: Match password mismatch.')).to.be.true;
        });

        it('should throw an error if match is full', () => {
            serverMock.joinMatch.throws(new Error('Match full.'));
            const joinDataJson = JSON.stringify({ match: 'match-id', password: '' });
            const callback = sinon.stub();

            connection.joinMatch(joinDataJson, callback);

            expect(callback.calledWith('ERROR: Match full.')).to.be.true;
        });

        it('should throw an error if player is blocked', () => {
            serverMock.joinMatch.throws(new Error('Player blocked.'));
            const joinDataJson = JSON.stringify({ match: 'match-id', password: '' });
            const callback = sinon.stub();

            connection.joinMatch(joinDataJson, callback);

            expect(callback.calledWith('ERROR: Player blocked.')).to.be.true;
        });

        it('should throw an error if match password length is too long', () => {
            const config = { matchPasswordMinLength: 6, matchPasswordMaxLength: 20 };
            const longPassword = 'a'.repeat(config.matchPasswordMaxLength + 1);
            const matchMock = { id: 'match-id', password: longPassword };
            serverMock.joinMatch.throws(new Error(`Match password must be between ${config.matchPasswordMinLength} and ${config.matchPasswordMaxLength} characters.`));
            const joinDataJson = JSON.stringify({ match: 'match-id', password: longPassword });
            const callback = sinon.stub();

            connection.joinMatch(joinDataJson, callback);

            expect(callback.calledWith(`ERROR: Match password must be between ${config.matchPasswordMinLength} and ${config.matchPasswordMaxLength} characters.`)).to.be.true;
        });

        it('should not allow a player to join a match if already in one', () => {
            connection.match = { id: 'existing-match' };
            const joinDataJson = JSON.stringify({ match: 'match-id', password: '' });
            const callback = sinon.stub();

            connection.joinMatch(joinDataJson, callback);

            expect(callback.calledWith('ERROR: Player already joined a match.')).to.be.true;
        });
    });

    describe('leaveMatch', () => {
        it('should allow a player to leave a match', () => {
            const matchMock = {
                id: 'match-id',
                isVisible: sinon.stub().returns(true),
                removePlayer: sinon.stub(),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(false);

            connection.leaveMatch();

            expect(matchMock.removePlayer.calledWith(playerMock)).to.be.true;
            expect(serverMock.resetSocket.calledWith(socketMock)).to.be.true;
            expect(serverMock.emitPlayerLeft.calledWith('room-id', {})).to.be.true;
            expect(serverMock.emitMatchesUpdated.calledOnce).to.be.true;
        });

        it('should cancel the match if the player is the owner', () => {
            const matchMock = {
                id: 'match-id',
                isVisible: sinon.stub().returns(true),
                removePlayer: sinon.stub(),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(true);

            connection.leaveMatch();

            expect(serverMock.cancelMatch.calledWith(matchMock)).to.be.true;
        });

        it('should log a message if the player is not in a match', () => {
            const consoleStub = sinon.stub(console, 'log');

            connection.leaveMatch();

            expect(consoleStub.calledWith(`Player ${playerMock.id} is not in a match.`)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('startMatch', () => {
        it('should start a match if the player is the owner', () => {
            const matchMock = {
                id: 'match-id',
                isStarted: false,
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(true);

            connection.startMatch();

            expect(matchMock.isStarted).to.be.true;
            expect(serverMock.emitMatchStarted.calledWith('room-id')).to.be.true;
            expect(serverMock.emitMatchesUpdated.calledOnce).to.be.true;
        });

        it('should not start a match if the player is not the owner', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = {
                id: 'match-id',
                isStarted: false,
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(false);

            connection.startMatch();

            expect(matchMock.isStarted).to.be.false;
            expect(consoleStub.calledWith(`Player ${playerMock.id} tried to start match ${matchMock.id} without permission.`)).to.be.true;

            consoleStub.restore();
        });

        it('should not start a match if it is already started', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = {
                id: 'match-id',
                isStarted: true,
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(true);

            connection.startMatch();

            expect(consoleStub.calledWith(`Match ${matchMock.id} is already started.`)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('finishMatch', () => {
        it('should finish a match if the player is the owner', () => {
            const matchMock = {
                id: 'match-id',
                isStarted: true,
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(true);

            connection.finishMatch();

            expect(serverMock.emitMatchFinished.calledWith('room-id')).to.be.true;
            expect(serverMock.emitMatchesUpdated.calledOnce).to.be.true;
        });

        it('should not finish a match if the player is not the owner', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = {
                id: 'match-id',
                isStarted: true,
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(false);

            connection.finishMatch();

            expect(consoleStub.calledWith(`Player ${playerMock.id} tried to finish match ${matchMock.id} without permission.`)).to.be.true;

            consoleStub.restore();
        });

        it('should not finish a match if it is not started', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = {
                id: 'match-id',
                isStarted: false,
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;
            connection.match.isOwner = sinon.stub().returns(true);

            connection.finishMatch();

            expect(consoleStub.calledWith(`Match ${matchMock.id} is not started.`)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('kickPlayer', () => {
        it('should kick a player from the match if the player is the owner', () => {
            const matchMock = {
                id: 'match-id',
                hasPlayer: sinon.stub().returns(true),
                isOwner: sinon.stub().returns(true),
                kickPlayer: sinon.stub(),
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;

            const otherPlayerId = 'other-player-id';
            const otherSocketMock = {
                id: otherPlayerId,
                emit: sinon.stub(),
                join: sinon.stub(),
                leave: sinon.stub(),
                _player: {
                    id: otherPlayerId,
                    getMinResponse: sinon.stub().returns({})
                }
            };
            serverMock.findSocket.returns(otherSocketMock);

            connection.kickPlayer(otherPlayerId);

            expect(matchMock.kickPlayer.calledWith(otherPlayerId)).to.be.true;
            expect(serverMock.resetSocket.calledWith(otherSocketMock)).to.be.true;
            expect(serverMock.emitPlayerKicked.calledWith('room-id', {})).to.be.true;
            expect(serverMock.emitMatchesUpdated.calledOnce).to.be.true;
        });

        it('should not kick a player if the player is not the owner', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = {
                id: 'match-id',
                hasPlayer: sinon.stub().returns(true),
                isOwner: sinon.stub().returns(false),
                kickPlayer: sinon.stub(),
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;

            connection.kickPlayer('other-player-id');

            expect(consoleStub.calledWith(`Player ${playerMock.id} tried to kick player other-player-id without permission.`)).to.be.true;

            consoleStub.restore();
        });

        it('should not kick a player who is not in the match', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = {
                id: 'match-id',
                hasPlayer: sinon.stub().returns(false),
                isOwner: sinon.stub().returns(true),
                kickPlayer: sinon.stub(),
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;

            connection.kickPlayer('other-player-id');

            expect(consoleStub.calledWith(`Player other-player-id is not in match ${matchMock.id}.`)).to.be.true;

            consoleStub.restore();
        });

        it('should not allow a player to kick themselves', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = {
                id: 'match-id',
                hasPlayer: sinon.stub().returns(true),
                isOwner: sinon.stub().returns(true),
                kickPlayer: sinon.stub(),
                isVisible: sinon.stub().returns(true),
                room: 'room-id'
            };
            connection.match = matchMock;

            connection.kickPlayer(playerMock.id);

            expect(consoleStub.calledWith(`Player ${playerMock.id} cannot kick self.`)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('updatePlayer', () => {
        it('should update the player data', () => {
            const playerData = {
                name: 'new-name',
                data: { score: 10 },
                isReady: true
            };
            const playerDataJson = JSON.stringify(playerData);

            connection.updatePlayer(playerDataJson);

            expect(playerMock.name).to.equal('new-name');
            expect(playerMock.data).to.deep.equal({ score: 10 });
            expect(playerMock.isReady).to.be.true;
            expect(serverMock.emitPlayerUpdated.calledWith('lobby', {})).to.be.true;
        });

        it('should handle JSON parsing errors', () => {
            const consoleStub = sinon.stub(console, 'error');
            const playerDataJson = 'invalid-json';

            connection.updatePlayer(playerDataJson);

            expect(consoleStub.calledWith('ERROR: Invalid data received.', playerDataJson)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('tick', () => {
        it('should send a tick if the player is a match guest', () => {
            const matchMock = { id: 'match-id', owner: 'owner-id', isOwner: sinon.stub().returns(false) };
            connection.match = matchMock;

            const tickData = { tick: 'data' };
            connection.tick(tickData);

            expect(serverMock.emitTick.calledWith('owner-id', tickData)).to.be.true;
        });

        it('should not send a tick if the player is not a match guest', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = { id: 'match-id', owner: 'owner-id', isOwner: sinon.stub().returns(true) };
            connection.match = matchMock;

            const tickData = { tick: 'data' };
            connection.tick(tickData);

            expect(consoleStub.calledWith(`Player ${playerMock.id} tried to send tick without permission.`)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('tock', () => {
        it('should send a tock if the player is the match owner', () => {
            const matchMock = { id: 'match-id', room: 'room-id', isOwner: sinon.stub().returns(true) };
            connection.match = matchMock;

            const tockData = { tock: 'data' };
            connection.tock(tockData);

            expect(serverMock.emitTock.calledWith('room-id', tockData)).to.be.true;
        });

        it('should not send a tock if the player is not the match owner', () => {
            const consoleStub = sinon.stub(console, 'warn');
            const matchMock = { id: 'match-id', room: 'room-id', isOwner: sinon.stub().returns(false) };
            connection.match = matchMock;

            const tockData = { tock: 'data' };
            connection.tock(tockData);

            expect(consoleStub.calledWith(`Player ${playerMock.id} tried to send tock without permission.`)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('disconnect', () => {
        it('should handle player disconnection', () => {
            const consoleStub = sinon.stub(console, 'log');
            const reason = 'disconnect-reason';
            connection.leaveMatch = sinon.stub();

            connection.disconnect(reason);

            expect(connection.leaveMatch.calledOnce).to.be.true;
            expect(serverMock.removePlayer.calledWith(playerMock)).to.be.true;
            expect(consoleStub.calledWith(`Player ${playerMock.id} disconnected. Reason: ${reason}`)).to.be.true;

            consoleStub.restore();
        });
    });

    describe('changeRoom', () => {
        it('should change the room for the player', () => {
            connection._socket._match = { room: 'old-room' };

            connection.changeRoom('new-room');

            expect(socketMock.leave.calledWith('old-room')).to.be.true;
            expect(socketMock.join.calledWith('new-room')).to.be.true;
        });
    });

    describe('inMatch', () => {
        it('should return true if the player is in a match', () => {
            connection.match = { id: 'match-id' };
            expect(connection.inMatch()).to.be.true;
        });

        it('should return false if the player is not in a match', () => {
            connection.match = null;
            expect(connection.inMatch()).to.be.false;
        });
    });

    describe('isMatchOwner', () => {
        it('should return true if the player is the match owner', () => {
            const matchMock = { id: 'match-id', isOwner: sinon.stub().returns(true) };
            connection.match = matchMock;
            expect(connection.isMatchOwner()).to.be.true;
        });

        it('should return false if the player is not the match owner', () => {
            const matchMock = { id: 'match-id', isOwner: sinon.stub().returns(false) };
            connection.match = matchMock;
            expect(connection.isMatchOwner()).to.be.false;
        });
    });

    describe('isMatchGuest', () => {
        it('should return true if the player is a match guest', () => {
            const matchMock = { id: 'match-id', isOwner: sinon.stub().returns(false) };
            connection.match = matchMock;
            expect(connection.isMatchGuest()).to.be.true;
        });

        it('should return false if the player is the match owner', () => {
            const matchMock = { id: 'match-id', isOwner: sinon.stub().returns(true) };
            connection.match = matchMock;
            expect(connection.isMatchGuest()).to.be.false;
        });
    });
});
