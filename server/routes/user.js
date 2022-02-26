const router = require('express').Router();

const passport = require('passport');
const { urlEncodedParser, signup, isLoggedIn, jsonParser } = require('../middleware');
const localStrategy = require('../strategies/local');
const db = require('../db');

// user authentication
router.post('/login', urlEncodedParser, passport.authenticate('local'), (req, res, next) => {
    req.session.passport.user = req.user;
    req.session.passport.loggedIn = true;
    res.status(200).send('Login successful!');
});

router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
        if (err) {
            err.status(500);
            return next(err)
        }
        res.redirect('/');
    });
});

router.post('/signup', urlEncodedParser, signup);

// check authorization
router.use('/', isLoggedIn, (req, res, next) => {
    req.user = { id: req.session.passport.user.id };
    next();
});

// user routes
router.get('/', async (req, res, next) => {
    try {
        const result = await db.any('SELECT first_name, last_name, birth_date, email, phone FROM users WHERE id = $1', [ req.user.id ]);
        res.status(200).send(result[0]);
    } catch (err) {
        next(err)
    }
});

router.put('/', jsonParser, async (req, res, next) => {
    try {
        const { email, phone } = req.body;
        await db.any(`UPDATE users SET email = $1, phone = $2 WHERE id = $3`, [ email, phone, req.user.id ])
        const result = await db.any('SELECT first_name, last_name, birth_date, email, phone FROM users WHERE id = $1', [ req.user.id ]);
        res.status(200).send(result[0]);
    } catch (err) {
        next(err)
    }

});

router.delete('/', async (req, res, next) => {
    try {
        await db.any('DELETE FROM users WHERE id = $1', [ req.user.id ]);
        await db.any('DELETE FROM users_payment WHERE user_id = $1', [ req.user.id ]);
        await db.any('DELETE FROM users_saved_items WHERE user_id = $1', [ req.user.id ]);
        await db.any('DELETE FROM reviews WHERE user_id = $1', [ req.user.id ]);
        await db.any('DELETE FROM cart WHERE user_id = $1', [ req.user.id ]);
        req.session.destroy((err) => {
            if (err) {
                err.status(500);
                return next(err)
            }
            res.redirect('/');
        });
    } catch (err) {
        return next(err)
    }
});

const addresses = require('./addresses');
const cart = require('./cart');
const orders = require('./orders');
const payment = require('./payment');
const saved = require('./saved');

// user addresses route
router.use('/addresses', addresses);

// user cart route
router.use('/cart', cart);

// user orders route
router.use('/orders', orders);

// user payment route
router.use('/payment', payment);

// user saved items route
router.use('/saved', saved);

module.exports = router;