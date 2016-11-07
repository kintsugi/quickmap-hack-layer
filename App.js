'use strict';
var logger = require('./logger');
var throwErr = require('./throwErr');
var Models = require('./database').models;
var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var socketIO = require('socket.io');
var Command = require('./Command');

class App {
  constructor(port) {
    this.express = express();
    this.express.use(bodyParser.json());
    this.express.use('/', this.routes());
    this.server = http.Server(this.express);

    this.command = new Command();
    this.command.init()
      .then(() => {
        logger.info('Command initialized successfully.');
        this.io = require('socket.io')(this.server);
        this.io.on('connection', (socket) => {this.socketEvents(socket);});
        this.server.listen(port);
        logger.info('Server listening on port %s', port);
      }, (err) =>
        {
          logger.error('Command failed to initialize!');
          logger.error(err.stack);
        });
  }

  routes() {
    var router = express.Router();
    return router;
  }

  socketEvents(socket) {
    logger.info('%s connected.', socket.id);
    socket.on('connect_manager', (managerOptions) => {
      this.command.addManager(socket.id, managerOptions).then((payload) => {
        socket.emit('connect_manager_response', payload);
      }, throwErr);
    });

    socket.on('disconnect', () => {
      logger.info('%s disconnected.', socket.id);
      this.command.removeManager(socket.id);
    });

    socket.on('banned account', (data) => {
      logger.info('Manager with socket id %s is reporting a banned/failing account.', socket.id);
      this.command.handleBannedAccount(data.point, data.account)
        .then((handledPoint) => {
          logger.info('Adding handled point with id %s with %d accounts back to manager with socket id %s ', handledPoint.id, handledPoint.accounts.length, socket.id);
          socket.emit('add point', handledPoint);
        }, throwErr);
    });
  }
}

module.exports = App;
