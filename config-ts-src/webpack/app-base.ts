/**
 * @category Configs
 * @module webpack/app-base
 * @desc
 * Base [Webpack](https://webpack.js.org/) configuration for apps.
 */

import nodeFs from 'fs';
import path from 'path';

import SM from 'sitemap';

import { type Configuration, type WebpackPluginInstance } from 'webpack';

import {
  clone,
  defaults,
  isFunction,
  isObject,
} from 'lodash';

import autoprefixer from 'autoprefixer';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import forge from 'node-forge';

import { DefinePlugin, ProgressPlugin } from 'webpack';
import WorkboxPlugin from 'workbox-webpack-plugin';

import {
  getLocalIdent,
} from '@dr.pogodin/babel-plugin-react-css-modules/utils';

// TODO: Copy-pasted from 'utils/isomorphy/buildInfo' to avoid including that,
// (it requires some modifications of TS configs to work).
export type BuildInfoT = {
  key: string;
  publicPath: string;
  timestamp: string;
  useServiceWorker: boolean;
};

export type OptionsT = {
  babelEnv: string;
  babelLoaderOptions?: object;
  context: string;
  cssLocalIdent?: string;
  dontEmitBuildInfo?: boolean;
  dontUseProgressPlugin?: boolean;
  entry: string | string[];
  fs?: typeof nodeFs;
  keepBuildInfo?: boolean | BuildInfoT;
  mode: 'development' | 'none' | 'production';
  outputPath?: string;
  publicPath?: string;
  sitemap?: string;
  typescript?: boolean;
  workbox?: boolean | object;
};

/**
 * Creates a new Webpack config object, and performs some auxiliary operations
 * on the way.
 * @param {object} ops Configuration params. This allows to modify some
 * frequently changed options in a convenient way, without a need to manipulate
 * directly with the created config object.
 * @param {string} ops.babelEnv Babel environment to use for the Babel
 * compilation step.
 * @param {object} [ops.babelLoaderOptions] Overrides for default Babel options
 * of JSX and SVG files loader.
 * @param ops.context Base URL for resolution of relative config paths.
 * @param {string} [ops.cssLocalIdent=hash:base64:6] The template for
 * CSS classnames generation by the Webpack's `css-loader`; it is passed into
 * the `localIdentName` param of the loader. It should match the corresponding
 * setting in the Babel config.
 * @param {boolean} [ops.dontEmitBuildInfo] If set the `.build-info` file won't
 * be created at the disk during the compilation.
 * @param [ops.dontUseProgressPlugin] Set to not include progress
 *  plugin.
 * @param {string|string[]} ops.entry Entry points for "main" chunk. The config
 * will prepend them by some necessary polyfills, e.g.:
 * ([babel-polyfill](https://babeljs.io/docs/usage/polyfill/),
 * [nodelist-foreach-polyfill](https://www.npmjs.com/package/nodelist-foreach-polyfill)).
 * @param {boolean|object} ops.workbox If evaluates to a truthy value,
 * [Workbox's InjectManifest plugin](https://developers.google.com/web/tools/workbox/modules/workbox-webpack-plugin#injectmanifest_plugin)
 * is added to the array of Webpack plugins, to generate service worker for
 * browser. If the value is an object, it is merged into the options passed
 * into the plugin, otherwise default options are used:
 * ```json
 * {
 *   "importWorkboxFrom": "local",
 *   "swSrc": "@dr.pogodin/react-utils/config/workbox/default.js",
 *   "swDest": "__service-worker.js"
 * }
 * ```
 * If service worker is generated by this option, it will be automatically
 * initiated at the client side by the standard
 * [client-side initialization script](docs/client.md)
 * provided by **@dr.pogodin/react-utils**. Note that `swDest`'s value cannot be
 * overriden by config options provided via `workbox` object.
 * @param {object} [ops.fs] Filesystem to use instead of the Node's FS.
 * @param {boolean|object} [ops.keepBuildInfo] If `true` and a `.build-info`
 *  file from a previous build exists in the context directory, it will be
 *  loaded and used, rather than re-generated by the config factory. It allows
 *  to re-create the Webpack config during a server launch without re-generation
 *  of the build info file created during a previous build (and thus bundled
 *  into the frontend bundle). If an object is provided, it will be used as
 *  the build info, instead of trying to load it from the filesystem. This
 *  feature is intended for testing context.
 * @param {string} ops.mode
 * [Webpack mode](https://webpack.js.org/concepts/mode/).
 * @param {string} [ops.outputPath=build] Optional. Output path for the build.
 * @param {string} ops.publicPath Base URL for the output of the build assets.
 * @param {string} [ops.sitemap] The path to JS or JSON config for sitemap.
 * It can be relative to the context, and can be a factory, which returns
 * the config. The config should be compatible with
 * [`sitemap`](https://www.npmjs.com/package/sitemap) library, and if
 * provided the Webpack config factory will use it to gererate `sitemap.xml`
 * file in the output folder, and then serve it from the app root.
 * @return The generated config will opt to:
 * - Bundle the font assets (EOF, OTF, SVG, TTF, WOFF, WOFF2 files from
 *   the `src/assets/fonts` folder of your source code will be bundled
 *   and output into the `[PUBLIC_PATH]/fonts` folder);
 * - Bundle image assets (GIF, JPEG, JPG, PNG files from any folder of
 *   your source code will be bundled and output into the
 *   `[PUBLIC_PATH]/images` folder);
 * - Bundle SCSS files from any folder of your source code, beside
 *   `node_modules` and its subfolders. The files will be compiled,
 *    bundled and extracted into the `[PUBLIC_PATH]/[CHUNK_NAME].css`
 *    bundles;
 * - Bundle CSS files from any folder of your code. The files will be
 *   bundled and extracted into the `[PUBLIC_PATH]/[CHUNK_NAME].css`
 *   bundles;
 * - Bundle JS, JSX, and SVG files; they will be compiled into the
 *   `[PUBLIC_PATH]/[CHUNK_NAME].js` bundles, using the Babel environment
 *   specified in the factory options, and
 *   [`config/babel/webpack`](./babel-config.js#webpack) config.
 *
 * - The following path aliases will be automatically set:
 * - **`assets`** for `[CONTEXT]/src/assets`;
 * - **`components`** for `[CONTEXT]/src/shared/components`;
 * - **`fonts`** for `[CONTEXT]/src/assets/fonts`;
 * - **`styles`** for `[CONTEXT]/src/styles`.
 *
 * Also `resolve.symlinks` Webpack option is set to *false* to avoid problems
 * with resolution of assets from packages linked with `npm link`.
 *
 * - The following global variables will be emulated inside the output
 *   JS bundle:
 *   - **`BUILD_RNDKEY`** &mdash; A random 32 bit key that can be used
 *     for encryption, it is set just as a global variable accessible in
 *     the code;
 *   - **`BUILD_TIMESTAMP`** &mdash; UTC timestamp of the beginning of
 *     the build;
 *   - **`FRONT_END`** &mdash; It will be set *true* inside the bundle,
 *     so that shared code can use it to determine that it is executed
 *     at the client side.
 *
 * - It also opts to polyfill the `__dirname` global variable,
 *   and to ignore imports of the `fs` Node package;
 *
 * - Also, it will store to the disk (re-writes if exists) the file
 *   `[CONTEXT]/.build-info` which will contain a stringified JSON
 *   object with the following fields:
 *   - **`rndkey`** &mdash; The value set for `BUILD_RNDKEY`;
 *   - **`timestamp`** &mdash; The value set for `BUILD_TIMESTAMP`.
 */
