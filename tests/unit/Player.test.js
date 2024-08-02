const { expect } = require('chai');
const Player = require('../../src/models/Player');

describe('Player', function () {
    let player;

    beforeEach(function () {
        player = new Player('1', 'Test Player', { score: 100 });
    });

    describe('constructor', function () {
        it('should initialize a Player instance with the correct properties', function () {
            expect(player.id).to.equal('1');
            expect(player.name).to.equal('Test Player');
            expect(player.data).to.deep.equal({ score: 100 });
            expect(player.isReady).to.be.false;
        });

        it('should initialize a Player instance with default data if no data is provided', function () {
            const defaultPlayer = new Player('2', 'Default Player');
            expect(defaultPlayer.id).to.equal('2');
            expect(defaultPlayer.name).to.equal('Default Player');
            expect(defaultPlayer.data).to.deep.equal({});
            expect(defaultPlayer.isReady).to.be.false;
        });
    });

    describe('getMinResponse', function () {
        it('should return the minimal response', function () {
            const expectedResponse = {
                id: '1',
                name: 'Test Player'
            };
            expect(player.getMinResponse()).to.deep.equal(expectedResponse);
        });
    });

    describe('getFullResponse', function () {
        it('should return the full response', function () {
            const expectedResponse = {
                id: '1',
                name: 'Test Player',
                data: { score: 100 },
                isReady: false
            };
            expect(player.getFullResponse()).to.deep.equal(expectedResponse);
        });
    });
});
