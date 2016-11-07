var Schemas = require('../schemas.js')

module.exports = () =>
{
  Schemas.Accounts.belongsTo(Schemas.Points);
}
