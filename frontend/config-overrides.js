// config-overrides.js
module.exports = function override(config, env) {
  config.module.rules.push({
    test: /\.html$/,
    loader: "html-loader",
    options: {
      minimize: true,
    }
  });
  return config;
};