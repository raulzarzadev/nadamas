const admin = require('firebase-admin')
const cypressFirebasePlugin = require('cypress-firebase').plugin

module.exports = (on, config) => {
  const extendConfig = cypressFirebasePlugin(on, config, admin)
  return extendConfig
}
