var Hapi = require('hapi'),
  server = new Hapi.Server();

server.connection({port: 8000});
server.register(require('../'), function(error) {
  if (error) {
    /* eslint-disable no-console */
    console.error(error);
    /* eslint-enable no-console */
  }

  server.auth.strategy('default', 'couchdb-cookie', true, {
    redirectTo: '/login',
    redirectOnTry: false
  });

  server.route({
    method: 'GET',
    path: '/',
    handler: function(request, reply) {
      return reply(
        '<html><head><title>Login page</title></head><body><h3>Welcome ' +
        request.auth.credentials.username +
        '!</h3><br/><form method="post" action="/logout">' +
        '<input type="submit" value="Logout">' +
        '</form></body></html>'
      );
    }
  });

  server.route({
    method: 'GET',
    path: '/login',
    config: {
      auth: {
        mode: 'try'
      },
      handler: function(request, reply) {
        return reply(
          '<html><head><title>Login page</title></head><body>' +
          '<form method="post" action="/login">' +
          'Username: <input type="text" name="username"><br>' +
          'Password: <input type="password" name="password"><br/>' +
          '<input type="submit" value="Login"></form></body></html>'
        );
      }
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
            return reply.redirect('/');
          }
        );
      }
    }
  });

  server.route({
    method: 'POST',
    path: '/logout',
    config: {
      handler: function(request, reply) {
        request.auth.session.clear();
        return reply.redirect('/');
      }
    }
  });

  server.start();
  /* eslint-disable no-console */
  console.log('Server started on http://localhost:8000');
  /* eslint-enable no-console */
});
