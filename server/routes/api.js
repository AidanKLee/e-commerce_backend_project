const router = require('express').Router();
const items = require('./items');
const reviews = require('./reviews');
const user = require('./user');

// items route
router.use('/items', items);

// reviews route
router.use('/reviews', reviews);

// user route
router.use('/user', user);

module.exports = router;