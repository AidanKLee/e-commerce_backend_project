const pgp = require('pg-promise')();
const connect = 'postgres://postgres:postgres1234@localhost:5432/ecommerce_store';
const db = pgp(connect);

module.exports = db;