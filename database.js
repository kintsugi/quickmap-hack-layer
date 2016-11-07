var sequelize = require('./models/connection.js');
var schemas = require('./models/schemas.js');
var setRelations = require('./models/relations.js');

module.exports = {
  init: () => {
    return new Promise((fulfill, reject) => {
      sequelize.authenticate()
      .then(() =>  {
        setRelations();
        sequelize.sync()
        .then(() => {
          fulfill(schemas);
        })
        .catch(reject);
      })
      .catch(reject);
    });
  },
  models: schemas,
}; 
