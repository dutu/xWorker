'use strict';
import _ from 'lodash';

/*
export function mergeDeep(target, source) {
  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item) && item !== null);
  }

  let output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target))
          Object.assign(output, { [key]: source[key] });
        else
          output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}
*/

export function mergeDeep(target, source) {
  let result = _.cloneDeep(target);
  _.merge(result, source);
  return result;
}

