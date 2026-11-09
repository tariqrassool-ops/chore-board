// Keep the server code (functions/) and its node_modules out of the app bundle.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const functionsDir = new RegExp(`^${__dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/functions/.*`);
config.resolver.blockList = [].concat(config.resolver.blockList ?? [], functionsDir);

module.exports = config;
