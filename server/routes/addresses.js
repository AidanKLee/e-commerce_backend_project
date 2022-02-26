const db = require('../db');
const { jsonParser } = require('../middleware');
const router = require('express').Router();

router.get('/', async (req, res, next) => {
    try {
        const results = await db.any('SELECT addresses.id, line_1, line_2, line_3, town, county, postcode, is_primary FROM addresses WHERE user_id = $1', [ req.user.id ]);
        res.status(200).send(results);
    } catch(err) {
        err.status = 400;
        return next(err);
    }
});

router.post('/', jsonParser, async (req, res, next) => {
    const {line_1, line_2, line_3, town, county, postcode, is_primary} = req.body;
    try {
        await db.any('INSERT INTO addresses (line_1, line_2, line_3, town, county, postcode, is_primary, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',[ line_1, line_2, line_3, town, county, postcode, is_primary, req.user.id ]);
        const results = await db.any('SELECT addresses.id, line_1, line_2, line_3, town, county, postcode, is_primary FROM addresses WHERE user_id = $1', [ req.user.id ]);
        res.status(200).send(results);
    } catch (err) {
        err.status = 400;
        return next(err)
    }
});

router.get('/:addressId', async (req, res, next) => {
    try {
        const result = await db.any('SELECT addresses.id, line_1, line_2, line_3, town, county, postcode, is_primary FROM addresses WHERE user_id = $1 AND addresses.id = $2', [ req.user.id, req.params.addressId ]);
        res.status(200).send(result[0])
    } catch (err) {
        err.status = 400;
        return next(err)
    }
});

router.put('/:addressId', jsonParser, async (req, res, next) => {
    const {line_1, line_2, line_3, town, county, postcode, is_primary} = req.body; 
    try {
        await db.any('UPDATE addresses SET line_1 = $1, line_2 = $2, line_3 = $3, town = $4, county = $5, postcode = $6, is_primary = $7 WHERE id = $8 AND user_id = $9', [ line_1, line_2, line_3, town, county, postcode, is_primary, req.params.addressId, req.user.id ]);
        const result = await db.query('SELECT addresses.id, line_1, line_2, line_3, town, county, postcode, is_primary FROM addresses WHERE user_id = $1', [ req.user.id ]);
        res.status(201).send(result[0])
    } catch (err) {
        err.status = 400;
        return next(err)
    }
});

router.delete('/:addressId', async (req, res, next) => {
    try {
        await db.any('DELETE from addresses WHERE id = $1 AND user_id = $2', [ req.params.addressId, req.user.id ]);
        res.status(204).send('If address was users it has been deleted.');
    } catch (err) {
        err.status = 400;
        return next(err)
    }
});

module.exports = router;