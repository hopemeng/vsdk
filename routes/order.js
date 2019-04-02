const router = require('koa-router')()
const common = require('../lib/common');
const db = require('../lib/mongodb');
const multer  = require('koa-multer')
const upload = multer({ dest: 'uploads/' })
const moment = require('moment');

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
	const rules = {
		orderName: { type: 'string', required: true }, // 订单名称
		startDate: { type: 'date', required: true }, // 投放开始日期
		endDate: { type: 'date', required: true }, // 投放开始日期
		adOwner: { type: 'string', required: true }, // 广告主
		adType: { type: 'int', required: true }, // 广告类型 1 闪屏 2 插屏
		picUrl: { type: 'string', required: true }, // 广告图片url
		picMd5: { type: 'string', required: true }, // 广告图片md5值
		appName: { type: 'string', required: true }, // 应用名称
		appType: { type: 'int', required: true }, // 应用类型 1 小程序，2 H5
		wxAppId: { type: 'string', required: true }, // 微信小程序的appid
		wxGameId: { type: 'string', required: true }, // 程序原始id
		wxAppParams: { type: 'string', required: true }, // 需要传给小程序的自定义参数
		payType: { type: 'int', required: true }, // 付费方式 1 CPC，2 CPM
		channelName: { type: 'array', required: true }, // 渠道名称
		showType: { type: 'int', required: true }, // 展示类型 1 投放期间，2 每天
	}
	common.params_handler(ctx, rules);
	const reqBody = ctx.request.body;

	if ( reqBody.orderId ) {
		await _updateOrder(ctx);
	} else {
		await _insertOrder(ctx);
	}
})

async function _updateOrder(ctx) {
	console.log('_updateOrder');
	let reqBody = ctx.request.body,
        promoteAppKeys = [
        	'appName',
        	'appDescription',
			'wxAppId',
			'wxGameId',
			'wxAppParams',
        ],
        updateFields = {};

    for (let key in reqBody) {
        updateFields[key] = reqBody[key];
    }
    updateFields.createTime = moment(updateFields.createTime).format('YYYY-MM-DD HH:mm:ss');

    let insertAppObj = {};
    promoteAppKeys.map((key) => {
        insertAppObj[key] = reqBody[key];
    })

    if (!reqBody.adId) {
    	let adId = (Math.random()*10000000).toFixed();
    	updateFields.adId = insertAppObj.adId = adId;
    	console.log('insert promote_app', insertAppObj);
    	await db.collection('promote_app').insert(insertAppObj);
    }

    console.log('insert order', updateFields);
    await db.collection('order').updateOne({orderId: reqBody.orderId}, {'$set': updateFields});

    ctx.body = { code: 200, data: {} };
}

async function _insertOrder(ctx) {
	console.log('_insertOrder')
	let reqBody = ctx.request.body,
        promoteAppKeys = [
        	'appName',
        	'appDescription',
			'wxAppId',
			'wxGameId',
			'wxAppParams',
        ],
        insertObj = {};

    for (let key in reqBody) {
        insertObj[key] = reqBody[key];
    }
    insertObj.createTime = moment().format('YYYY-MM-DD HH:mm:ss');

    let insertAppObj = {};
    promoteAppKeys.map((key) => {
        insertAppObj[key] = reqBody[key];
    })

    // 未选择应用
    if ( !reqBody.adId ) {
    	let adId = (Math.random()*10000000).toFixed();
    	insertObj.adId = insertAppObj.adId = adId;
    	console.log('insert promote_app', insertAppObj);
    	await db.collection('promote_app').insertOne(insertAppObj);
    }

    let orderId = (Math.random()*10000000).toFixed();
    insertObj.orderId = orderId;
    insertObj.online = 0;
    console.log('insert order', insertObj);
    await db.collection('order').insertOne(insertObj);

	ctx.body = { code: 200, data: {} };
}

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

// 应用
router.post('/getAllPromoteApp', async (ctx, next) => {
	const list = await db.collection('promote_app').find().limit(100).toArray();
	ctx.body = { code: 200, data: list };
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
		hasData: {'$ne': 0},
		show: {'$ne': 0},
		close: {'$ne': 0},
		click: {'$ne': 0}
	};
	if ( reqBody.appName ) query.appName = reqBody.appName;
	if ( reqBody.orderId ) query.orderId = reqBody.orderId;
	if ( reqBody.startDate ) {
		query.statDate = query.statDate || {};
		query.statDate['$gte'] = moment(reqBody.startDate).format('YYYY-MM-DD');
	}
	if ( reqBody.endDate ) {
		query.statDate = query.statDate || {};
		query.statDate['$lte'] = moment(reqBody.endDate).format('YYYY-MM-DD');
	}

	// 联盟加的字段
	['1', '2', '3'].includes(query.orderId) && (query.orderId=+query.orderId);

	const orderStat = await db.collection('orderStat').find(query).limit(limit).skip(index*limit).toArray();
	const count = await db.collection('orderStat').countDocuments(query);
	ctx.body = { code: 200, data: {list: orderStat, count} };
})

// 修改订单上下线
router.post('/updateOrderOnline', async (ctx, next) => {
	const rules = {
		orderId: {required: true, type: 'string'},
		online: {required: true, type: 'int'}
	};
	common.params_handler(ctx, rules);

	const {orderId, online} = ctx.request.body;
	console.log(orderId, online);
	await db.collection('order').update({orderId}, {'$set': {online}});
	ctx.body = { code: 200, data: {} };
})

module.exports = router
