var Sequelize = require('sequelize');
var connection = require('../connection.js');

var Manager = connection.define('managers', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  socket_id: {
    type: Sequelize.STRING,
    unique: true,
  },
  name: {
    type: Sequelize.STRING,
  },
  point_limit: {
    type: Sequelize.INTEGER,
  },
  point_tag: {
    type: Sequelize.STRING,
  },
});

module.exports = Manager; 
