const db = require('../db');
const { jsonParser } = require('../middleware');
const router = require('express').Router();

router.get('/', async (req, res, next) => {
    try {
        const results = await db.any(`SELECT id, type, provider, acc_no, expiry, is_primary 
        FROM users_payment WHERE user_id = $1`, [ req.user.id ]);
        res.status(200).send(results);
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.post('/', jsonParser, async (req, res, next) => {
    const { type, provider, acc_no, expiry, is_primary = false } = req.body;
    try {
        await db.any(`INSERT INTO users_payment (user_id, type, provider, acc_no, expiry, is_primary)
        VALUES ($1, $2, $3, $4, $5, $6)`, [ req.user.id, type, provider, acc_no, expiry, is_primary ]);
        res.status(200).send('New payment method added.')
    } catch(err) {
        err.status = 400;
        next(err);
    }
});

router.put('/:paymentId', jsonParser, async (req, res, next) => {
    const { type, provider, acc_no, expiry, is_primary } = req.body;
    try {
        await db.any(`UPDATE users_payment 
        SET type = $1, provider = $2, acc_no = $3, expiry = $4, is_primary = $5
        WHERE id = $6 AND user_id = $7`, [ type, provider, acc_no, expiry, is_primary, req.params.paymentId, req.user.id ]);
        res.status(200).send('Payment method updated.')
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.delete('/:paymentId', async (req, res, next) => {
    try {
        await db.any(`DELETE FROM users_payment WHERE id = $1 AND user_id = $2`, [ req.params.paymentId, req.user.id ]);
        res.status(204).send('Payment method deleted.')
    } catch(err) {
        err.status = 400;
        next(err);
    }
});

module.exports = router;