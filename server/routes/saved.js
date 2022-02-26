const db = require('../db');

const router = require('express').Router();

router.get('/', async (req, res, next) => {
    try {
        const results = await db.any(`SELECT items.id, items.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
            FROM items, items_categories, categories, items_discounts, discounts, users, users_saved_items
            WHERE items.id = items_categories.item_id 
            AND items_categories.category_id = categories.id 
            AND items.id = items_discounts.item_id
            AND items_discounts.discount_id = discounts.id
            AND users.id = users_saved_items.user_id
            AND items.id = users_saved_items.item_id
            AND users.id = $1`, [ req.user.id ])
            res.status(200).send(results)
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.post('/:itemId', async (req, res, next) => {
    try {
        await db.any(`INSERT INTO users_saved_items VALUES ($1, $2)`, [ req.user.id, req.params.itemId ]);
        res.status(200).send('Saved to favourites.')
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.delete('/:itemId', async (req, res, next) => {
    try {
        await db.any(`DELETE FROM users_saved_items WHERE user_id = $1 AND item_id = $2`, [ req.user.id, req.params.itemId ]);
        res.status(200).send('Deleted from favourites.');
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

module.exports = router;