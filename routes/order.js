const router = require('koa-router')()
const common = require('../lib/common');
const db = require('../lib/mongodb');

router.prefix('/order')

router.post('/insert', async function (ctx, next) {
})

router.post('/query', async function (ctx, next) {
	const rules = {
    index: {required: true, type: 'int'},
    limit: {required: true, type: 'int'},
    online: {required: true, type: 'int'}
	};
	common.params_handler(ctx, rules);
	const {index, limit, online} = ctx.request.body;
	const order = await db.collection('order').find({online}).limit(limit).skip((index-1)*limit).toArray();
	const count = await db.collection('order').count({online});
	ctx.body = { code: 200, data: {list: order, count} };
})

// 订单统计
router.post('/stat', async function (ctx, next) {
	const rules = {
    index: {required: true, type: 'int'},
    limit: {required: true, type: 'int'}
	};
	common.params_handler(ctx, rules);
	const {index, limit} = ctx.request.body;

	// 查询条件
	const query = common.get_request_params(ctx);

	const orderStat = await db.collection('orderStat').find(query).limit(limit).skip((index-1)*limit).toArray();
	const count = await db.collection('orderStat').count(query);
	ctx.body = { code: 200, data: {list: orderStat, count} };
})

// 修改订单上下线
router.post('/updateOrderStatus', async (ctx, next) => {
	const rules = {
		orderId: {required: true, type: 'number'},
		online: {required: true, type: 'int'}
	};
	common.params_handler(ctx, rules);

	const {orderId, online} = ctx.request.body;
	await db.collection('order').update({orderId}, {online});
	ctx.body = { code: 200, data: {} };
})


module.exports = router
