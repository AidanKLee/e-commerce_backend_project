const express = require('express');
const session = require('express-session');
const cors = require('cors');
const morgan = require('morgan');
const passport = require('passport');
const SQLiteStore = require('connect-sqlite3');
const api = require('./server/routes/api');

const app = express();
const store = new session.MemoryStore();
const PORT = process.env.PORT || 3000;


// root
app.get('/', (req, res, next) => {
    res.send('<h1>Hello World</h1>')
});

// logging
app.use(morgan('dev'));

// authentication
app.use(session({
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: new session.MemoryStore()
}));
passport.serializeUser((user, done) => {
    process.nextTick(() => {
        done(null, { id: user.id, username: user.username })
    });
});
passport.deserializeUser((user, done) => {
    process.nextTick(() => {
        return done(null, user);
    });
});

// router
app.use('/api', api);

// error handling
app.use((err, req, res, next) => {
    console.log(err)
    const status = err.status || 500
    res.status(status).send({
        message: `ERROR ${status}: ${err.detail || err.message}`,
        error: err
    })
})


app.listen(PORT, () => {
    console.log('Listening on PORT: 3000');
});