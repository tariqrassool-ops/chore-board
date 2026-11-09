// Keep the server code (server/) and its node_modules out of the app bundle.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const serverDir = new RegExp(`^${__dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/server/.*`);
config.resolver.blockList = [].concat(config.resolver.blockList ?? [], serverDir);

module.exports = config;
