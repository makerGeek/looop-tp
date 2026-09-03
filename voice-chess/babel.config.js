module.exports = function (api) {
  api.cache(true);
  return {
    // `babel-preset-expo` already wires up Reanimated's worklets plugin and the
    // Expo Router entry transform, so nothing else belongs here.
    presets: ['babel-preset-expo'],
  };
};
