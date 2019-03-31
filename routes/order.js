const router = require('koa-router')()
const common = require('../lib/common');
const db = require('../lib/mongodb');
const multer  = require('koa-multer')
const upload = multer({ dest: 'uploads/' })

router.prefix('/order')

router.post('/upload', upload.single('picture'), async function (ctx, next) {
	const file = ctx.req.file;
	const data = {
		picUrl: `${__dirname}/${file.path}`,
		picMd5: file.filename,
	}
	ctx.body = { code: 200, data };
})

router.post('/insert', async function (ctx, next) {
})

router.post('/query', async function (ctx, next) {
	const rules = {
    index: {required: true, type: 'int'},
    limit: {required: true, type: 'int'},
    online: {required: true, type: 'int'}
	};
	common.params_handler(ctx, rules);
	const {index, limit, isOnline} = ctx.request.body;
	const query = {};

	isOnline && (query.online = Number(isOnline));

	const order = await db.collection('order').find(query).limit(limit).skip(index*limit).toArray();
	const count = await db.collection('order').countDocuments(query);
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
	const reqBody = ctx.request.body;
	const query = {
		index: reqBody.index,
		limit: reqBody.limit
	};
	if ( reqBody.promoteAppName ) query.appName = reqBody.promoteAppName;
	if ( reqBody.orderId ) query.orderId = reqBody.orderId;
	if ( reqBody.startDate ) {
		query.statDate = query.statDate || {};
		query.statDate['$gte'] = new Date(reqBody.startDate);
	}
	if ( reqBody.endDate ) {
		query.statDate = query.statDate || {};
		query.statDate['$lte'] = new Date(reqBody.endDate);
	}

	const orderStat = await db.collection('orderStat').find(query).limit(limit).skip(index*limit).toArray();
	const count = await db.collection('orderStat').countDocuments(query);
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
