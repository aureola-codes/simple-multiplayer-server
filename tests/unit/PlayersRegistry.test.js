const { expect } = require('chai');

const Player = require('../../src/models/Player');
const PlayersRegistry = require('../../src/registries/PlayersRegistry');

describe('PlayersRegistry', function () {
    let config;
    let playersRegistry;

    beforeEach(function () {
        config = {
            maxPlayers: 3,
            playerNameMinLength: 3,
            playerNameMaxLength: 10
        };
        playersRegistry = new PlayersRegistry(config);
    });

    describe('add', function () {
        it('should add a player successfully', function () {
            const player = playersRegistry.add('1', 'Alice');
            expect(player).to.be.an.instanceof(Player);
            expect(player.id).to.equal('1');
            expect(player.name).to.equal('Alice');
            expect(playersRegistry.numPlayers).to.equal(1);
        });

        it('should throw an error when adding a player with a name that is too short', function () {
            expect(() => playersRegistry.add('1', 'Al')).to.throw(Error, 'Player name must be between 3 and 10 characters.');
        });

        it('should throw an error when adding a player with a name that is too long', function () {
            expect(() => playersRegistry.add('1', 'Aliceeeeeee')).to.throw(Error, 'Player name must be between 3 and 10 characters.');
        });

        it('should throw an error when adding a player with an existing id', function () {
            playersRegistry.add('1', 'Alice');
            expect(() => playersRegistry.add('1', 'Bob')).to.throw(Error, 'Player already exists.');
        });

        it('should throw an error when adding a player beyond the max limit', function () {
            playersRegistry.add('1', 'Alice');
            playersRegistry.add('2', 'Bob');
            playersRegistry.add('3', 'Charlie');
            expect(() => playersRegistry.add('4', 'David')).to.throw(Error, 'Max players reached.');
        });
    });

    describe('find', function () {
        it('should find a player by id', function () {
            const player = playersRegistry.add('1', 'Alice');
            const foundPlayer = playersRegistry.find('1');
            expect(foundPlayer).to.equal(player);
        });

        it('should return null if player is not found', function () {
            const foundPlayer = playersRegistry.find('1');
            expect(foundPlayer).to.be.null;
        });
    });

    describe('remove', function () {
        it('should remove a player successfully', function () {
            playersRegistry.add('1', 'Alice');
            playersRegistry.remove('1');
            expect(playersRegistry.find('1')).to.be.null;
            expect(playersRegistry.numPlayers).to.equal(0);
        });

        it('should do nothing if player does not exist', function () {
            playersRegistry.add('1', 'Alice');
            playersRegistry.remove('2');
            expect(playersRegistry.numPlayers).to.equal(1);
        });
    });

    describe('numPlayers', function () {
        it('should return the correct number of players', function () {
            playersRegistry.add('1', 'Alice');
            playersRegistry.add('2', 'Bob');
            expect(playersRegistry.numPlayers).to.equal(2);
        });
    });

    describe('maxPlayers', function () {
        it('should return the max number of players', function () {
            expect(playersRegistry.maxPlayers).to.equal(config.maxPlayers);
        });
    });
});
