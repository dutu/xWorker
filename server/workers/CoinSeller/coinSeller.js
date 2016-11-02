'use strict';

import mongoose from 'mongoose';

import { mergeDeep } from '../../core/utils.js';
import { XWorker } from '../xWorker.js';

const Schema = mongoose.Schema;

/**
 * JSON object describing the schema that should be added. Should include default values
 * constructor needs to call extendConfigSchema(extendedConfigSchemaWithDefaults)
 */
const extendedConfigSchemaWithDefaults = {
  apiCallsLimits: {
    privatePerSec: {
      type: Number,
      default: 1,
    },
    publicPerSec: {
      type: Number,
      default: 1,
    },
  },
};

export class CoinSeller extends XWorker {
  constructor(workerName) {
    super(workerName);
    this.extendConfigSchema(extendedConfigSchemaWithDefaults);
  }

}
