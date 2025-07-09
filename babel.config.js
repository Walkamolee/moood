module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      ['@babel/preset-env', { targets: { node: 'current' } }],
      '@babel/preset-typescript',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@/components': './src/components',
            '@/screens': './src/screens',
            '@/services': './src/services',
            '@/store': './src/store',
            '@/utils': './src/utils',
            '@/types': './src/types',
            '@/contexts': './src/contexts',
            '@/navigation': './src/navigation',
          },
        },
      ],
      'react-native-reanimated/plugin', // Must be last
    ],
    env: {
      production: {
        plugins: ['react-native-paper/babel'],
      },
    },
  };
};

