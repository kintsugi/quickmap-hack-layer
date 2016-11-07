'use strict';
var logger = require('./logger');
var throwErr = require('./throwErr');
var Models = require('./database').models;
var async = require('async');
var config = require('./config');

class Command {

  init() {
    return new Promise((fulfill, reject) => {
      try {
        this.initAccounts().then(() => {
          return this.initPoints();
        }, reject)
          .then(() => {
            return this.initManagers();
          }, reject)
          .then(fulfill, reject);
      } catch(err) {
        reject(err);
      }
    });
  }

  initManagers() {
    return new Promise((fulfill, reject) => {
      try {
        Models.Managers.findAll({
          include: [Models.Points]
        }).then((managers) => {
          async.each(managers, (manager, cb) => {
            manager.removePoint().then(() => {
              cb();
            }, cb);
          }, () => {
            Models.Managers.destroy({
              where: {}
            }).then(fulfill, reject); 
          });

        }, reject);
      } catch(err) {
        reject(err);
      }
    });
  }

  initAccounts() {
    return new Promise((fulfill, reject) => {
      try {
        Models.Accounts.update({
          status: 'idle',
        }, {
          where: {}
        })
          .then(fulfill, reject);
      } catch(err) {
        reject(err);
      }
    });
  }

  initPoints() {
    return new Promise((fulfill, reject) => {
      try {
        Models.Points.findAll({
          include: [Models.Accounts]
        })
          .then((points) => {

            async.eachSeries(points, (point, cb) => {
              this.initPoint(point)
                .then(cb, (err) => {
                  logger.warning('Error while initializing point id %s', point.id);
                  logger.warning(err.stack);
                  cb();
                });
            }, () => {
              fulfill();
            });
          }, reject);
      } catch(err) {
        reject(err);
      }
    });
  }

  initPoint(point) {
    return new Promise((fulfill, reject) => {
      try {
        logger.info('Initializing point %d, %d', point.latitude, point.longitude);
        this.sanitizePoint(point)
          .then((accountQty) => {
            if(accountQty > 0) {
              logger.info('point %d, %d not ready, allocating %d accounts.', point.latitude, point.longitude, accountQty);
              return this.allocateAccountsToPoint(point, accountQty);
            } else {
              fulfill();
            }
          }, reject)
          .then(fulfill, reject);
      } catch(err) {
        reject(err);
      }
    });
  }

  allocateAccountsToPoint(point, qty) {
    return new Promise((fulfill, reject) => {
      try {
        let whereFilter = {
          pointId: null,
          status: 'idle',
          banned: false,
        };
        if(point.tag) {
          whereFilter.tag = point.tag;
        }

        Models.Accounts.findAll({
          where: whereFilter,
          limit: qty,
        })
          .then((accounts) => {
            if(accounts.length === 0) {
              logger.warn('No more available accounts with tag %s.', point.tag);
              fulfill();
            } else {
              point.addAccounts(accounts)
                .then(() => {
                  logger.info('Point allocated successfully.');
                  fulfill();
                }, (err) => {
                  reject(err);
                });
            }
          });
      } catch(err) {
        reject(err);
      }
    });
  }

  sanitizePoint(point) {
    return new Promise((fulfill, reject) => {

      try {
        logger.info('Sanitizing point %d, %d', point.latitude, point.longitude);
        let accountsToRemove = [];
        let unbannedAccounts = [];
        for(let account of point.accounts) {
          if(account.banned) {
            accountsToRemove.push(account.id);
          } else {
            unbannedAccounts.push(account);
          }
        }

        if(unbannedAccounts.length > config.accountsPerPoint) {
          let overflowAccounts = unbannedAccounts.slice(config.accountsPerPoint);
          for(let overflowAccount of overflowAccounts) {
            accountsToRemove.push(overflowAccount.id);
          }
        }

        if(accountsToRemove.length === 0) {
          fulfill(config.accountsPerPoint - point.accounts.length);
        } else {
          logger.info('Removing %d accounts.', accountsToRemove.length);
          Models.Accounts.update({
            pointId: null,
          }, {
            where: {
              id: {
                $in: accountsToRemove,
              }
            }
          })
            .then(() => {
              fulfill(config.accountsPerPoint - (point.accounts.length - accountsToRemove.length));
            }, reject);
        }
      } catch(err) {
        reject(err);
      }
    });
  }

