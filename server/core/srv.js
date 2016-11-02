'use strict';
//Contains httpServer state (global variables)

const mongoose = require ('mongoose');

const logger = require('./logger');
exports.logger = logger;

const db = mongoose.connection;
exports.db = db;
