'use strict'

const defaults = require('../defaults.js');
const dyncol = require('dyncol');               // added 2016-12-17
const events = require('events');
const pckg = require('../package.json');
const sequelize = require('sequelize');         // added 2016-12-17
const util = require('util');

const sql = require('mariasql');

const dbGenerator = (options, self) => {
        let dbOptions = Object.assign({}, options.mariasql);
        delete dbOptions.db;
        let db = new sql(dbOptions);
        db.on('ready', () => {
                db.query('CREATE DATABASE IF NOT EXISTS ' + options.mariasql.db, (e, rows) => {
                        if (e) return self.emit('error', e);
                        db.query('use ' + options.mariasql.db, (e2, rows2) => {
                                if (e2) return self.emit('error', e2);
                                db.query(
                                        ('CREATE TABLE IF NOT EXISTS ' + options.table.name +
                                        ' (pk bigint AUTO_INCREMENT PRIMARY KEY, ds_key ' + options.table.keyType +
                                        ', ds_value ' + options.table.valueType +
                                        ', KEY ds_key (ds_key(32)), CONSTRAINT `ds_key_unique` UNIQUE(`ds_key`(32))) ENGINE=InnoDB DEFAULT CHARSET UTF8;'),
                                        (e3, rows3) => {
                                                if (e3) return self.emit('error', e3);
                                                db.query('SHOW TABLES', (e4, rows4) => {
                                                        if (e4) return self.emit('error', e4);
                                                        rows4.forEach((x, i, ar) => {
                                                                self._tableList.push(x.Tables_in_deepstream);
                                                        });
                                                });
                                        }
                                );
                                self.isReady = true;
                                self.emit('ready');
                        });
                });
        });
        db.on('error', (e) => {
                if (e.message.includes(`Unknown database \'${self._dbName}\'`)) {
                        let cleanOptions = Object.assign({}, options);
                        cleanOptions.mariasql = Object.assign({}, options.mariasql);
                        cleanOptions.table = Object.assign({}, options.table);
                        delete cleanOptions.mariasql.db;
                        db = dbGenerator(cleanOptions, self);
                } else self.emit('error', e);
        });
        db.end();
        db.connect();
        return db;
};

class Connector extends events.EventEmitter {
        constructor (options) {
                super();
                if (! (typeof options === 'object')) throw new TypeError('Incorrect connection options passed');
                this.isReady = false;
                this.name = pckg.name;
                this.version = pckg.version;
                options = Object.assign({}, defaults, options);
                options.mariasql = Object.assign({}, defaults.mariasql, options.mariasql);
                options.table = Object.assign({}, defaults.table, options.table);
                if (process.env.ds_host) options.mariasql.host = process.env.ds_host;
                if (process.env.ds_user) options.mariasql.user = process.env.ds_user;
                if (process.env.ds_password) options.mariasql.password = process.env.ds_password;
                if (process.env.ds_databaseName) options.mariasql.db = process.env.ds_databaseName;
                if (process.env.ds_tableName) options.table.name = process.env.ds_tableName;
                if (process.env.ds_keyType) options.table.keyType = process.env.ds_keyType;
                if (process.env.ds_valueType) options.table.valueType = process.env.ds_valueType;
                if (process.env.ds_splitter) options.splitter = process.env.ds_splitter;
                this.options = Object.assign({}, options);
                this._dbName = options.mariasql.db;
                this._table = options.table;
                this._splitter = options.splitter;
                this._tableList = [];
                this._db = dbGenerator(options, this);
        }

        _upsert (tableName, key, value) {
                return new Promise((go, stop) => {

                        if  ( value._v && value._d )    {       // ignore the blank ones

                                var sqlInsertUpdate     =       'INSERT INTO                            '
                                                        +       tableName
                                                        +       ' SET   ds_key          = :ds_key       '
                                                        +       ' ,     ds_value        =               '
                                                        +       (       this._table.valueType.toLowerCase() === 'blob'
                                                                ?       dyncol.createQuery(value)
                                                                :       ':ds_value'
                                                                )
                                                        +       ' ON DUPLICATE KEY UPDATE               '
                                                        +       '       ds_value        =               '
                                                        +       (       this._table.valueType.toLowerCase() === 'blob'
                                                                ?       dyncol.createQuery(value)
                                                                //?     dyncol.updateQuery('ds_value', value)
                                                                :       ':ds_value'
                                                                )
                                                        +       "\n"
                                                        +       "\n"
                                                        +       ';'
                                                        ;
                                this._db.query( sqlInsertUpdate, { ds_key: key, ds_value: JSON.stringify(value) }, { metadata: true}, (e, rows) =>      {
                                        if (e) {
console.log(sqlInsertUpdate);
                                                console.log('update error! ' + e);
                                                return stop(e);
                                        } else {
                                                return go();
                                        }
                                });
                        } else {
                                return go();    // ignore the blank ones
                        }
                });
        }

