'use strict';

var assert = require('assert'),
    mockery = require('mockery');

const { inherits } = require('util');

const commands = require('ioredis-mock/lib/commands');
const commandsCopy = Object.assign({}, commands);
let subscriber;

class RedisMockExtended {
    brpop (subscriptionPath, body, queueFn) {
        setTimeout(() => queueFn(undefined, [1, 2]), 0);
    }

    lpush(subscriptionPath, body, queueFn) {
        setTimeout(() => queueFn(undefined), 0);
    }
}

mockery.registerMock('./commands', commandsCopy);

const RedisMock = require('ioredis-mock');

inherits(RedisMockExtended, RedisMock);

mockery.registerMock('ioredis', RedisMockExtended);
mockery.registerAllowables(['../lib/redislist.js']);

mockery.enable({ warnOnReplace: true, warnOnUnregistered: false, useCleanCache: true });

var redisList = require('../lib/redislist.js');

mockery.disable();

describe('Test redislist', function() {
    it('should test pausing redislist subscription', function(done) {
        const queue = redisList({ host: 'test', port: 'test', retryStrategy: 'test'});
        subscriber = queue.subscriber('/my_path');
        var callCount = 0;
        subscriber.on('message', function() {
            callCount++;
        });

        queue.send('/my_path', 'm1', function() {
            process.nextTick(function() {
                Promise.resolve().then(() => {
                    assert.equal(callCount, 1);
                    subscriber.emit('pause');

                    queue.send('/my_path', 'm2', function() {
                        process.nextTick(function() {
                            Promise.resolve().then(() => {
                                assert.equal(callCount, 2);

                                queue.send('/my_path', 'm3', function() {
                                    process.nextTick(function() {
                                        Promise.resolve().then(() => {
                                            assert.equal(callCount, 2);
                                            done();
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
