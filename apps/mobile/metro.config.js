const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root so Metro can resolve packages/shared
config.watchFolders = [workspaceRoot];

// Resolve packages from both local and workspace node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Exclude the web app (especially .next build artifacts) from Metro's file watcher
config.resolver.blockList = [
  new RegExp(`${escapeRegex(path.resolve(workspaceRoot, 'apps', 'web'))}[\\\\/].*`),
];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = config;