export default function configFactory(ops: OptionsT): Configuration {
  const o: OptionsT & {
    publicPath: string;
  } = defaults(clone(ops), {
    babelLoaderOptions: {},
    cssLocalIdent: '[hash:base64:6]',
    outputPath: 'build/web-public',
    publicPath: '',
  });

  const fs = ops.fs || nodeFs;

  /* TODO: This works in practice, but being async and not awaited it is a bad
   * pattern. */
  if (o.sitemap) {
    const sitemapUrl = path.resolve(o.context, o.sitemap);
    /* eslint-disable global-require, import/no-dynamic-require */
    let source = require(sitemapUrl);
    if (isFunction(source)) source = source();
    /* eslint-enable global-require, import/no-dynamic-require */
    const sm = new SM.SitemapStream();
    source.forEach((item: string) => sm.write(item));
    sm.end();
    SM.streamToPromise(sm).then((sitemap: any) => {
      const outUrl = path.resolve(o.context, o.outputPath!);
      if (!fs.existsSync(outUrl)) fs.mkdirSync(outUrl);
      fs.writeFileSync(
        path.resolve(o.context, o.outputPath!, 'sitemap.xml'),
        sitemap,
      );
    });
  }

  // TODO: Once all assets are named by hashes, we probably don't need build
  // info anymore beside the key, which can be merged into stats object?
  // On the other hand, it is still handy to have to pass around the build
  // timestamp, and any other similar information to the actual app, so it
  // can be used in some scenarious.
  let buildInfo;
  const buildInfoUrl = path.resolve(o.context, '.build-info');

  if (o.keepBuildInfo) {
    // If "true" - attempt to load from the filesystem.
    if (o.keepBuildInfo === true) {
      if (fs.existsSync(buildInfoUrl)) {
        buildInfo = JSON.parse(fs.readFileSync(buildInfoUrl, 'utf8'));
      }

    // Otherwise we assume .keepBuildInfo value itself is the build info object
    // to use in the build.
    } else buildInfo = o.keepBuildInfo;
  }

  // Even if "keepBuildInfo" option was provided, we still generate a new
  // build info object in case nothing could be loaded.
  if (!buildInfo) {
    buildInfo = Object.freeze({
      /* A random 32-bit key, that can be used for encryption. */
      key: forge.random.getBytesSync(32),

      /* Public path used during build. */
      publicPath: o.publicPath,

      /* `true` if client-side code should setup a service worker. */
      useServiceWorker: Boolean(o.workbox),

      // Build timestamp.
      timestamp: new Date().toISOString(),
    });
  }

  // If not opted-out, we write the build info to the filesystem. We also attach
  // it to the factory function itself, so it can be easily accessed right after
  // the factory call in testing scenarios.
  if (!o.dontEmitBuildInfo) {
    // Note: this is needed if "fs" option is provided, to ensure the factory
    // does not crash if the folder is not created in that filesystem.
    fs.mkdirSync(o.context, { recursive: true });

    fs.writeFileSync(buildInfoUrl, JSON.stringify(buildInfo));
  }

  /* Entry points normalization. */
  const entry = [
    'core-js/stable',
    'regenerator-runtime/runtime',
    'nodelist-foreach-polyfill',
    ...Array.isArray(o.entry) ? o.entry : [o.entry],
  ];

  const plugins: WebpackPluginInstance[] = [
    new DefinePlugin({ BUILD_INFO: JSON.stringify(buildInfo) }),
  ];

  if (!ops.dontUseProgressPlugin) plugins.push(new ProgressPlugin());

  /* Adds InjectManifest plugin from WorkBox, if opted to. */
  if (o.workbox) {
    if (!isObject(o.workbox)) o.workbox = {};
    plugins.push(new WorkboxPlugin.InjectManifest({
      swSrc: path.resolve(__dirname, '../workbox/default.js'),
      ...o.workbox as object,
      swDest: '__service-worker.js',
    }));
  }

  return {
    context: o.context,
    entry,
    node: {
      __dirname: true,
    },
    mode: o.mode,
    output: {
      chunkFilename: '[contenthash].js',
      filename: '[contenthash].js',
      path: path.resolve(__dirname, o.context, o.outputPath!),
      publicPath: `${o.publicPath}/`,
    },
    plugins,
    resolve: {
      alias: {
        // Aliases to JS an JSX files are handled by Babel.
        assets: path.resolve(o.context, 'src/assets'),
        components: path.resolve(o.context, 'src/shared/components'),
        fonts: path.resolve(o.context, 'src/assets/fonts'),
        styles: path.resolve(o.context, 'src/styles'),
      },
      extensions: [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.json',
        '.scss',
      ],
      symlinks: false,
    },
    module: {
      rules: [{
        /* Loads font resources from "src/assets/fonts" folder. */
        test: /\.(eot|otf|svg|ttf|woff2?)$/,
        include: [
          /node_modules/,
          /src[/\\]assets[/\\]fonts/,
        ],
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[contenthash][ext][query]',
        },
      }, {
        /* Loads JS and JSX moudles, and inlines SVG assets. */
        test: ops.typescript ? /\.((j|t)sx?|svg)$/ : /\.(jsx?|svg)$/,
        exclude: [/node_modules/],
        loader: 'babel-loader',
        options: {
          babelrc: false,
          configFile: false,
          envName: o.babelEnv,
          presets: [['@dr.pogodin/react-utils/config/babel/webpack', {
            typescript: ops.typescript,
          }]],
          ...o.babelLoaderOptions,
        },
      }, {
        /* Loads image assets. */
        test: /\.(gif|jpe?g|png)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[contenthash][ext][query]',
        },
      }, {
        /* Loads SCSS stylesheets. */
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader, {
            loader: 'css-loader',
            options: {
              modules: {
                getLocalIdent,
                localIdentName: o.cssLocalIdent,

                // This flag defaults `true` for ES module builds since css-loader@7.0.0:
                // https://github.com/webpack-contrib/css-loader/releases/tag/v7.0.0
                // We'll keep it `false` to avoid a breaking change for dependant
                // projects, and I am also not sure what are the benefits of
                // named CSS exports anyway.
                namedExport: false,
              },
            },
          }, {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [autoprefixer],
              },
            },
          }, 'resolve-url-loader', {
            loader: 'sass-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      }, {
        /* Loads CSS stylesheets. It is assumed that CSS stylesheets come only
        * from dependencies, as we use SCSS inside our own code. */
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      }],
    },
  };
}
