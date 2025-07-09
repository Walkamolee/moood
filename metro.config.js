const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file extensions
config.resolver.assetExts.push(
  // Adds support for `.db` files for SQLite databases
  'db',
  // Add other asset extensions as needed
  'bin',
  'txt',
  'jpg',
  'png',
  'gif',
  'webp',
  'svg'
);

// Add support for TypeScript path mapping
config.resolver.alias = {
  '@': './src',
  '@/components': './src/components',
  '@/screens': './src/screens',
  '@/services': './src/services',
  '@/store': './src/store',
  '@/utils': './src/utils',
  '@/types': './src/types',
  '@/contexts': './src/contexts',
  '@/navigation': './src/navigation',
};

// Configure transformer for better performance
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Enable source maps for better debugging
config.transformer.enableBabelRCLookup = false;

module.exports = config;

