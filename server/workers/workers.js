'use strict';

import winston from 'winston';
import mongoose from 'mongoose';

import { ioSocket } from '../../server.js';
import { CoinSeller } from './CoinSeller/CoinSeller.js'

export function runWorkers () {
  let me = 'runWorkers';
  let logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        colorize: 'all',
      })
    ],
  });
  logger.setLevels(winston.config.syslog.levels);

  function setupAndStartWorkers() {
    let zecSeller = new CoinSeller('zecSeller');
    zecSeller.setLogger(logger);
    zecSeller.updateConfig({reportEveryMinutes: 10});
    zecSeller.engage();
  }

  const db = mongoose.connection;
  mongoose.Promise = global.Promise;

  db.on('error', function (err) {   // any connection errors will be written to the console
    logger.crit(`${me}: init_db: ${err.message}`);
  });

  const mongodbURI = process.env.MONGOLAB_URI;
  if (!mongodbURI) {
    logger.warning(`${me}: For using mongodb please set environment variable MONGOLAB_URI`);
  } else {
    logger.info(`${me}: Connecting to mongodb://${mongodbURI.replace(/[^@]*@/, "")}`);
    mongoose.connect(mongodbURI, function (err) {
      if (err) {
        logger.crit(`${me}: connect_db: ${err.message}`);
        logger.crit(`${me}: Workers not started!`);
      } else {
        logger.info(`${me}: connect_db: mongodb connection successful`);
        logger.info(`${me}: Starting workers`);
        setupAndStartWorkers();
      }
    });
  }
}