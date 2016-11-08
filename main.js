var database = require('./database');
var logger = require('./logger');
var App = require('./App');
const commandLineArgs = require('command-line-args');
const config = require('./config');
var Command = require('./Command');
const exec = require('child_process').exec;
var async = require('async');

const optionDefinitions = [
  { name: 'port', alias: 'p', type: Number},
  { name: 'db_host', type: String},
  { name: 'db_port', type: Number},
  { name: 'db_user', type: String},
  { name: 'db_pass', type: String},
  { name: 'accountsPerPoint', type: Number},
  { name: 'count', alias: 'n', type: Number},
];

const options = commandLineArgs(optionDefinitions);
config.port = options.port || config.port;
config.db_host = options.db_host || config.db_host;
config.db_port = options.db_port || config.db_port;
config.db_user = options.db_user || config.db_user;
config.db_pass = options.db_pass || config.db_pass;
config.accountsPerPoint = options.accountsPerPoint || config.accountsPerPoint;
config.count = options.count || null;

logger.info('Starting app...');

database.init().then((Models) => {
  logger.info('Connected to database with user %s on %s:%s', config.db_user, config.db_host, config.db_port);
  let port = options.port || config.port || 8000;
  this.command = new Command();
  this.command.init()
    .then(() => {
      logger.info('Command initialized successfully.');
      logger.info('Server listening on port %s', port);
      dockerStart();
    })
    .catch((err) =>
      {
        logger.error('Command failed to initialize!');
        logger.error(err.stack);
      });
}).catch((err) => {
  logger.error(err.stack);
});

function dockerStart() {
  let Models = database.models;
  Models.Points.findAll({
    where: {
      tag: 'sf',
      enabled: true,
    },
    include: {
      model: Models.Accounts,
      where: {banned: false},
    },
    limit: config.count,
  })
    .then((points) => {
      let commandStrings = []
      let commandStringBase = `docker run -d quickmap-hack-map -k AIzaSyBkRnvh3NmZPFZ0EkZ8znkOmTxjBGMiYnQ -st 5 -ns -ng -nk --db-type=mysql --db-name=pokemon_map --db-user=${config.db_user} --db-pass=${config.db_pass} --db-host=${config.db_host} --db-port=${config.db_port}`
      for(let point of points) {
        commandStrings.push(commandStringBase + formatCommand(point.get({plain: true})))
      }
      async.each(commandStrings, (commandString, next) => {
        
        setTimeout(() => {
          exec(commandString, (error, stdout, stderr) => {
            if (error) {
              console.error(`exec error: ${error}`);
              return;
            }
            console.log(`stdout: ${stdout}`);
            console.log(`stderr: ${stderr}`);
            next()
          })
        }, 10000)
      })
      
    })
    .catch((err) => {
      console.log(err)
    })
}

function formatCommand(point) {
  let commandString = ` -l "${point.latitude}, ${point.longitude}" `;
  for(let account of point.accounts) {
    commandString += `-a ptc -u ${account.username} -p ${account.password} `
  }
  return commandString;
}
