const db = require('../db');

const router = require('express').Router();

router.get('/', async (req, res, next) => {
    try {
        let cart = await db.any(`SELECT * FROM cart WHERE user_id = $1`, [ req.user.id ]);
        const items = await db.any(`SELECT items.id, item_quantity, items.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
        FROM cart, cart_items, items, items_categories, categories, items_discounts, discounts
        WHERE items.id = items_categories.item_id AND items_categories.category_id = categories.id 
        AND items.id = items_discounts.item_id AND items_discounts.discount_id = discounts.id
        AND cart_items.cart_id = cart.id AND cart_items.item_id = items.id
        AND cart.user_id = $1`, [ req.user.id ]);
        let variants = await db.any(`SELECT items_variants.id, item_quantity, items_variants.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
        FROM cart, cart_items, items_variants, items_categories, categories, items_discounts, discounts
        WHERE items_variants.id = items_categories.variant_id AND items_categories.category_id = categories.id 
        AND items_variants.id = items_discounts.variant_id AND items_discounts.discount_id = discounts.id
        AND cart_items.cart_id = cart.id AND cart_items.variant_id = items_variants.id
        AND cart.user_id = $1`, [ req.user.id ]);
        variants = variants.map(variant => { return {is_variant: true, ...variant} });
        cart = { ...cart[0], items: [ ...items, ...variants ] }
        req.session.cartId = cart.id;
        res.send(cart)
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.post('/', async (req, res, next) => {
    try {
        let cart = await db.any(`SELECT * FROM cart WHERE user_id = $1`, [ req.user.id ]);
        if (cart.length === 0) {
            await db.any(`INSERT INTO cart (user_id, date_created, date_edited) VALUES ($1, to_timestamp(${Date.now()} / 1000.0), to_timestamp(${Date.now()} / 1000.0))`, [ req.user.id ]);
            let cart = await db.any(`SELECT * FROM cart WHERE user_id = $1`, [ req.user.id ]);
            cart = { ...cart[0], cart_items: [] };
            req.session.cartId = cart.id;
            res.status(200).send(cart);
        } else {
            const err = new Error()
            err.status = 400;
            err.detail = 'Cart already exists for this user.';
            next(err);
        }
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.delete('/', async (req, res, next) => {
    try {
        const cartId = req.session.cartId
        await db.any(`DELETE FROM cart WHERE id = $1`, [ cartId ]);
        await db.any(`DELETE FROM cart_items WHERE cart_id = $1`, [ cartId ]);
        res.status(204).send('Shopping cart deleted.')
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.post('/:itemId', async (req, res, next) => {
    try {
        const { is_variant } = req.query;
        const cartId = req.session.cartId;
        if (!is_variant) {
            await db.any(`INSERT INTO cart_items (cart_id, item_id) VALUES ($1, $2)`, [ cartId, req.params.itemId ]);
        } else {
            await db.any(`INSERT INTO cart_items (cart_id, variant_id) VALUES ($1, $2)`, [ cartId, req.params.itemId ]);
        }
        res.status(200).send('Item added to cart.');
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.delete('/:itemId', async (req, res, next) => {
    try {
        const { is_variant } = req.query;
        const cartId = req.session.cartId;
        if (!is_variant) {
            await db.any('DELETE FROM cart_items WHERE cart_id = $1 AND item_id = $2', [ cartId, req.params.itemId ]);
        } else {
            await db.any('DELETE FROM cart_items WHERE cart_id = $1 AND variant_id = $2', [ cartId, req.params.itemId ]);
        }
        res.status('Item deleted from cart.')
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.put('/:itemId/:quantity', async (req, res, next) => {
    try {
        const { is_variant } = req.query;
        const cartId = req.session.cartId;
        if (!is_variant) {
            await db.any(`UPDATE cart_items SET item_quantity = $1 WHERE cart_id = $2 AND item_id = $3`, [ req.params.quantity, cartId, req.params.itemId ]);
        } else {
            await db.any(`UPDATE cart_items SET item_quantity = $1 WHERE cart_id = $2 AND variant_id = $3`, [ req.params.quantity, cartId, req.params.itemId ]);
        }
        res.status(200).send('Item quantity updated.')
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

module.exports = router;