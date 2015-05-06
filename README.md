### hapi-auth-couchdb-cookie

[**hapi**](https://github.com/hapijs/hapi) [CouchDB](https://couchdb.apache.org/) Cookie authentication plugin, heavily inspired by [hapi-auth-cookie](https://github.com/hapijs/hapi-auth-cookie/).

CouchDB Cookie authentication provides authentication via a CouchDB. It checks the user credentials with a CouchDB and passes the Cookie from CouchDB to the user. All following requests can use the cookie for access. A `validateFunc` can be passed in, in case the cookie's content requires validation on each request. Note that cookie operates as a bearer token and anyone in possession of the cookie content can use it to impersonate its true owner.

## Installation

```bash
npm install hapi-auth-couchdb-cookie --save
```

## Usage

The Plugin works out of the box by just including it, if CouchDB runs on the default port. However, you can customize the behaviour with the properties noted below.

```js
server.register(require('hapi-auth-couchdb-cookie'), function (err) {
  server.auth.strategy('session', 'couchdb-cookie', {});
});
```

Because this scheme decorates the `request` object with session-specific methods, it cannot be registered more than once.

### Options

#### redirectTo
Type `String` | Default `false`

Optional login URI to redirect unauthenticated requests to. Note that using `redirectTo` with authentication mode `'try'` will cause the protected endpoint to always redirect, voiding `'try'` mode. To set an individual route to use or disable redirections, use the route `plugins` config (`{ config: { plugins: { 'hapi-auth-couchdb-cookie': { redirectTo: false } } } }`).

#### appendNext
Type `String|Boolean` | Default `false`

If `true` and `redirectTo` is `true`, appends the current request path to the query component of the `redirectTo` URI using the parameter name `'next'`. Set to a string to use a different parameter name.
Defaults to `false`.

#### redirectOnTry
Type `Boolean` | Default `true`

If `false` and route authentication mode is `'try'`, authentication errors will not trigger a redirection. Requires **hapi** version 6.2.0 or newer.

#### couchdbUrl
Type `String` | Default `http://localhost:5984`

URL of the CouchDB to authenticate to.

#### validateFunc
Type `Function` | Default `function() {}`

An optional session validation function used to validate the content of the session cookie on each request. Used to verify that the internal session state is still valid (e.g. user account still exists). The function has the signature `function(session, callback)` where:
  - `session` - is the session object set via `request.auth.session.set()`.
  - `callback` - a callback function with the signature `function(error, isValid, credentials)` where:
      - `error` - an internal error.
      - `isValid` - `true` if the content of the session is valid, otherwise `false`.
      - `credentials` - a credentials object passed back to the application in `request.auth.credentials`. If value is `null` or `undefined`, defaults to `session`. If set, will override the current cookie as if `request.auth.session.set()` was called.

## Example

See the `/example` folder. To see it in action, run:

```bash
node example/index.js
```

## Contributing

### Development

Run the tests locally

```
npm test
```

### Deployment

To release, run the following

```
npm run release:patch|minor|major
```

## License

The MIT License (MIT)
Copyright © 2015 Ubilabs GmbH <katzki@ubilabs.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
