module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // Reanimated 4 a déplacé son transform Babel vers react-native-worklets
    // (react-native-reanimated/plugin ne fait plus que le ré-exporter).
    plugins: ["react-native-worklets/plugin"],
  };
};
