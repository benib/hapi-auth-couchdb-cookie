### hapi-auth-couchdb-cookie

[**hapi**](https://github.com/hapijs/hapi) [CouchDB](https://couchdb.apache.org/) Cookie authentication plugin. Heavily inspired by [hapi-auth-cookie](https://github.com/hapijs/hapi-auth-cookie/).

Lead Maintainer: [Robert Katzki](https://github.com/ro-ka)

CouchDB Cookie authentication provides authentication via a CouchDB. It checks the user credentials with a CouchDB and passes the Cookie from CouchDB to the user. All following requests can use the cookie for access. A `validateFunc` can be passed in, in case the cookie's content requires validation on each request. Note that cookie operates as a bearer token and anyone in possession of the cookie content can use it to impersonate its true owner. The `'couchdb-cookie`' scheme takes the following required options:

- `redirectTo` - optional login URI to redirect unauthenticated requests to. Note that using
  `redirectTo` with authentication mode `'try'` will cause the protected endpoint to always
  redirect, voiding `'try'` mode. To set an individual route to use or disable redirections, use the route `plugins` config (`{ config: { plugins: { 'hapi-auth-couchdb-cookie': { redirectTo: false } } } }`).
  Defaults to no redirection.
- `appendNext` - if `true` and `redirectTo` is `true`, appends the current request path to the query component of the `redirectTo` URI using the parameter name `'next'`. Set to a string to use a different parameter name. Defaults to `false`.
- `redirectOnTry` - if `false` and route authentication mode is `'try'`, authentication errors will not trigger a redirection. Requires **hapi** version 6.2.0 or newer. Defaults to `true`;
- `validateFunc` - an optional session validation function used to validate the content of the session cookie on each request. Used to verify that the internal session state is still valid (e.g. user account still exists). The function has the signature `function(session, callback)` where:
    - `session` - is the session object set via `request.auth.session.set()`.
    - `callback` - a callback function with the signature `function(err, isValid, credentials)` where:
        - `err` - an internal error.
        - `isValid` - `true` if the content of the session is valid, otherwise `false`.
        - `credentials` - a credentials object passed back to the application in
          `request.auth.credentials`. If value is `null` or `undefined`, defaults to `session`. If set, will override the current cookie as if `request.auth.session.set()` was called.

Because this scheme decorates the `request` object with session-specific methods, it cannot be registered more than once.

```javascript
var Hapi = require('hapi');

var home = function (request, reply) {
  reply('<html><head><title>Login page</title></head><body><h3>Welcome '
    + request.auth.credentials.name
    + '!</h3><br/><form method="get" action="/logout">'
    + '<input type="submit" value="Logout">'
    + '</form></body></html>');
};

var login = function (request, reply) {
  if (request.auth.isAuthenticated) {
    return reply.redirect('/');
  }

  var message = '',
    account = null;

  if (request.method === 'post') {
    if (!request.payload.username ||
      !request.payload.password
    ) {
      message = 'Missing username or password';
    } else {
      account = users[request.payload.username];
      if (
        !account ||
        account.password !== request.payload.password
      ) {
        message = 'Invalid username or password';
      }
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

  request.auth.session.set(account);
  return reply.redirect('/');
};

var logout = function (request, reply) {
  request.auth.session.clear();
  return reply.redirect('/');
};

var server = new Hapi.Server();
server.connection({ port: 8000 });

server.register(require('hapi-auth-couchdb-cookie'), function (err) {
  server.auth.strategy('session', 'couchdb-cookie', {
    password: 'secret',
    cookie: 'sid-example',
    redirectTo: '/login',
    isSecure: false
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
  },
  {
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
  },
  {
    method: 'GET',
    path: '/logout',
    config: {
      handler: logout,
      auth: 'session'
    }
  }
]);

server.start();
```
