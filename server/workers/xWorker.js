'use strict';

import Cryptox from 'cryptox';
import _ from 'lodash';
import winston from 'winston';
import mongoose from 'mongoose';
import { series } from 'async';

import { mergeDeep } from '../core/utils.js';

const Schema = mongoose.Schema;
const debug = require('debug')('xWorker');

const configSchemaWithDefaults = {
  // a JSON object that contains default config schema definition and default values
  run: {
    type: Boolean,
    default: true,
  },
  startDate: {
    type: Date,
    default: new Date(),
  },
  shouldExecuteTrades: {
    type: Boolean,
    default: true,
  },
  shouldSaveData: {
    type: Boolean,
    default: true,
  },
  reportEveryMinutes: {
    type: Number,
    default: 60,
  },
  cryptox: {
    slug: {
      type: String,
      default: '',
    },
    key: {
      type: String,
      default: '',
    },
    secret: {
      type: String,
      default: '',
    },
  },
};

const state = {
  released: 'released',
  engaged: 'engaged',
  working: 'working',
};

const initialStatus = {
  startDate: configSchemaWithDefaults.startDate.default,
  status: state.released,
};

const refreshConfigFromDbIntervalSeconds = 1;

function saveConfigToDatabase(callback) {
  let self = this;
  if (!self.config.shouldSaveData) {
    return (typeof callback === 'function') && callback(null)
  }

  self.ConfigModel.update({}, self.configForDb, { multi: true, upsert: true }, function (err) {
    if (err) {
      self.logger.warning(`${self.me}.saveConfig: ${err.message}`);
    } else {
      self.logger.info(`${self.me}.saveConfig: Config saved to database`);
    }

    typeof callback === 'function' && callback(err);
  });
}

function refreshConfigFromDb() {
  let self = this;
  if (self.status.state === state.released) {
    return;
  }

  self.updateConfig({}, function() {
    setTimeout(refreshConfigFromDb.bind(self), refreshConfigFromDbIntervalSeconds * 1000);
  });
}

export class XWorker {
  constructor(workerName) {
    this.setLogger();
    this.me = workerName;
    this.cryptox = null;
    this.configForDb = null;
    this.config = null;
    this.configSchemaWithDefaults = configSchemaWithDefaults;

    try {
      this.envConfig = JSON.parse(process.env[`${this.me.toUpperCase()}_CONFIG`]);
    }
    catch (err) {
      this.envConfig = {};
    }
    this.status = initialStatus;
  }

  /**
   * Extends configSchemaWithDefaults.
   * Should be called by subclasses that needs additional config parameters.
   * @param configSchema  JSON object describing the schema that should be added. Should include default values
   */
  extendConfigSchema(configSchemaToAdd) {
      let self = this;
    this.configSchemaWithDefaults = mergeDeep(this.configSchemaWithDefaults, configSchemaToAdd);
  }

