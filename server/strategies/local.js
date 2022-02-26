const db = require('../db');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const { passwordMatch } = require('../utils');

passport.use(new LocalStrategy(async (username, password, next) => {
    try {
        const result = await db.any('SELECT * FROM users WHERE email = $1', [ username ]);
        if (result.length === 0) {
            return next(null, false, { message: 'Incorrect email.' })
        } else {
            const { salt } = result[0];
            const isMatch = await passwordMatch(password, salt, 310000, 32, 'sha256', result[0].password)
                    if (!isMatch) {
                return next(null, false, { message: 'Incorrect password.' })
            }
            next(null, result[0]);
        }
    } catch (err) {
        next(err)
    }
}))