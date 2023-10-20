/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */

module.exports = function buildConfig(env) {
  let factory = require(`./config/webpack/lib-${env}.js`);
  factory = 'default' in factory ? factory.default : factory;

  const config = factory({
    context: __dirname,
    entry: './src',
    library: '@dr.pogodin/react-utils',
  });

  /* The lib config is intended for use outside of this very package,
   * so we need some tweaks here to make it work for this package itself. */
  const babelLoader = config.module.rules.find(
    (x) => x.loader === 'babel-loader',
  );
  babelLoader.options.presets[0][0] = `${__dirname}/config/babel/webpack`;

  return config;
};
