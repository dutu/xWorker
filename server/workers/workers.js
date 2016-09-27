"use strict";

var Workers = function() {
    var srv = require ("./../core/srv");
    var logger = srv.logger;
    var self = this;
    self.me = "workers";
    self.workers = [];

    var startWorker = function (worker) {
        try {
            worker.start();
            self.workers.push(worker);
        } catch (err) {
            logger.crit("%s: %s %s", self.me, worker.me, err.message);
        }
    };

    self.start = function () {

        var DummyWorker = require("./../workers/dummyWorker/dummyWorker");
        var dummyWorker = new DummyWorker("dummyWorker");
        startWorker(dummyWorker);

// add additional workers as above

    };

    self.closeGracefully = function (signal) {
        var graceTimeout = 100;
        process.exit();
        logger.info("%s: received signal (%s) on %s, shutting down gracefully in %s ms'", self.me,
            signal,
            new Date().toString('T'),
            graceTimeout
        );
        setTimeout(function() {
            console.info('(x) forcefully shutting down',graceTimeout);
            process.exit();
        }, graceTimeout);

        self.workers.forEach(function (element, index, array) {
            if (typeof element.closeGracefully == 'function') {
                element.closeGracefully();
            }
        });
    };
};
module.exports = Workers;