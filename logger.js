const winston = require('winston');
var moment = require('moment');
moment().format();

var loggerOptions = 
{
  timestamp: () =>
  {
    return moment().format();
  },
  formatter: (options) =>
  {
    // Return string will be passed to logger. 
    return '[' + options.timestamp() +'] ['+ options.level.toUpperCase() +']: '+ (undefined !== options.message ? options.message : '') +
      (options.meta && Object.keys(options.meta).length ? '\n\t'+ JSON.stringify(options.meta) : '' );
  },
};
var logger = new (winston.Logger)(
{
  transports: [
    new (winston.transports.Console)(loggerOptions),
    new (winston.transports.File)(Object.assign({}, loggerOptions, {filename: 'log.txt', json: false})),
  ]
});

module.exports = logger;
