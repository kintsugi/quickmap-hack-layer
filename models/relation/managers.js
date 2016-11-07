var Schemas = require('../schemas.js')

module.exports = () =>
{
  Schemas.Managers.hasMany(Schemas.Points);
}
