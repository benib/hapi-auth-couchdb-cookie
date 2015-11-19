### 3.0.1 (2015-11-19)


#### Bug Fixes

* **scheme:** correctly validate user session ([d6cdc241](https://github.com/ubilabs/hapi-auth-couchdb-cookie/commit/d6cdc241f06c555273b8170163c3023ff87c7c4b))


## 3.0.0 (2015-05-11)

#### BREAKING CHANGES

* request.auth.session.clear() has no callback anymore. Just call it to logout.

#### Features

* **scheme:** simplify logout ([a30ef02e](https://github.com/ubilabs/hapi-auth-couchdb-cookie/commit/a30ef02e0f6dbdc63fb5df5e4bc092bf3a45369c))


## 2.1.0 (2015-05-07)


#### Features

* **scheme:**
  * return error on authentication fail ([a57f5c48](https://github.com/ubilabs/hapi-auth-couchdb-cookie/commit/a57f5c48b29eedcb9550bb215f7925c9c7d1fa22))
  * return credentials on successful auth ([1fee6606](https://github.com/ubilabs/hapi-auth-couchdb-cookie/commit/1fee66065b4cf8b69cb6e2a2ac3f72279f4f62e5))


### 2.0.2 (2015-05-07)


#### Bug fixes

* add a missing dependency for dev mode ([37bea51d](https://github.com/ubilabs/hapi-auth-couchdb-cookie/commit/37bea51dfa96343d7cb240c3bd10b854282e36ee))

## 2.0.0 (2015-05-06)


#### Bug Fixes

* **example:** make example work again ([3d32c7ce](https://github.com/ubilabs/hapi-auth-couchdb-cookie/commit/3d32c7ce0f38c514f617967d2199cc2a177744bc))


#### Features

* **scheme:** let users handle initial authentication ([d282822c](https://github.com/ubilabs/hapi-auth-couchdb-cookie/commit/d282822c1ec20ab907a47f1ed7388496588c4b67))


<a name="1.0.0"></a>
## 1.0.0 (2015-04-24)


#### Features

* **scheme:**
  * allow overriding of username and password ((1b46a2cd))
  * allow dynamic username and password params ((5bb64497))
  * allow CouchDB url config ((90c7e9ef))
  * reset cookie on when unauthenticated ((265bd237))
  * allow redirectOnTry ((9146e229))
  * allow disabling of redirects ((06621a87))
  * redirect to login page ((c084999f))
  * add logout functionality ((6451ea9f))
  * init project

