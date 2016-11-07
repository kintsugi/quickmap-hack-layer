var Sequelize = require('sequelize');
var connection = require('../connection.js');

var Account = connection.define('accounts', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  username: {
    type: Sequelize.TEXT,
  },
  password: {
    type: Sequelize.TEXT,
  },
  status: {
    type: Sequelize.STRING,
    defaultValue: 'idle',
  },
  tag: {
    type: Sequelize.STRING,
  },
  banned: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
  },
  createdAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
  },
  updatedAt: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
  }
});

module.exports = Account; 
