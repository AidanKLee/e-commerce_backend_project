const db = require('../db');
const { isSiteModerator, jsonParser, createId } = require('../middleware');
const router = require('express').Router();

router.get('/', async (req, res, next) => {
    let asUser = '';
    if (!req.session.passport.siteModerator) {
        req.query = {};
        asUser = `AND users.id = ${req.user.id}`
    } else {
        const { userId } = req.query;
        asUser = userId ? `AND users.id = ${userId}` : ''
    }
    try {
        const results = await db.any(`SELECT users.id AS user_id, first_name, last_name,
        orders.id AS order_id, orders.date, dispatch_date, delivery_date, cancelled,
        addresses.id AS address_id, line_1, line_2, line_3, town, county, postcode,
        users_payment.id AS payment_id, acc_no
        FROM addresses, orders, users_payment, users
        WHERE orders.delivery_address_id = addresses.id AND orders.payment_id = users_payment.id AND orders.user_id = users.id
        ${asUser}`)
        const orders = await Promise.all(results.map(async (result) => {
            const items = await db.any(`SELECT items.id, item_quantity, items.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
            FROM orders, orders_items, items, items_categories, categories, items_discounts, discounts
            WHERE items.id = items_categories.item_id AND items_categories.category_id = categories.id 
            AND items.id = items_discounts.item_id AND items_discounts.discount_id = discounts.id
            AND orders_items.order_id = orders.id AND orders_items.item_id = items.id
            AND orders.user_id = $1 AND orders.id = $2`, [ req.user.id, result.order_id ]);
            let variants = await db.any(`SELECT items_variants.id, item_quantity, items_variants.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
            FROM orders, orders_items, items_variants, items_categories, categories, items_discounts, discounts
            WHERE items_variants.id = items_categories.variant_id AND items_categories.category_id = categories.id 
            AND items_variants.id = items_discounts.variant_id AND items_discounts.discount_id = discounts.id
            AND orders_items.order_id = orders.id AND orders_items.variant_id = items_variants.id
            AND orders.user_id = $1 AND orders.id = $2`, [ req.user.id, result.order_id ]);
            variants = variants.map(variant => { return {is_variant: true, ...variant} });
            return { ...result, items: [ ...items, ...variants ] };
        }))
        res.status(200).send(orders);
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.post('/', jsonParser, createId, async (req, res, next) => {
    try {
        let allInStock = true;
        let itemsStock = await db.any(`SELECT items.id AS item_id, NULL AS variant_id, item_quantity, stock_quantity
        FROM cart_items, items WHERE cart_items.item_id = items.id AND cart_items.cart_id = $1
        UNION
        SELECT NULL AS item_id, items_variants.id AS variant_id, item_quantity, stock_quantity
        FROM cart_items, items_variants WHERE cart_items.item_id = items_variants.id AND cart_items.cart_id = $1`, [ req.session.cartId ]);
        itemsStock.forEach(item => {
            if ((item.item_id && item.item_quantity > item.stock_quantity) || (item.variant_id && item.item_quantity > item.stock_quantity)) {
                allInStock = false;
            }
        })
        if (allInStock) {
            const { delivery_address_id, payment_id } = req.body;
            await db.any(`INSERT INTO orders (id, user_id, date, delivery_address_id, payment_id)
            VALUES ($1, $2, to_timestamp(${Date.now()} / 1000.0), $3, $4)`, [ req.newId, req.user.id, delivery_address_id, payment_id ]);
            const items = await db.any(`SELECT * FROM cart_items WHERE cart_id = $1`, [ req.session.cartId ]);
            await Promise.all(items.map(async (item) => {
                if (item.item_id) {
                    await db.any(`INSERT INTO orders_items (order_id, item_id, item_quantity) VALUES ($1, $2, $3)`, [ req.newId, item.item_id, item.item_quantity ])
                } else if (item.variant_id) {
                    await db.any(`INSERT INTO orders_items (order_id, variant_id, item_quantity) VALUES ($1, $2, $3)`, [ req.newId, item.variant_id, item.item_quantity ])
                }
                return {}
            }))
            await Promise.all(itemsStock.map(async (item) => {
                let table, idType;
                if (item.item_id) {
                    table = 'items'
                    idType = item.item_id
                } else {
                    table = 'items_variants'
                    idType = item.variant_id
                }
                await db.any(`UPDATE ${table} SET stock_quantity = stock_quantity - $1
                WHERE id = $2`, [ item.item_quantity, idType ]);
            }))
            return res.status(200).send('Order placed.')
        }
        res.status(200).send("We don't have enough stock for one (or some) of the items you requested.");
    } catch(err) {
        err.status = 400;
        next(err);
    }
});

router.get('/:orderId', async (req, res, next) => {
    let asUser = '';
    if (!req.session.passport.siteModerator) {
        req.query = {};
        asUser = `AND users.id = ${req.user.id}`
    } else {
        const { userId } = req.query;
        asUser = userId ? `AND users.id = ${userId}` : ''
    }
    try {
        const results = await db.any(`SELECT users.id AS user_id, first_name, last_name,
        orders.id AS order_id, orders.date, dispatch_date, delivery_date, cancelled,
        addresses.id AS address_id, line_1, line_2, line_3, town, county, postcode,
        users_payment.id AS payment_id, acc_no
        FROM addresses, orders, users_payment, users
        WHERE orders.delivery_address_id = addresses.id AND orders.payment_id = users_payment.id 
        AND orders.user_id = users.id AND orders.id = $1 ${asUser}`, [ req.params.orderId ]);
        const items = await db.any(`SELECT items.id, item_quantity, items.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
        FROM orders, orders_items, items, items_categories, categories, items_discounts, discounts
        WHERE items.id = items_categories.item_id AND items_categories.category_id = categories.id 
        AND items.id = items_discounts.item_id AND items_discounts.discount_id = discounts.id
        AND orders_items.order_id = orders.id AND orders_items.item_id = items.id
        AND orders.user_id = $1 AND orders.id = $2`, [ req.user.id, req.params.orderId ]);
        let variants = await db.any(`SELECT items_variants.id, item_quantity, items_variants.name, description, price, stock_quantity, clothing_colour, clothing_size, clothing_type, img_src, orders, is_active, categories.id AS category_id, categories.name AS category, discounts.id AS discount_id, discounts.name AS discount_name, active, start_date, end_date, percent_off
        FROM orders, orders_items, items_variants, items_categories, categories, items_discounts, discounts
        WHERE items_variants.id = items_categories.variant_id AND items_categories.category_id = categories.id 
        AND items_variants.id = items_discounts.variant_id AND items_discounts.discount_id = discounts.id
        AND orders_items.order_id = orders.id AND orders_items.variant_id = items_variants.id
        AND orders.user_id = $1AND orders.id = $2`, [ req.user.id, req.params.orderId ]);
        variants = variants.map(variant => { return {is_variant: true, ...variant} });
        const order = { ...results[0], items: [ ...items, ...variants ] };
        res.status(200).send(order);
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.put('/:orderId', jsonParser, async (req, res, next) => {
    try {
        const items = await db.any(`SELECT user_id, item_id, variant_id, item_quantity, dispatch_date FROM orders_items, orders 
        WHERE order_id = orders.id AND user_id = $1 AND orders.id = $2`, [ req.user.id, req.params.orderId ]);
        if (!items[0].dispatch_date) {
            const { delivery_address_id, payment_id, cancelled } = req.body;
            await db.any(`UPDATE orders
            SET delivery_address_id = $1, payment_id = $2, cancelled = $3
            WHERE id = $4 AND user_id = $5`, [ delivery_address_id, payment_id, cancelled, req.params.orderId, req.user.id ]);
            if (cancelled) {
                await Promise.all(items.map(async (item) => {
                    let table, idType;
                    if (item.item_id) {
                        table = 'items';
                        idType = item.item_id;
                    } else if (item.variant_id) {
                        table = 'items_variants';
                        idType = item.variant_id
                    }
                    await db.any(`UPDATE ${table} SET stock_quantity = stock_quantity + $1
                    WHERE id = $2`, [ item.item_quantity, idType ]);
                    return {};
                }))
            }
            return res.status(200).send('Your order has been updated. If you changed payment details, please allow up to 5 working days for the funds to return to your account.')
        }
        res.status(200).send('Your order has already been dispatched.')
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

router.delete('/:orderId', isSiteModerator, async (req, res, next) => {
    try {
        await db.any(`DELETE FROM orders WHERE id = $1`, [ req.params.orderId ]);
        await db.any(`DELETE FROM orders_items WHERE order_id = $1`, [ req.params.orderId ]);
        res.status(204).send();
    } catch (err) {
        err.status = 400;
        next(err);
    }
});

module.exports = router;