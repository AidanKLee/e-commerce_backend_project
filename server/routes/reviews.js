const router = require('express').Router();
const db = require('../db');
const { isLoggedIn, jsonParser } = require('../middleware');

router.get('/', async (req, res, next) => {
    try {
        const userId = req.query.user || req.session.passport.user.id
        const results = await db.any(`SELECT reviews.id, rating, review, date, users.id, first_name, last_name, items.id, name AS item_name
        FROM reviews, users, items
        WHERE reviews.user_id = users.id AND reviews.item_id = items.id
        AND users.id = $1`, [ userId ]);
        res.status(200).send(results);
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.post('/', isLoggedIn, jsonParser, async (req, res, next) => {
    const { item_id, rating, review } = req.body;
    try {
        await db.any(`INSERT INTO reviews (user_id, item_id, date, rating, review)
        VALUES ($1, $2, to_timestamp(${Date.now()} / 1000.0), $3, $4)`, [ req.session.passport.user.id, item_id, rating, review ]);
        res.status(200).send('Review submitted.')
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.put('/:reviewId', isLoggedIn, jsonParser, async (req, res, next) => {
    try {
        const { rating, review } = req.body;
        await db.any(`UPDATE reviews SET rating = $1, review = $2 WHERE id = $3 AND user_id = $4`, [ rating, review, req.params.reviewId, req.session.passport.user.id ]);
        res.status(200).send(`Review updated.`)
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.delete('/:reviewId', isLoggedIn, async (req, res, next) => {
    try {
        await db.any(`DELETE FROM reviews WHERE id = $1 AND user_id = $2`, [ req.params.reviewId, req.session.passport.user.id ]);
        res.status(200).send('Review deleted.')
    } catch(err) {
        err.status = 400;
        next(err);
    }
});

module.exports = router;