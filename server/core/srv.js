'use strict';
//Contains server state (global variables)

const mongoose = require ('mongoose');

const name = 'xWorker';
exports.name = name;

var config = {};
exports.config = config;

var workers = [];
exports.config = workers;

var ws = null;
exports.config = ws;

const logger = require('./logger');
exports.logger = logger;

const db = mongoose.connection;
exports.db = db;