        set (key, value, callback) {
                var splitted = undefined;
                try {
                         splitted = key.split(this._splitter);
                } catch (e) {
                        return callback(e);
                };
                let tableName = (splitted.length > 1) ? splitted[0] : this.options.table.name;
                if (this._tableList.includes(tableName)) {
                        this._upsert(tableName, key, value).then(() => {
                                return callback(null);
                        }).catch((e) => {
                                return callback(e);
                        });
                } else {
                        this._db.query(
                                ('CREATE TABLE IF NOT EXISTS ' + tableName +
                                ' (pk bigint AUTO_INCREMENT PRIMARY KEY, ds_key ' + this._table.keyType +
                                ', ds_value ' + this._table.valueType +
                                ', KEY `ds_key` (`ds_key`(32)), CONSTRAINT ds_key_unique UNIQUE (`ds_key`(32)) ) ENGINE=InnoDB DEFAULT CHARSET UTF8;'),
                                (e, rows) => {
                                        if (e) return this.emit('error', e);
                                        this._upsert(tableName, key, value).then(() => {
                                                return callback(null);
                                        }).catch((e) => {
                                                return cllback(e);
                                        });
                                }
                        );
                };

        }

        get (key, callback) {
                var splitted = undefined;
                try {
                         splitted = key.split(this._splitter);
                } catch (e) {
                        console.log ('error on split! ' + e );
                        return callback(e);
                };
                let tableName = (splitted.length > 1) ? splitted[0] : this._table.name;

                var sqlSelectType       =       'SELECT DATA_TYPE '
                                        +       ' "result"'
                                        +       ' FROM INFORMATION_SCHEMA.COLUMNS'
                                        +       ' WHERE 1'
                                        +       ' AND TABLE_NAME = '
                                        +       "'"
                                        +       tableName
                                        +       "'"
                                        +       ' AND COLUMN_NAME = '
                                        +       "'"
                                        +       'ds_value'
                                        +       "'"
                                        +       ';'
                                        ;
                this._db.query( sqlSelectType, null, { metadata: true}, (e, results)    =>      {

                        if  (e) {
                                console.log('cannot determine dataType!');
                                return callback(e);
                        }
                        if  ( results[0].result == this._table.valueType.toLowerCase()  )       {

                                let sqlSelect   =       'SELECT                 '
                                                +       (       ( this._table.valueType.toLowerCase() === 'blob' )
                                                        ?       'COLUMN_JSON(`ds_value`)'
                                                        :       '`ds_value`'
                                                        )
                                                +       ' "ds_value"            '       // name the column
                                                +       ' FROM                  '
                                                +       tableName
                                                +       ' WHERE 1               '
                                                +       ' AND ds_key = :ds_key  '
                                                ;
                                this._db.query(sqlSelect, { ds_key: key }, (e, rows) => {
                                        if (e)  {
                                                console.log('error on initial SELECT: ' + e );
                                                return callback(e);
                                                }
                                        if  ( rows[0] ) {
                                                switch  ( this._table.valueType.toLowerCase() ) {
                                                        case    'blob'  :
                                                                var sequelizedJson = sequelize.col(rows[0].ds_value);
                                                                return callback(null, JSON.parse(sequelizedJson.col));
                                                                break;
                                                        case    'text'  :
                                                                return callback(null, JSON.parse(rows[0].ds_value)      );
                                                                break;
                                                }
                                                                        //return callback(null, JSON.parse('{"_v":7,"_d":{"atata":"fake fake!"}}'));
                                        } else {
                                                return callback(null, null);
                                        }
                                });
                        } else {
                                return callback('Datatype does NOT match!');
                        }
                });
        }

        delete (key, callback) {
                var splitted = undefined;
                try {
                         splitted = key.split(this._splitter);
                } catch (e) {
                        return callback(e);
                };
                let tableName = (splitted.length > 1) ? splitted[0] : this._table.name;
                this._db.query('DELETE FROM :tableName WHERE ds_key = :ds_key', { ds_key: key, tableName: tableName }, (e, rows) => {
                        if (e) callback(e);
                        return callback(null);
                });
        }
}

module.exports = Connector
