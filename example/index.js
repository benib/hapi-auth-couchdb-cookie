var Hapi = require('hapi');

var home = function (request, reply) {
  reply('<html><head><title>Login page</title></head><body><h3>Welcome '
    + request.auth.credentials.username
    + '!</h3><br/><form method="get" action="/logout">'
    + '<input type="submit" value="Logout">'
    + '</form></body></html>');
};

var login = function(request, reply) {
  if (request.auth.isAuthenticated) {
    return reply.redirect('/');
  }

  var message = '';

  if (request.method === 'post') {
    if (!request.payload.username ||
      !request.payload.password
    ) {
      message = 'Missing username or password';
    }
  }

  if (request.method === 'get' || message) {
    return reply('<html><head><title>Login page</title></head><body>'
      + (message ? '<h3>' + message + '</h3><br/>' : '')
      + '<form method="post" action="/login">'
      + 'Username: <input type="text" name="username"><br>'
      + 'Password: <input type="password" name="password"><br/>'
      + '<input type="submit" value="Login"></form></body></html>');
  }

  return reply.redirect('/');
};

var logout = function (request, reply) {
  request.auth.session.clear(function() {
    return reply.redirect('/');
  });
};

var server = new Hapi.Server();
server.connection({port: 8000});

server.register(require('../'), function() {
  server.auth.strategy('session', 'couchdb-cookie', {
    redirectTo: '/login',
    appendNext: true
  });
});

server.route([
  {
    method: 'GET',
    path: '/',
    config: {
      handler: home,
      auth: 'session'
    }
  }, {
    method: ['GET', 'POST'],
    path: '/login',
    config: {
      handler: login,
      auth: {
        mode: 'try',
        strategy: 'session'
      },
      plugins: {
        'hapi-auth-couchdb-cookie': {
          redirectTo: false
        }
      }
    }
  }, {
    method: 'GET',
    path: '/logout',
    config: {
      handler: logout,
      auth: 'session'
    }
  }
]);

server.start();
console.log('Server started on http://localhost:8000');