  /**
   * Updates config.
   * envConfig overrides configForDb
   * if cryptox.slug is passed and cryptox is not defined a new cryptox object is created. if cryptox is defined, cryptox.slug is removed from newConfigParams
   * if cryptox.secret or cryptox.key is changed than define new cryptox object
   * configForDb is updated with newConfigParams and if anything new it is saved to the database
   * @param configParamsToUpdate JSON object containing the config parameters to update
   * @param callback
   */
  updateConfig(configParamsToUpdate, callback) {
    let self = this;
    self.fetchConfigFromDatabase(function (err) {
      if(err) {
        return typeof callback === 'function' && callback(err, self.config);
      }

      let newConfigParams = _.cloneDeep(configParamsToUpdate);
      let shouldDefineNewCryptox = false;
      if (_.has(newConfigParams, 'cryptox.slug')) {
        if (self.cryptox) {
          delete newConfigParams.cryptox.slug;
          let errMessage = 'Illegal attempt to update "config.cryptox.slug"';
          self.logger.warning(`${self.me}.updateConfig: ${errMessage}`);
        } else {
          shouldDefineNewCryptox = true;
        }
      }

      let newConfigForDb = _.merge({}, self.configForDb, newConfigParams);
      _.defaultsDeep(newConfigForDb, self.config);

      let newConfig = _.merge({}, self.configForDb, self.envConfig, newConfigParams);

      shouldDefineNewCryptox = shouldDefineNewCryptox || newConfig.cryptox.key !== self.config.cryptox.key || newConfig.cryptox.secret !== self.config.cryptox.secret;

      if (!_.isEqual(newConfig, self.config)) {
        self.config = newConfig;
        let infoMessage = 'New config activated';
        self.logger.info(`${self.me}.updateConfig: ${infoMessage}`);
      }

      if (shouldDefineNewCryptox) {
        self.crypotx = new Cryptox(self.config.cryptox.slug, self.config.cryptox);
        self.logger.info(`${self.me}.updateConfig: New cryptox ${self.config.cryptox.slug} for created`);
      }

      if (!_.isEqual(newConfigForDb, self.configForDb)) {
        self.configForDb = newConfigForDb;
        saveConfigToDatabase.call(self, function (err) {
          typeof callback === 'function' && callback(err, self.config);
        });
      } else {
        typeof callback === 'function' && callback(null, self.config);
      }
    });
  }

  fetchConfigFromDatabase(callback) {
    let self = this;

    if (!self.ConfigModel) {
      let configMongooseSchema = new Schema(self.configSchemaWithDefaults, { collection: `${self.me}.config` });
      if (!configMongooseSchema.hasOwnProperty('options')) configMongooseSchema.options = {};
      configMongooseSchema.options.toJSON = {
        transform: function (doc, ret, options) {
          delete ret._id;
          delete ret.__v;
          return ret;
        },
      };
      self.ConfigModel = mongoose.model(`${self.me}.config`, configMongooseSchema);
      self.configForDb = new self.ConfigModel().toJSON();
    }

    if (!self.config) {
      self.config = new self.ConfigModel().toJSON();
    }

    self.ConfigModel.findOne().lean().exec(function (err, foundConfig) {
      if (err) {
        self.logger.error(`${self.me}.loadConfig: ${err.message}`);
        return callback(err)
      }

      if (foundConfig) {
        self.configForDb = _.cloneDeep(foundConfig);
        delete self.configForDb._id;
        delete self.configForDb.__v;
        delete self.configForDb.$setOnInsert;
        callback(null);
      } else {
        saveConfigToDatabase.call(self, callback);
      }
    });
}

  connectWebsocket(ws) {
  	this.ws = ws;
  }

  setLogger(logger) {
  	if (logger) {
      this.logger = logger;
	  } else {
      this.logger = new (winston.Logger)({
        transports: [
          new (winston.transports.Console)({
            colorize: 'all',
          })
        ],
      });
      this.logger.setLevels(winston.config.syslog.levels);
    }
  }


  doTask() {
  }

  /**
   * Start refresing config from the db and start the doTask
   */
  engage() {
    let self = this;

    function waitForFetchConfigFromDatabase(callback) {
      self.fetchConfigFromDatabase(function(err) {
        if (!err) {
          self.status.state = state.engaged;
          callback(null);
        } else {
          setTimeout(function() {
            self.fetchConfigFromDatabase(callback);
          }, refreshConfigFromDbIntervalSeconds * 1000);
        }
      });
    }

    series([
      function fetchConfigFromDatabase(callback) {
        waitForFetchConfigFromDatabase(callback);
      },
    ], function(err, result) {
      refreshConfigFromDb.bind(self)();
      self.doTask();
    });
  }

  release() {
    this.status.status = state.released;
    refreshConfigFromDb.call(this);
    if (refreshConfigFromDbIntervalSeconds) {

    }
    this.refreshConfigFromDbLimiter = new RateLimiter(refreshConfigFromDbIntervalSeconds, 'second');
    this.reportLimiter = new RateLimiter(this.config.reportEveryMinutes*60, 'seconds');

    refreshConfigFromDb.call(this);
    this.doTask();
  }
}
