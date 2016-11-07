var sequelize = require('sequelize');
const config = require('../config');

var connection = new sequelize('pokemon_map', config.db_user, config.db_pass, {
  host: config.db_host,
  port: config.db_port,
  dialect: 'mysql',
  pool: {
    max: 1,
    min: 0,
    idle: 10000,
  },
  logging: false,
});

module.exports = connection;
