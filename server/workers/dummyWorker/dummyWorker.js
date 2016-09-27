'use strict';

const _ = require('lodash');
const Big = require ("big.js");
const moment = require("moment");

const srv = require ("../../core/srv");

var DummyWorker = function(name) {
	var self = this;
	self.me = name;

	var logger = srv.logger;
	var ws = srv.ws;

	var status = {
		restarted: Date.now(),
		count: 0,
		lastRun: {
			hb: Date.now()
		}
	};
	var statusInfo = {
		restarted: "",
		lastHB: "",
		count: ""
	};
	var configDefault = {
		hbTimerMinutes: 0.25
	};
	var config = {};

	_.assign(config, configDefault);

	var execTask = function() {
		status.count++;
		statusInfo = {
			restarted: moment(status.restarted).format(),
			lastHB: moment(status.lastRun.hb).format(),
			count: status.count.toFixed()
		};
		logger.info("%s: %s", self.me, statusInfo);
		var timeout = parseInt(new Big(config.hbTimerMinutes).times(60*1000).toFixed(0));
		status.lastRun.hb = Date.now();
		if (srv.ws) {
			var string = JSON.stringify(statusInfo);
			srv.ws.send(string);
		}
		setTimeout(execTask, timeout);
	};


	self.start = function() {
		status.restarted = moment();
		execTask();
	};

	self.stop = function() {
	};
};

module.exports = DummyWorker;
