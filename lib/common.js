

const lodash = require('lodash');
const redis = require('./redis');

const Parameter = require('parameter');
const Redlock = require('redlock');
const PARAMETER = Symbol('Application#parameter');
const REDLOCK = Symbol('Application#redlock');

function redlock() {
    if (!this[ REDLOCK ]) {
      this[ REDLOCK ] = new Redlock([ redis ]);
    }
    return this[ REDLOCK ];
}

function parameter() {
    if (!this[ PARAMETER ]) {
        this[ PARAMETER ] = new Parameter();
    }
    return this[ PARAMETER ];
}

function validate (rules, params) {
    return parameter().validate(rules, params);
}

function params_handler(ctx, rules) {
    const types = [ 'int', 'integer', 'enum', 'number' ]; // 需要转换的类型
    // 转换ctx.params
    lodash.map(ctx.params, function(value, key) {
      if (rules[key] && types.includes(rules[key].type)) ctx.params[ key ] = tryToNumber(value);
    });
  
    // 转换ctx.request.query
    lodash.map(ctx.request.query, function(value, key) {
      if (rules[key] && types.includes(rules[key].type)) ctx.request.query[ key ] = tryToNumber(value);
    });
};
  
// 尝试转换为number
function tryToNumber(val) {
    const num = parseFloat(val);
  
    return isNaN(num) || String(num).length !== String(val).length ? val : num;
};

module.exports = { validate, params_handler, redlock };