const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

// Expo detects the npm workspace and sets watchFolders and nodeModulesPaths
// for the monorepo itself. Overriding them drops Expo's defaults.
const config = getDefaultConfig(projectRoot);

// Exclude the web app (especially .next build artifacts) from Metro's file watcher
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`${escapeRegex(path.resolve(workspaceRoot, 'apps', 'web'))}[\\\\/].*`),
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
