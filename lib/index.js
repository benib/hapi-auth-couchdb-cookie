/**
 * Load modules
 */
var Boom = require('boom'),
  Hoek = require('hoek'),
  nano = require('nano');

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
    Hoek.assert(options, 'Missing couchdb-cookie auth strategy options');
    Hoek.assert(
      typeof options.validateFunc === 'function',
      'Invalid validateFunc method in configuration'
    );

    // if (typeof settings.appendNext === 'boolean') {
    //   settings.appendNext = (settings.appendNext ? 'next' : '');
    // }

    // server.ext('onPreAuth', function(request, reply) {
    //   request.auth.session = {
    //     clear: function() {
    //       request.auth.artifacts = null;
    //       reply.unstate(settings.cookie);
    //     }
    //   };
    //
    //   return reply.continue();
    // });

    return {
      /**
       * Optional function used to decorate the response with headers
       * @param  {Hapi.Request} request The request object
       * @param  {Hapi.Reply} reply The reply interface
       */
      response: function(request, reply) {
        var pluginData = request.plugins['hapi-auth-couchdb-cookie'];

        if (pluginData && pluginData['set-cookie']) {
          request.response.header('set-cookie', pluginData['set-cookie']);
        }

        reply.continue();
      },

      /**
       * Required function called on each incoming request
       * configured with the authentication scheme
       * @param  {Hapi.Request} request The request object
       * @param  {Hapi.Reply} reply The reply interface
       */
      authenticate: function(request, reply) {
        if (request.headers.cookie) {
          reauthenticate(request.headers.cookie);
          return;
        }

        nano('http://localhost:5984').auth(
          request.params.user,
          request.params.password,
          function(error, body, headers) {
            if (error || !body.ok) {
              return unauthenticated(Boom.unauthorized(null, 'couchdb-cookie'));
            }

            if (headers && headers['set-cookie']) {
              request.plugins['hapi-auth-couchdb-cookie'] = {
                'set-cookie': headers['set-cookie']
              };
            }

            validate(body);
          }
        );

        /**
         * Reauthenticate with the passed cookie
         * @param {String} cookie The cookie to authenticate with
         */
        function reauthenticate(cookie) {
          nano({
            url: 'http://localhost:5984',
            cookie: cookie
          }).session(function(error, session) {
            if (error) {
              return unauthenticated(Boom.unauthorized(null, 'couchdb-cookie'));
            }

            validate(session.userCtx);
          });
        }

        /**
         * When the user validation took place
         * @param {Object}  body   The user credentials
         * @return {?}  A reply
         */
        function validate(body) {
          if (!options.validateFunc) {
            return reply.continue({credentials: body});
          }

          options.validateFunc(
            body,
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
        }

        /**
         * When the user is unauthenticated
         * @param  {Error} error  An optional error
         * @param  {Object} result The credentials
         * @return {?}  A reply
         */
        function unauthenticated(error, result) {
          return reply(error, null, result);

          // if (
          //   options.redirectOnTry === false &&
          //   request.auth.mode === 'try'
          // ) {
          //   return reply(error, null, result);
          // }

          // var redirectTo = options.redirectTo,
          //   pluginSettings = request.route.settings.plugins[
          //     'hapi-auth-couchdb-cookie'
          //   ];
          //
          // if (pluginSettings && pluginSettings.redirectTo) {
          //   redirectTo = pluginSettings.redirectTo;
          // }

          // if (!redirectTo) {
          //   return reply(error, null, result);
          // }

          // var uri = redirectTo;

          // if (options.appendNext) {
          //   if (uri.indexOf('?') !== -1) {
          //     uri += '&';
          //   } else {
          //     uri += '?';
          //   }

          //   uri += options.appendNext + '=' +
          //    encodeURIComponent(request.url.path);
          // }

          // return reply('You are being redirected...', null, result)
          //   .redirect(uri);
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
