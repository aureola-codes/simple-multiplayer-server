const { expect } = require('chai');

const Match = require('../../src/models/Match');

describe('Match', function () {
    let match;

    beforeEach(function () {
        match = new Match('1', 'Test Match', 'password', true, 4, { gameType: 'deathmatch' });
    });

    describe('constructor', function () {
        it('should initialize a Match instance with the correct properties', function () {
            expect(match.id).to.equal('1');
            expect(match.name).to.equal('Test Match');
            expect(match.password).to.equal('password');
            expect(match.isPrivate).to.be.true;
            expect(match.isProtected).to.be.true;
            expect(match.numPlayers).to.equal(0);
            expect(match.maxPlayers).to.equal(4);
            expect(match.room).to.equal('match_1');
            expect(match.players).to.be.an('array').that.is.empty;
            expect(match.blockedPlayers).to.be.an('array').that.is.empty;
            expect(match.data).to.deep.equal({ gameType: 'deathmatch' });
        });

        it('should set isProtected to false if no password is provided', function () {
            const publicMatch = new Match('2', 'Public Match');
            expect(publicMatch.isProtected).to.be.false;
        });
    });

    describe('addPlayer', function () {
        it('should add a player and increase numPlayers', function () {
            match.addPlayer({ id: 'player1', name: 'Player 1' });
            expect(match.numPlayers).to.equal(1);
            expect(match.players).to.have.lengthOf(1);
            expect(match.players[0]).to.deep.equal({ id: 'player1', name: 'Player 1' });
        });

        it('should set the owner to the first player that joins', function () {
            match.addPlayer({ id: 'player1', name: 'Player 1' });
            expect(match.owner).to.equal('player1');
        });
    });

    describe('removePlayer', function () {
        it('should remove a player and decrease numPlayers', function () {
            match.addPlayer({ id: 'player1', name: 'Player 1' });
            match.removePlayer('player1');
            expect(match.numPlayers).to.equal(0);
            expect(match.players).to.have.lengthOf(0);
        });
    });

    describe('kickPlayer', function () {
        it('should block and remove a player', function () {
            match.addPlayer({ id: 'player1', name: 'Player 1' });
            match.kickPlayer('player1');
            expect(match.isBlocked('player1')).to.be.true;
            expect(match.numPlayers).to.equal(0);
            expect(match.players).to.have.lengthOf(0);
        });
    });

    describe('isBlocked', function () {
        it('should return true if player is blocked', function () {
            match.kickPlayer('player1');
            expect(match.isBlocked('player1')).to.be.true;
        });

        it('should return false if player is not blocked', function () {
            expect(match.isBlocked('player2')).to.be.false;
        });
    });

    describe('isVisible', function () {
        it('should return true if match is not private', function () {
            const publicMatch = new Match('2', 'Public Match', '', false);
            expect(publicMatch.isVisible()).to.be.true;
        });

        it('should return false if match is private', function () {
            expect(match.isVisible()).to.be.false;
        });
    });

    describe('isOwner', function () {
        it('should return true if player is the owner', function () {
            match.addPlayer({ id: 'player1', name: 'Player 1' });
            expect(match.isOwner('player1')).to.be.true;
        });

        it('should return false if player is not the owner', function () {
            match.addPlayer({ id: 'player1', name: 'Player 1' });
            expect(match.isOwner('player2')).to.be.false;
        });
    });

    describe('hasPlayer', function () {
        it('should return true if player is in the match', function () {
            match.addPlayer({ id: 'player1', name: 'Player 1' });
            expect(match.hasPlayer('player1')).to.be.true;
        });

        it('should return false if player is not in the match', function () {
            expect(match.hasPlayer('player2')).to.be.false;
        });
    });

    describe('getMinResponse', function () {
        it('should return the minimal response', function () {
            const expectedResponse = {
                id: '1',
                name: 'Test Match',
                isPrivate: true,
                isProtected: true,
                numPlayers: 0,
                maxPlayers: 4
            };
            expect(match.getMinResponse()).to.deep.equal(expectedResponse);
        });
    });

    describe('getFullResponse', function () {
        it('should return the full response', function () {
            const expectedResponse = {
                id: '1',
                name: 'Test Match',
                data: { gameType: 'deathmatch' },
                isPrivate: true,
                isProtected: true,
                numPlayers: 0,
                maxPlayers: 4,
                players: []
            };
            expect(match.getFullResponse()).to.deep.equal(expectedResponse);
        });
    });
});
