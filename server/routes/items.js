const db = require('../db');
const { jsonParser } = require('../middleware');

const router = require('express').Router();

router.get('/', async (req, res, next) => {
    let after = 0;
    if (req.query.after) {
        after = req.query.after;
    }
    let limit = 25;
    if (req.query.limit) {
        limit = req.query.limit;
    }
    let order_by = '10 DESC';
    if (req.query.sort === 'popularity') {
        order_by = '10 DESC'
    } else if (req.query.sort === 'name_a') {
        order_by = '2 ASC'
    } else if (req.query.sort === 'name_d') {
        order_by = '2 DESC'
    } else if (req.query.sort === 'price_a') {
        order_by = '4 ASC'
    }  else if (req.query.sort === 'name_d') {
        order_by = '4 DESC'
    }
    try {
        let results = await db.any(`SELECT items.id, items.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
        FROM items, items_categories, categories, items_discounts, discounts
        WHERE items.id = items_categories.item_id 
        AND items_categories.category_id = categories.id 
        AND items.id = items_discounts.item_id
        AND items_discounts.discount_id = discounts.id 
        ORDER BY ${order_by} LIMIT $1 OFFSET $2`, [ limit, after ])
        results = await Promise.all(results.map(async (result) => {
            let variants = await db.any(`SELECT items_variants.id, items_variants.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
            FROM items_variants, items_categories, categories, items_discounts, discounts
            WHERE items_variants.id = items_categories.variant_id 
            AND items_categories.category_id = categories.id 
            AND items_variants.id = items_discounts.variant_id
            AND items_discounts.discount_id = discounts.id
            AND items_variants.item_id = $1`, [ result.id ])
            variants = variants.map(variant => {return { is_variant: true, ...variant} });
            result = {
                ...result, variants: variants
            }
            return result
        }))
        res.status(200).send(results)
    } catch (err) {
        err.status = 400;
        return next(err);
    }
    
});

router.post('/', jsonParser, async (req, res, next) => {
    const { name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, is_variant, item_id, category_id, discount_id = 1 } = req.body;
        try {
            if (!is_variant) {
                await db.any(`INSERT INTO items (name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [ name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src ])
                const newItem = await db.any(`SELECT id FROM items ORDER BY id DESC LIMIT 1`);
                await db.any(`INSERT INTO items_categories (item_id, category_id)
                VALUES ($1, $2)`, [ newItem[0].id, category_id])
                await db.any(`INSERT INTO items_discounts (item_id, discount_id)
                VALUES ($1, $2)`, [ newItem[0].id, discount_id])
                res.status(200).send('New product uploaded.')
            } else {
                await db.any(`INSERT INTO items_variants (name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, item_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [ name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, item_id ])
                const newItem = await db.any(`SELECT id FROM items_variants ORDER BY id DESC LIMIT 1`);
                await db.any(`INSERT INTO items_categories (variant_id, category_id)
                VALUES ($1, $2)`, [ newItem[0].id, category_id])
                await db.any(`INSERT INTO items_discounts (variant_id, discount_id)
                VALUES ($1, $2)`, [ newItem[0].id, discount_id])
                res.status(200).send('New product uploaded.')
            }
        } catch (err) {
            err.status = 400;
            return next(err);
        }
});

router.get('/:itemId', async (req, res, next) => {
    try {
        let results = await db.any(`SELECT items.id, items.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
        FROM items, items_categories, categories, items_discounts, discounts
        WHERE items.id = items_categories.item_id 
        AND items_categories.category_id = categories.id 
        AND items.id = items_discounts.item_id
        AND items_discounts.discount_id = discounts.id
        AND items.id = $1`, [ req.params.itemId ])
        results = await Promise.all(results.map(async (result) => {
            let variants = await db.any(`SELECT items_variants.id, items_variants.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
            FROM items_variants, items_categories, categories, items_discounts, discounts
            WHERE items_variants.id = items_categories.variant_id 
            AND items_categories.category_id = categories.id 
            AND items_variants.id = items_discounts.variant_id
            AND items_discounts.discount_id = discounts.id
            AND items_variants.item_id = $1`, [ result.id ])
            variants = variants.map(variant => { return {is_variant: true, ...variant} });
            result = {
                ...result, variants: variants
            }
            return result
        }));
        res.status(200).send(results);
    } catch (err) {
        err.status = 400;
        return next(err);
    }
});

router.put('/:itemId', jsonParser, async (req, res, next) => {
    const { name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, is_active, is_variant, category_id, discount_id } = req.body;
    let { item_id } = req.body;
    try {
        if (!is_variant) {
            item_id = req.params.itemId;
            await db.any(`UPDATE items 
                SET name = $1, description = $2, price = $3, stock_quantity = $4, clothing_colour = $5, clothing_size = $6, clothing_type = $7, img_src = $8, is_active = $9
                WHERE id = $10`, [ name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, is_active, req.params.itemId ]);
            await db.any(`UPDATE items_categories SET category_id = $1 WHERE item_id = $2`, [ category_id, req.params.itemId ]);
            await db.any(`UPDATE items_discounts SET discount_id = $1 WHERE item_id = $2`, [ discount_id, req.params.itemId ]);
        } else {
            await db.any(`UPDATE items_variants
                SET name = $1, description = $2, price = $3, stock_quantity = $4, clothing_colour = $5, clothing_size = $6, clothing_type = $7, img_src = $8, is_active = $9, item_id = $10
                WHERE id = $11`, [ name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, is_active, item_id, req.params.itemId ]);
            await db.any(`UPDATE items_categories SET category_id = $1 WHERE item_id = $2`, [ category_id, req.params.itemId ]);
            await db.any(`UPDATE items_discounts SET discount_id = $1 WHERE item_id = $2`, [ discount_id, req.params.itemId ]);
        }
        res.status(200).send(`Item updated.`);
    } catch (err) {
        err.status = 400;
        err.detail = `${err.detail} Make sure all required fields are entered.`
        next(err);
    }    
});

router.get(`/:itemId/reviews`, async (req, res, next) => {
    try {
        const results = await db.any(`SELECT reviews.id, rating, review, date, users.id, first_name, last_name, items.id, name AS item_name
        FROM reviews, users, items
        WHERE reviews.user_id = users.id AND reviews.item_id = items.id
        AND items.id = $1`, [ req.params.itemId ]);
        res.status(200).send(results);
    } catch(err) {
        err.status = 400;
        next(err);
    }
});

module.exports = router;