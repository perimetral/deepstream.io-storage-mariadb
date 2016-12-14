# deepstream.io-storage-mariadb [![npm version](https://badge.fury.io/js/deepstream.io-storage-mariadb.svg)](https://badge.fury.io/js/deepstream.io-storage-mariadb) [![Build Status](https://travis-ci.org/perimetral/deepstream.io-storage-mariadb.svg?branch=master)](https://travis-ci.org/perimetral/deepstream.io-storage-mariadb)

[deepstream](http://deepstream.io) storage connector for [mariadb](https://mariadb.org/)

**What is MariaDB?**

MariaDB is database server which is used as drop-in replacement of MySQL. SQL syntax with JSON and GIS additions is accepted as data manipulating format. Scalable and fast solution which uses some NoSQL parts at low-level providing this way classic SQL which is fast like NoSQL like MongoDB. It supports many types of storage engines (all are listed [there](https://mariadb.com/kb/en/mariadb/storage-engines/)) and is pluggable and scalable from microsystems like Raspberry to big data centers.

**Why use MariaDB with Deepstream?**

MariaDB is one of supported connectors for Deepstream which is used for data recording. It is modified to get SQL-based relational storage working with Deepstream data structure which is JSON blobs identified by key. MariaDB is focused on performance of low-level NoSQL mechanisms and stability of classic SQL syntax based data operations.

**Downsides?**

MariaDB is based on top of classic SQL so you need properly working SQL-server to get this connector running. Also there is no SSL-certs authentication yet supported for accessing SQL-server so you must use classic login/password credentials. Also MariaDB doesn't support realtime data streams manipulating.

**Using MariaDB with Deepstream**

Deepstream can connect to MariaDB using the "MariaDB storage connector", a plugin that connects to the database and automatically syncs incoming and outgoing record updates.

**Installing the MariaDB storage connector**

You can install the MariaDB connector via deepstream's commandline interface, using:

`deepstream install storage mariadb`

or in Windows:

`deepstream.exe install storage mariadb`

resulting in deepstream MariaDB connector install command line output.

If you're using deepstream's Node.js interface, you can also install it as an NPM module:

`npm i perimetral/deepstream.io-storage-mariadb`

**Configuring the MariaDB storage connector**

You can configure the storage connector plugin in deepstream with the following options considering there are additional ones which are must be set at SQL-serverside (look [here](https://www.npmjs.com/package/mariasql) for details):

You may use Deepstream YAML config file with such formatting:

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
Where:

* `ds_host`, `ds_user`, `ds_password`: credentials for connecting to compatible SQL-server
* `ds_databaseName`, `ds_tableName`: data preferences (if such database or table are missing new one is created with specified name)
* `ds_keyType`, `ds_valueType`: data types for data recording (all of input will be converted to this types)
* `ds_splitter`: string which determines symbols to split category and exactly key in `key` argument passed for data manipulating

**Usage example**

Here is simple example of connecting and using of MariaDB connector:

```javascript
let ds = require('deepstream.io');
let connector = require('deepstream.io-storage-mariadb');
let server = new ds();

//  AFTER THIS YOU ARE ABLE TO PERFORM ALL OF CLASSIC DEEPSTREAM DATA MANIPULATIONS
//  AND ALL OF THEM WILL BE PROCESSED BY MARIADB CONNECTOR
```

**Configuring from Javascript**

If you installed connector as NPM plugin, you may reconfigure it right in runtime like here:

```javascript
server.set('storage', new connector({
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
```

Do not forget to run `server.start()` after connecting and configuring connector.
