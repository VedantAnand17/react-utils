# Server
Easy creation and launch of web-server with standard configuration, that serves
a ReactJS application with or without server-side rendering, supports
development tools (Hot Module Reloading), and can be further configured for
the needs of specific projects.

**Why?** &mdash; Each ReactJS application demands a web-server, and there is
a bunch of generic boilerplate code involved. Here is our solution to this,
which allows to create a simple, but functional, web-server in a moment, and
permits to further configurate it for specific use.

*NOTE:* It is supposed that this server, even with zero configration, supports
most standard ReactJS setups: i.e. with or without server-side rendering and/or
Redux. However, the current code was spawned out from a specific codebase that
used Redux and server-side rendering. Should you experience any problems in any
other use case, don't hesitate to attract attention to your issues and propose
fixes/enhancements!

### Details
Technically, our server solution consists of three parts: `build/{type}/server/renderer`
takes care about the actual rendering of HTML template, injection of config and
server-side rendered ReactJS markup; `build/{type}/server/server` creates and configures
ExpressJS server; and `build/{type}/server` assemble them together, sets up and launches
the native NodeJS server that exposes ExpressJS to the outside world.

For the practical use, staring the server is as easy as:
```js
import { server } from '@dr.pogodin/react-utils`;
import webpackConfig from 'config/webpack/production.js`;

const options = {}; // A number of extra options can be provided here.

server(webpackConfig, options);
```

The `serverFactory(webpackConfig, options)` function initializes, and launches
the server, and it returns a Promise that resolves to an object with two fields,
`expressServer` and `httpServer` that contain the created and launched servers.

The first argument of the factory, `webpackConfig` is the Webpack config used to
build the frontend bundle: in production mode server takes out of it `context`,
`publicPath`, and some other params; in development mode the entire config is
necessary to run ExpressJS in development mode.

The second argument, `options`, is optional; it allows to pass in the following
props:
- **`Application`** &mdash; *Component* &mdash; Optional. The root ReactJS
  component of the app. If provided, server will perform server-side rendering,
  and it will inject the rendered markup into the HTML template it serves.
- **`beforeRender`** &mdash; *Function(req, config)* &mdash; Optional. The hook to be
  executed right before the generation of HTML template of the page.

  **Arguments:**
  - **`req`** &mdash; *Object* &mdash; ExpressJS HTTP request;
  - **`config`** &mdash; *Object* &mdash; App config that server wants to inject
    into HTML page template;
  
  **Returns:** Promise that resolves to an object with the following fields:
  - **`configToInject`** &mdash; *Object* &mdash; Optional. The actual config
    object
    to be injected into the page. If omitted, the one proposed by the server
    will be used.
  - **`extraScripts`** &mdash; *Object[]* | *String[]* &mdash; Additional script
    tags to be injected into the page. Each script given as a string will be
    injected in the end of document's `<body>`, but immediately before the main
    application bundle. Each script given as object should have two fields:
    `code` specifies the actual code to inject, and `location` which specifies
    location, where the script should be injected. Possible locations are
    given in the `server.SCRIPT_LOCATIONS` object:
    - `server.SCRIPT_LOCATIONS.BODY_OPEN` - right after the openning `<body>`
      tag;
    - `server.SCRIPT_LOCATIONS.DEFAULT` - default locations described above;
    - `server.SCRIPT_LOCATIONS.HEAD_OPEN` - right after the openning `<head>`
      tag;

    When a few scripts have the same location, they all are injected into that
    location in the order they are given in the `extraScripts` array.

  - **`store`** &mdash; *Object* &mdash; Redux store which state will be
    injected into HTML template as the initial state of the app.

- **`devMode`** &mdash; *Boolean* &mdash; Optional. Specifies, whether the
  server should be launched in the development mode.
- **`favicon`** &mdash; *String* &mdash; Optional. Path to the favicon to be
  served by the server.
- **`https`** &ndash; *Object* &ndash; Optional. Should be an object with two
  string fields:
  - **`cert`** &ndash; *String* &ndash; SSL sertificate;
  - **`key`** &ndash; *String* &ndash; SSL key.
- **`httpsRedirect`** &ndash; *Boolean* &ndash; Redirects all incoming HTTP
  requests to the https access.

  For this to work on *localhost* you'll have to create and properly install
  a self-signed SSL certificate on your system. Instructions in this article
  should help: [How to get HTTPS working on your local development environment in 5 minutes](https://medium.freecodecamp.org/how-to-get-https-working-on-your-local-development-environment-in-5-minutes-7af615770eec)

- **`logger`** &ndash; *Object* &ndash; The logger to use. By default Winston
  logger with console transport is used.
- **`onExpressJsSetup`** &mdash; *Function* &mdash; Custom setup of ExpressJS
  server. Express server instance will be passed in as the only argument to this
  function.
- **`port`** &mdash; *Number|String* &mdash; The port to be used by the server.
