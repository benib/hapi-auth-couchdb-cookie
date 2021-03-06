var Code = require('code'),
  Hapi = require('hapi'),
  Hoek = require('hoek'),
  Lab = require('lab'),
  execSync = require('child_process').execSync;

/**
 * Test shortcuts
 */
var lab = exports.lab = Lab.script(),
  describe = lab.describe,
  it = lab.it,
  expect = Code.expect;

describe('scheme', function() {
  /**
   * Register a new user in Couch
   * @param {Function} done The callback
   */
  lab.before(function(done) {
    execSync(
      'curl -X PUT http://localhost:5984/_users/org.couchdb.user:tester ' +
      '-H "Accept: application/json" -H "Content-Type: application/json" ' +
      '-d \'{"name": "tester", "password": "pw", "roles": [], "type": "user"}\''
    );
    done();
  });

  /**
   * Remove the test user in Couch
   * @param {Function} done The callback
   */
  lab.after(function(done) {
    execSync(
      'curl -X DEL http://localhost:5984/_users/org.couchdb.user:tester'
    );
    done();
  });

  it('authenticates a request', function(done) {
    var server = new Hapi.Server();

    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true, {
        validateFunc: function(session, callback) {
          var override = Hoek.clone(session);
          override.something = 'new';

          return callback(null, session.name === 'tester', override);
        }
      });

      server.route({
        method: 'POST',
        path: '/login',
        config: {
          auth: {
            mode: 'try'
          },
          handler: function(request, reply) {
            request.auth.session.authenticate(
              request.payload.username,
              request.payload.password,
              function(authError, credentials) {
                expect(authError).to.not.exist();
                expect(credentials).to.exist();
                expect(credentials.name).to.equal('tester');
                reply(request.payload.username + request.payload.password);
              }
            );
          }
        }
      });

      server.route({
        method: 'GET',
        path: '/resource',
        handler: function(request, reply) {
          expect(request.auth.credentials.something).to.equal('new');
          return reply('resource');
        }
      });

      server.inject({
        method: 'POST',
        url: '/login',
        payload: '{"username":"tester","password":"pw"}'
      }, function(validResponse) {
        expect(validResponse.result).to.equal('testerpw');

        var header = validResponse.headers['set-cookie'];
        expect(header.length).to.equal(1);

        var cookie = header[0].split(';');

        server.inject({
          method: 'GET',
          url: '/resource',
          headers: {
            cookie: cookie[0]
          }
        }, function(resourceResponse) {
          expect(resourceResponse.statusCode).to.equal(200);
          expect(resourceResponse.headers['set-cookie']).to.not.exist();
          expect(resourceResponse.result).to.equal('resource');
          done();
        });
      });
    });
  });

  it('denies a request without auth', function(done) {
    var server = new Hapi.Server();

    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true, {
        validateFunc: function(session, callback) {
          var override = Hoek.clone(session);
          override.something = 'new';

          return callback(null, session.name === 'tester', override);
        }
      });

      server.route({
        method: 'GET',
        path: '/resource',
        handler: function(request, reply) {
          expect(request.auth.credentials.something).to.equal('new');
          return reply('resource');
        }
      });

      server.inject({
        method: 'GET',
        url: '/resource'
      }, function(resourceResponse) {
        expect(resourceResponse.statusCode).to.equal(401);
        expect(resourceResponse.headers['set-cookie'][0])
          .to.equal('AuthSession=; Max-Age=0; Expires=Thu, ' +
            '01 Jan 1970 00:00:00 GMT');
        done();
      });
    });
  });

  it('fails over to another strategy if not present', function(done) {
    var extraSchemePlugin = function(plugin, options, next) {
      var simpleTestSchema = function() {
        return {
          authenticate: function(request, reply) {
            return reply.continue({
              credentials: {
                test: 'valid'
              }
            });
          }
        };
      };

      plugin.auth.scheme('simpleTest', simpleTestSchema);
      return next();
    };

    extraSchemePlugin.attributes = {
      name: 'simpleTestAuth'
    };

    var server = new Hapi.Server();

    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true, {
        validateFunc: function(session, callback) {
          var override = Hoek.clone(session);
          override.something = 'new';

          return callback(null, session.name === 'tester', override);
        }
      });

      server.route({
        method: 'GET',
        path: '/login/{username}',
        config: {
          auth: {
            mode: 'try'
          },
          handler: function(request, reply) {
            return reply(request.params.username);
          }
        }
      });

      server.register(extraSchemePlugin, function(registerError) {
        expect(registerError).to.not.exist();

        server.auth.strategy('simple', 'simpleTest');

        server.route({
          method: 'GET',
          path: '/multiple',
          config: {
            auth: {
              mode: 'try',
              strategies: ['default', 'simple']
            },
            handler: function(request, reply) {
              var credentialsTest = request.auth.credentials &&
                request.auth.credentials.test || 'NOT AUTH';
              return reply('multiple ' + credentialsTest);
            }
          }
        });

        server.inject('/multiple', function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.result).to.equal('multiple valid');
          done();
        });
      });
    });
  });

  it('ends a session', function(done) {
    var server = new Hapi.Server();
    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true, {
        validateFunc: function(session, callback) {
          var override = Hoek.clone(session);
          override.something = 'new';

          return callback(null, session.name === 'tester', override);
        }
      });

      server.route({
        method: 'POST',
        path: '/login',
        config: {
          auth: {
            mode: 'try'
          },
          handler: function(request, reply) {
            request.auth.session.authenticate(
              request.payload.username,
              request.payload.password,
              function() {
                reply(request.payload.username);
              }
            );
          }
        }
      });

      server.route({
        method: 'GET',
        path: '/logout',
        handler: function(request, reply) {
          request.auth.session.clear();
          return reply('logged-out');
        }
      });

      server.route({
        method: 'GET',
        path: '/resource',
        handler: function(request, reply) {
          expect(request.auth.credentials.something).to.equal('new');
          return reply('resource');
        }
      });

      server.inject({
        method: 'POST',
        url: '/login',
        payload: '{"username":"tester","password":"pw"}'
      },
      function(res) {
        expect(res.result).to.equal('tester');
        var header = res.headers['set-cookie'];
        expect(header.length).to.equal(1);
        var cookie = header[0].split(';');

        server.inject({
          method: 'GET',
          url: '/logout',
          headers: {
            cookie: cookie[0]
          }
        }, function(logoutRes) {
          expect(logoutRes.statusCode).to.equal(200);
          expect(logoutRes.result).to.equal('logged-out');

          var logoutHeader = logoutRes.headers['set-cookie'];
          expect(logoutHeader.length).to.equal(1);
          expect(logoutHeader[0])
            .to.equal('AuthSession=; Max-Age=0; Expires=Thu, ' +
              '01 Jan 1970 00:00:00 GMT');
          var logoutCookie = logoutHeader[0].split(';');

          server.inject({
            method: 'GET',
            url: '/resource',
            headers: {
              cookie: logoutCookie[0]
            }
          }, function(resourceResponse) {
            expect(resourceResponse.statusCode).to.equal(401);
            expect(resourceResponse.headers['set-cookie'][0])
              .to.equal('AuthSession=; Max-Age=0; Expires=Thu, ' +
                '01 Jan 1970 00:00:00 GMT');
            expect(resourceResponse.result).to.not.equal('resource');
            done();
          });
        });
      });
    });
  });

  it('fails a request with invalid session', function(done) {
    var server = new Hapi.Server();
    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true, {
        validateFunc: function(session, callback) {
          var override = Hoek.clone(session);

          override.something = 'new';

          return callback(null, session.user === 'tester', override);
        }
      });

      server.route({
        method: 'POST',
        path: '/login',
        config: {
          auth: {
            mode: 'try'
          },
          handler: function(request, reply) {
            request.auth.session.authenticate(
              request.payload.username,
              request.payload.password,
              function(authError, credentials) {
                expect(credentials).to.not.exist();
                expect(authError).to.exist();
                reply(request.payload.username);
              }
            );
          }
        }
      });

      server.route({
        method: 'GET',
        path: '/resource',
        handler: function(request, reply) {
          expect(request.auth.credentials.something).to.equal('new');
          return reply('resource');
        }
      });

      server.inject({
        method: 'POST',
        url: '/login',
        payload: '{"username":"invalid","password":"pw"}'
      },
      function(res) {
        expect(res.result).to.equal('invalid');
        expect(res.headers['set-cookie'][0])
          .to.equal('AuthSession=; Max-Age=0; Expires=Thu, ' +
            '01 Jan 1970 00:00:00 GMT');

        server.inject({
          method: 'GET',
          url: '/resource',
          headers: {
            cookie: ''
          }
        }, function(resourceRes) {
          expect(resourceRes.headers['set-cookie'][0])
            .to.equal('AuthSession=; Max-Age=0; Expires=Thu, ' +
              '01 Jan 1970 00:00:00 GMT');
          expect(resourceRes.statusCode).to.equal(401);
          done();
        });
      });
    });
  });

  it('logs in and authenticates a request', function(done) {
    var server = new Hapi.Server();
    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true);

      server.route({
        method: 'POST',
        path: '/login',
        config: {
          auth: {
            mode: 'try'
          },
          handler: function(request, reply) {
            request.auth.session.authenticate(
              request.payload.username,
              request.payload.password,
              function() {
                reply(request.payload.username + request.payload.password);
              }
            );
          }
        }
      });

      server.route({
        method: 'GET',
        path: '/resource',
        handler: function(request, reply) {
          expect(request.auth.credentials.name).to.equal('tester');
          return reply('resource');
        }
      });

      server.inject({
        method: 'POST',
        url: '/login',
        payload: '{"username":"tester","password":"pw"}'
      },
      function(validResponse) {
        expect(validResponse.result).to.equal('testerpw');
        var header = validResponse.headers['set-cookie'];
        expect(header.length).to.equal(1);
        var cookie = header[0].split(';');

        server.inject({
          method: 'GET',
          url: '/resource',
          headers: {
            cookie: cookie[0]
          }
        }, function(resourceResponse) {
          expect(resourceResponse.statusCode).to.equal(200);
          expect(resourceResponse.result).to.equal('resource');
          done();
        });
      });
    });
  });

  it('errors in validation function', function(done) {
    var server = new Hapi.Server();
    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true, {
        validateFunc: function(session, callback) {
          return callback(new Error('boom'));
        }
      });

      server.route({
        method: 'POST',
        path: '/login',
        config: {
          auth: {
            mode: 'try'
          },
          handler: function(request, reply) {
            request.auth.session.authenticate(
              request.payload.username,
              request.payload.password,
              function() {
                reply(request.payload.username);
              }
            );
          }
        }
      });

      server.route({
        method: 'GET',
        path: '/resource',
        handler: function(request, reply) {
          expect(request.auth.credentials.name).to.equal('tester');
          return reply('resource');
        }
      });

      server.inject({
        method: 'POST',
        url: '/login',
        payload: '{"username":"tester","password":"pw"}'
      },
      function(validResponse) {
        expect(validResponse.result).to.equal('tester');
        var header = validResponse.headers['set-cookie'];
        expect(header.length).to.equal(1);
        var cookie = header[0].split(';');

        server.inject({
          method: 'GET',
          url: '/resource',
          headers: {
            cookie: cookie[0]
          }
        }, function(resourceResponse) {
          expect(resourceResponse.statusCode).to.equal(401);
          expect(resourceResponse.headers['set-cookie'][0])
            .to.equal('AuthSession=; Max-Age=0; Expires=Thu, ' +
              '01 Jan 1970 00:00:00 GMT');
          done();
        });
      });
    });
  });

  it('clear cookie on invalid', function(done) {
    var server = new Hapi.Server();
    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true);

      server.route({
        method: 'GET',
        path: '/',
        handler: function(request, reply) {
          return reply();
        }
      });

      server.inject({
        url: '/',
        headers: {
          cookie: 'AuthSession=123456'
        }
      }, function(res) {
        expect(res.statusCode).to.equal(401);
        expect(res.headers['set-cookie'][0])
          .to.equal('AuthSession=; Max-Age=0; Expires=Thu, ' +
            '01 Jan 1970 00:00:00 GMT');
        done();
      });
    });
  });

  it('accepts a custom CouchDB url', function(done) {
    var server = new Hapi.Server();
    server.connection();
    server.register(require('../'), function(error) {
      expect(error).to.not.exist();

      server.auth.strategy('default', 'couchdb-cookie', true, {
        couchdbUrl: 'http://localhost:6984'
      });

      server.route({
        method: 'GET',
        path: '/',
        handler: function(request, reply) {
          return reply();
        }
      });

      server.inject({
        url: '/',
        headers: {
          cookie: 'AuthSession=123456'
        }
      }, function(res) {
        expect(res.statusCode).to.equal(500);
        done();
      });
    });
  });

  describe('redirection', function() {
    it('sends to login page (uri without query)', function(done) {
      var server = new Hapi.Server();
      server.connection();
      server.register(require('../'), function(error) {
        expect(error).to.not.exist();

        server.auth.strategy('default', 'couchdb-cookie', true, {
          redirectTo: 'http://example.com/login',
          appendNext: true
        });

        server.route({
          method: 'GET',
          path: '/',
          handler: function(request, reply) {
            return reply('never');
          }
        });

        server.inject('/', function(res) {
          expect(res.statusCode).to.equal(302);
          expect(res.headers.location)
            .to.equal('http://example.com/login?next=%2F');
          done();
        });
      });
    });

    it('skips when route override', function(done) {
      var server = new Hapi.Server();
      server.connection();
      server.register(require('../'), function(error) {
        expect(error).to.not.exist();

        server.auth.strategy('default', 'couchdb-cookie', true, {
          redirectTo: 'http://example.com/login',
          appendNext: true
        });

        server.route({
          method: 'GET',
          path: '/',
          handler: function(request, reply) {
            return reply('never');
          },
          config: {
            plugins: {
              'hapi-auth-couchdb-cookie': {
                redirectTo: false
              }
            }
          }
        });

        server.inject('/', function(res) {
          expect(res.statusCode).to.equal(401);
          done();
        });
      });
    });

    it('skips when redirectOnTry is false in try mode', function(done) {
      var server = new Hapi.Server();
      server.connection();
      server.register(require('../'), function(error) {
        expect(error).to.not.exist();

        server.auth.strategy('default', 'couchdb-cookie', 'try', {
          redirectOnTry: false,
          redirectTo: 'http://example.com/login',
          appendNext: true
        });

        server.route({
          method: 'GET',
          path: '/',
          handler: function(request, reply) {
            return reply(request.auth.isAuthenticated);
          }
        });

        server.inject('/', function(res) {
          expect(res.statusCode).to.equal(200);
          expect(res.result).to.equal(false);
          done();
        });
      });
    });

    it('sends to login page (uri with query)', function(done) {
      var server = new Hapi.Server();
      server.connection();
      server.register(require('../'), function(error) {
        expect(error).to.not.exist();

        server.auth.strategy('default', 'couchdb-cookie', true, {
          redirectTo: 'http://example.com/login?mode=1',
          appendNext: true
        });

        server.route({
          method: 'GET',
          path: '/',
          handler: function(request, reply) {
            return reply('never');
          }
        });

        server.inject('/', function(res) {
          expect(res.statusCode).to.equal(302);
          expect(res.headers.location)
            .to.equal('http://example.com/login?mode=1&next=%2F');
          done();
        });
      });
    });

    it(
      'sends to login and does not append the next query on !appendNext',
      function(done) {
        var server = new Hapi.Server();
        server.connection();
        server.register(require('../'), function(error) {
          expect(error).to.not.exist();

          server.auth.strategy('default', 'couchdb-cookie', true, {
            redirectTo: 'http://example.com/login?mode=1',
            appendNext: false
          });

          server.route({
            method: 'GET',
            path: '/',
            handler: function(request, reply) {
              return reply('never');
            }
          });

          server.inject('/', function(res) {
            expect(res.statusCode).to.equal(302);
            expect(res.headers.location)
              .to.equal('http://example.com/login?mode=1');
            done();
          });
        });
      }
    );

    it('redirect on try', function(done) {
      var server = new Hapi.Server();
      server.connection();
      server.register(require('../'), function(error) {
        expect(error).to.not.exist();

        server.auth.strategy('default', 'couchdb-cookie', true, {
          redirectTo: 'http://example.com/login',
          appendNext: true
        });

        server.route({
          method: 'GET',
          path: '/',
          config: {
            auth: {
              mode: 'try'
            }
          },
          handler: function(request, reply) {
            return reply('try');
          }
        });

        server.inject('/', function(res) {
          expect(res.statusCode).to.equal(302);
          done();
        });
      });
    });
  });
});
