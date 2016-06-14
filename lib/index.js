/**
 * Load modules
 */
var Boom = require('boom'),
  nano = require('nano'),
  cookie = require('cookie');

/**
 * Register the module
 * @param  {Hapi.Server} plugin The server object
 * @param  {Object} config Some options
 * @param  {Function} next To proceed
 */
exports.register = function(plugin, config, next) {
  /**
   * Scheme to define
   * @param  {Hapi.Server} server The server object the scheme is added to.
   * @param  {Object} options Scheme settings
   * @return {Object} Containing an authenticate handler
   */
  plugin.auth.scheme('couchdb-cookie', function(server, options) {
    options = options || {};
    options.couchdbUrl = options.couchdbUrl || 'http://localhost:5984';

    if (typeof options.appendNext === 'boolean') {
      options.appendNext = options.appendNext ? 'next' : '';
    }

    server.ext('onPreAuth', function(request, reply) {
      request.auth.session = {
        /**
         * Authenticate a user
         * @param  {String}   username The username
         * @param  {String}   password The users password
         * @param  {Function} callback The callback for after the authentication
         */
        authenticate: function(username, password, callback) {
          nano(options.couchdbUrl).auth(
            username,
            password,
            function(error, body, headers) {
              if (error || !body.ok) {
                if (error.code === 'ECONNREFUSED') {
                  return reply(error, null, null);
                }

                return callback(
                  Boom.unauthorized(null, 'couchdb-cookie'),
                  null
                );
              }

              var cookieData;

              if (headers && headers['set-cookie']) {
                cookieData = cookie.parse(headers['set-cookie'][0]);

                reply.state(
                  'AuthSession',
                  cookieData.AuthSession,
                  {
                    path: cookieData.Path
                  }
                );
              }

              callback(null, body);
            }
          );
        },

        /**
         * Clear the login state
         */
        clear: function() {
          reply.unstate('AuthSession');
        }
      };

      reply.continue();
    });

    return {
      /**
       * Required function called on each incoming request
       * configured with the authentication scheme
       * @param  {Hapi.Request} request The request object
       * @param  {Hapi.Reply} reply The reply interface
       * @return {?}  A reply
       */
      authenticate: function(request, reply) {
        if (!request.state.AuthSession) {
          return unauthenticated(Boom.unauthorized(null, 'couchdb-cookie'));
        }

        nano({
          url: options.couchdbUrl,
          cookie: cookie.serialize('AuthSession', request.state.AuthSession)
        }).session(function(error, session) {
          if (error) {
            if (error.code === 'ECONNREFUSED') {
              return reply(error, null, null);
            }
            return unauthenticated(Boom.unauthorized(null, 'couchdb-cookie'));
          }

          if (!options.validateFunc) {
            if (session.userCtx.name !== null) {
              return reply.continue({credentials: session.userCtx});
            }
            return unauthenticated(Boom.unauthorized(null, 'couchdb-cookie'));
          }

          options.validateFunc(
            session.userCtx,
            function(validateError, isValid, credentials) {
              if (validateError || !isValid) {
                return unauthenticated(
                  Boom.unauthorized('Invalid cookie'),
                  {credentials: credentials}
                );
              }

              return reply.continue({credentials: credentials});
            }
          );
        });

        /**
         * When the user is unauthenticated
         * @param  {Error} error  An optional error
         * @param  {Object} result The credentials
         * @return {?}  A reply
         */
        function unauthenticated(error, result) {
          reply.unstate('AuthSession');

          if (
            options.redirectOnTry === false &&
            request.auth.mode === 'try'
          ) {
            return reply(error, null, result);
          }

          var redirectTo = options.redirectTo,
            pluginSettings = request.route.settings.plugins[
              'hapi-auth-couchdb-cookie'
            ];

          /* eslint-disable no-undefined */
          if (pluginSettings && pluginSettings.redirectTo !== undefined) {
          /* eslint-enable no-undefined */
            redirectTo = pluginSettings.redirectTo;
          }

          if (!redirectTo) {
            return reply(error, null, result);
          }

          var uri = redirectTo;

          if (options.appendNext) {
            if (uri.indexOf('?') !== -1) {
              uri += '&';
            } else {
              uri += '?';
            }

            var nextValue;
            if (typeof options.getNextValue === 'function') {
              nextValue = options.getNextValue.call(undefined, request);
            } else {
              nextValue = encodeURIComponent(request.url.path);
            }

            uri += options.appendNext + '=' +
             nextValue;
          }

          return reply('You are being redirected...', null, result)
            .redirect(uri);
        }
      }
    };
  });

  next();
};

/**
 * Register attributes
 * @type {Object}
 */
exports.register.attributes = {
  pkg: require('../package.json')
};
