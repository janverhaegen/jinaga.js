var mocha = require('mocha');
var chai = require('chai');
var FactChannel = require('../node/factChannel');

var expect = chai.expect;

describe('FactChannel', function () {
    var messages;
    var channel;
    
    beforeEach(function () {
        messages = [];
        channel = new FactChannel(function (message) {
            messages.push(message);
        });
    });
    
    it('should serialize one fact', function () {
        channel.sendFact({
            type: "Jinaga.User",
            publicKey: "----BEGIN PUBLIC KEY---XXXXX"
        });
        
        expect(messages.length).to.equal(1);
        expect(messages[0]).to.eql({
            type: "fact",
            hash: 10982172839,
            id: 1,
            fact:{
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
    });
    
    it('should serialize a predecessor', function () {
        channel.sendFact({
            type: "List",
            name: "Chores",
            from: {
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        
        expect(messages.length).to.equal(2);
        expect(messages[0]).to.eql({
            type: "fact",
            hash: 10982172839,
            id: 1,
            fact:{
                type: "Jinaga.User",
                publicKey: "----BEGIN PUBLIC KEY---XXXXX"
            }
        });
        expect(messages[1]).to.eql({
            type: "fact",
            hash: 13315294636,
            id: 3,
            fact:{
                type: "List",
                name: "Chores",
                from: {
                    id: 1
                }
            }
        });
    });
    
    it('should serialize a set of predecessors', function () {
        channel.sendFact({
            value: "a",
            prior: [{
                value: "b"
            }, {
                value: "c"
            }]
        });
        
        expect(messages.length).to.equal(3);
        expect(messages[0]).to.eql({
            type: "fact",
            hash: -823812847,
            id: 1,
            fact: {
                value: "b"
            }
        });
        expect(messages[1]).to.eql({
            type: "fact",
            hash: -823812846,
            id: 3,
            fact: {
                value: "c"
            }
        });
        expect(messages[2]).to.eql({
            type: "fact",
            hash: -3451421271,
            id: 5,
            fact: {
                value: "a",
                prior: [{
                    id: 1
                }, {
                    id: 3
                }]
            }
        });
    });
    
    it('should reuse predecessors', function () {
        channel.sendFact({
            value: "first",
            parent: {
                value: "top"
            }
        });
        channel.sendFact({
            value: "second",
            parent: {
                value: "top"
            }
        });
        
        expect(messages.length).to.equal(3);
        expect(messages[0]).to.eql({
            type: "fact",
            hash: -823697916,
            id: 1,
            fact: {
                value: "top"
            }
        });
        expect(messages[1]).to.eql({
            type: "fact",
            hash: -2343446023,
            id: 3,
            fact: {
                value: "first",
                parent: {
                    id: 1
                }
            }
        });
        expect(messages[2]).to.eql({
            type: "fact",
            hash: -3347166275,
            id: 5,
            fact: {
                value: "second",
                parent: {
                    id: 1
                }
            }
        });
    });
});