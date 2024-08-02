const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;


const Match = require('../../src/models/Match');
const MatchesRegistry = require('../../src/registries/MatchesRegistry');

describe('MatchesRegistry', function() {
    let config;
    let registry;
    let player;

    beforeEach(function() {
        config = {
            maxMatches: 10,
            matchNameMinLength: 3,
            matchNameMaxLength: 20,
            matchPasswordMinLength: 6,
            matchPasswordMaxLength: 20,
            maxPlayersPerMatch: 8
        };
        registry = new MatchesRegistry(config);
        player = { id: 'player1' };
    });

    describe('numMatches', function() {
        it('should return the correct number of matches', function() {
            expect(registry.numMatches).to.equal(0);
        });
    });

    describe('maxMatches', function() {
        it('should return the correct max matches from config', function() {
            expect(registry.maxMatches).to.equal(config.maxMatches);
        });
    });

    describe('find', function() {
        it('should return null if match is not found', function() {
            expect(registry.find('nonexistent')).to.be.null;
        });

        it('should return the match if it exists', function() {
            const match = { id: 'match1' };
            registry._matches['match1'] = match;
            expect(registry.find('match1')).to.equal(match);
        });
    });

    describe('add', function() {
        it('should throw an error if max matches is reached', function() {
            registry._numMatches = config.maxMatches;
            expect(() => registry.add({}, player)).to.throw('Max matches reached.');
        });

        it('should throw an error if match name is not provided', function() {
            expect(() => registry.add({}, player)).to.throw('Match name is required.');
        });

        it('should throw an error if match name length is invalid', function() {
            const matchData = { name: 'ab' };
            expect(() => registry.add(matchData, player)).to.throw(`Match name must be between ${config.matchNameMinLength} and ${config.matchNameMaxLength} characters.`);
        });

        it('should throw an error if match password length is invalid', function() {
            const matchData = { name: 'validName', password: 'short' };
            expect(() => registry.add(matchData, player)).to.throw(`Match password must be between ${config.matchPasswordMinLength} and ${config.matchPasswordMaxLength} characters.`);
        });

        it('should add a new match and return it', function() {
            const matchData = { name: 'validName' };
            const match = { id: player.id };

            const newMatch = registry.add(matchData, player);

            expect(newMatch).to.include(match);
            expect(registry.numMatches).to.equal(1);
        });

        it('should throw an error if match already exists', function() {
            const matchData = { name: 'validName' };
            const match = { id: player.id, addPlayer: sinon.spy() };

            registry._matches[match.id] = match;
            expect(() => registry.add(matchData, player)).to.throw('Match already exists.');
        });
    });

    describe('remove', function() {
        it('should remove the match if it exists', function() {
            const match = { id: 'match1' };
            registry._matches['match1'] = match;
            registry._numMatches = 1;

            registry.remove('match1');

            expect(registry.numMatches).to.equal(0);
            expect(registry.find('match1')).to.be.null;
        });

        it('should do nothing if match does not exist', function() {
            registry.remove('nonexistent');

            expect(registry.numMatches).to.equal(0);
        });
    });

    describe('getListVisible', function() {
        it('should return a list of visible matches', function() {
            const match1 = { isVisible: sinon.stub().returns(true), getMinResponse: sinon.stub().returns('response1') };
            const match2 = { isVisible: sinon.stub().returns(false), getMinResponse: sinon.stub().returns('response2') };
            const match3 = { isVisible: sinon.stub().returns(true), getMinResponse: sinon.stub().returns('response3') };

            registry._matches['match1'] = match1;
            registry._matches['match2'] = match2;
            registry._matches['match3'] = match3;

            const visibleMatches = registry.getListVisible();

            expect(visibleMatches).to.have.lengthOf(2);
            expect(visibleMatches).to.include('response1');
            expect(visibleMatches).to.include('response3');
        });
    });
});
