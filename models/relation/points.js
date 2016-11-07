var Schemas = require('../schemas.js');

module.exports = () =>
{
  Schemas.Points.belongsTo(Schemas.Managers);
  Schemas.Points.hasMany(Schemas.Accounts);
}
