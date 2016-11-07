var logger = require('./logger');

module.exports = (err) => {
  logger.error(err.stack);
};