  addManager(socketId, managerOptions) {
    return new Promise((fulfill, reject) => {
      try {
        Models.Managers.create({
          socket_id: socketId,
          name: managerOptions.name,
          point_limit: managerOptions.point_limit,
          point_tag: managerOptions.point_tag,
        })
          .then((manager) => {
            this.allocatePointsToManager(manager)
              .then(() => {
                this.getManagerPayload(manager)
                  .then(fulfill, reject);
              });
          }, reject);
      } catch(err) {
        reject(err);
      }
    });
  }

  getManagerPayload(manager) {

    return new Promise((fulfill, reject) =>
      {
        try {
          Models.Points.findAll({
            where: {
              managerId: manager.id,
            },
            include: [Models.Accounts]
          })
            .then((points) => {
              let payloadPoints = [];
              for(let point of points) {
                payloadPoints.push(point.get({plain: true}));
              }
              fulfill(payloadPoints);
            });
        } catch(err) {
          reject(err);
        }
      });
  }

  allocatePointsToManager(manager)  {
    return new Promise((fulfill, reject) => {
      try {
        var whereFilter = {managerId: null};
        if(manager.point_tag) {
          whereFilter.tag = {$in: manager.point_tag.split(',')};
        }
        Models.Points.findAll({
          where: whereFilter,
          include: [Models.Accounts],
          limit: manager.point_limit
        })
          .then((points) => {
            manager.addPoints(points);
            fulfill();
          });
      } catch(err) {
        reject(err);
      }
    });
  }

  removeManager(socketId)
  {
    return new Promise((fulfill, reject) =>
      {
        try {
          Models.Managers.findOne({
            where: {
              socket_id: socketId
            }
          })
            .then((manager) =>
              {
                if(!manager) {
                  fulfill();
                  return;
                }
                manager.removePoint()
                  .then(() =>
                    {
                      manager.destroy()
                        .then(fulfill, reject);
                    }, reject);
              }, reject);
        } catch(err) {
          reject(err);
        }
      });

  }

  handleBannedAccount(failingPoint, bannedAccount) {
    return new Promise((fulfill, reject) => {
      Models.Accounts.findOne({
        where: {
          username: bannedAccount.username,
          password: bannedAccount.password,
        } 
      })
        .then((account) => {
          if(account) {
            logger.info('Flagging account %s/%s as being banned.', account.username, account.password);
            return account.update({banned: true, pointId: null});
          } else {
            reject(new Error('Account with username/password' + bannedAccount.username + '/' + bannedAccount.password + ' DNE in db.'));
          }
        }, reject)
        .then(() => {
          return Models.Points.findById(failingPoint.id, {include: [Models.Accounts]});
        }, reject)
        .then((point) => {
          if(point) {
            return this.initPoint(point)
              .then(() => {
                return point.reload({include: [Models.Accounts]});
              }, reject);
          } else {
            reject(new Error('failing point with id/lat/lng ' + failingPoint.id + '/' + failingPoint.latitude + '/' + failingPoint.longitude + ' DNE in db, could not be reinitialized and is not being scanned.'));
          }
        }, reject)
        .then((point) => {
          if(point) {
            fulfill(point.get({plain: true}));
          } else {
            reject(new Error('failing point with id/lat/lng ' + failingPoint.id + '/' + failingPoint.latitude + '/' + failingPoint.longitude + ' was reinitialized successfully but did not reload properly and is not being scanned.'));
          }
        }, reject);
    });
  }

}

module.exports = Command;
