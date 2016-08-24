# deepstream.io-storage-mariadb [![npm version](https://badge.fury.io/js/deepstream.io-storage-mariadb.svg)](https://badge.fury.io/js/deepstream.io-storage-mariadb)

[deepstream](http://deepstream.io) storage connector for [mariadb](https://mariadb.org/)

This connector uses [the npm mariasql package](https://www.npmjs.com/package/mariasql). Please have a look there for detailed options.

`splitter` option is splitter which may be used to determine dynamic table name as part of key in format `[table<splitter>]key`

Table options are:

* `tableName` (also `table.name` in options passed to constructor) is default table name if not specified as key part
* `keyType` (`table.keyType`) is MariaDB-compatible data type for key
* `valueType` (`table.valueType`) is MariaDB-compatible data type for key

##Basic Setup
```yaml
plugins:
  storage:
    name: deepstream.io-storage-mariadb
    options:
      ds_host: 'localhost'
      ds_user: 'john'
      ds_password: '123'
      ds_databaseName: 'deepstream'
      ds_tableName: 'deepstream_storage'
      ds_keyType: 'text'
      ds_valueType: 'text'
      ds_splitter: '/'
```

```javascript
var Deepstream = require( 'deepstream.io' ),
    MariaDBStorageConnector = require( 'deepstream.io-storage-mariadb' ),
    server = new Deepstream();

server.set( 'storage', new MariaDBStorageConnector( {
  mariasql: {
    host: 'localhost',
    user: 'john',
    password: '123',
    db: 'deepstream',
  },
  table: {
    name: 'deepstream_storage',
    keyType: 'text',
    valueType: 'text',
  },
  splitter: '/',
}));

server.start();
```
