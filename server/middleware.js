// body parsers
const bodyParser = require('body-parser');

const jsonParser = bodyParser.json();
const urlEncodedParser = bodyParser.urlencoded({ extended: false });

//authentication
const crypto = require('crypto');
const db = require('../server/db');
const { hashPassword } = require('./utils');

const signup = async (req, res, next) => {
    const { first_name, last_name, birth_date, email, phone, password } = req.body;
    const salt = crypto.randomBytes(16).toString();
    try {
        const hash = await hashPassword(password, salt, 310000, 32, 'sha256')
        await db.any('INSERT INTO users (first_name, last_name, birth_date, email, phone, password, salt) VALUES ($1, $2, $3, $4, $5, $6, $7)', [ first_name, last_name, birth_date, email, phone, hash.toString('hex'), salt ]);
        res.redirect('/');
    } catch (err) {
        err.status = 400;
        next(err);
    };

};

const isLoggedIn = (req, res, next) => {
    if (req.session.passport && req.session.passport.loggedIn) {
        next();
    } else {
        res.status(401).send('ERROR 401: You are not authorized for this request.');
    }
}

const isSiteModerator = (req, res, next) => {
    if (req.session.passport && req.session.passport.siteModerator) {
        next();
    } else {
        res.status(401).send('ERROR 401: You are not authorized for this request.');
    }
}

const createId = async (req, res, next) => {
    try {
        const url = req.originalUrl
        let id, type, match = true;
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        while (match === true) {
            if (url.includes('items')) {
                id = 'it'
                type = 'items'
            } else if (url.includes('orders')) {
                id = 'od'
                type = 'orders'
            }
            for (let i = 0; i < 8; i ++) {
                const rand = Math.floor(Math.random() * chars.length);
                id += chars[rand];
            }
            const dbId = await db.any(`SELECT id FROM ${type} WHERE id = $1`, [id]);
            if (dbId.length === 0) {
                match = false;
            }
        }
        req.newId = id;
        next();
    } catch (err) {
        next(err);
    }
}

module.exports = {
    jsonParser, urlEncodedParser,
    signup, isLoggedIn, isSiteModerator,
    createId
}