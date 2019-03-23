const router = require('koa-router')()
const db = require('../lib/mongodb');
const redis = require('../lib/redis');
const lodash = require('lodash');
const moment = require('moment');
const common = require('../lib/common');

router.get('/', async (ctx, next) => {
  await ctx.render('index', {
    title: 'Hello Koa 2!'
  })
})
//db.order.insert({orderId:1,adId:1,showTimes:3,wxAppId:"wxb6c5cd631cf7a1c4",wxGameId:"gh_22905d787f66",wxAppParams:"/pages/index/index?channel=464957001",channelName:'测试渠道',adType:1,endDate:'2019-03-31'})
//db.ad.insert({adId:1,adType:1,picUrl:'http:www.1.com',picMd5:'wmasqw123',adName:'测试广告'})
//db.channel.insert({channelId:1,channelName:'测试渠道'})

// 下发广告
router.get('/ad/list', async (ctx, next) => {
  const rules = { 
    adType: { required: true, type: 'int' },
    deviceId: { required: true, type: 'string' },
    channelName: { required: true, type: 'string' }, 
  }
  common.params_handler(ctx, rules);
  const params = ctx.request.query;
  const errors = common.validate(rules, params);
  if (errors) ctx.throw(400, '参数错误');

  const { adType, deviceId, channelName } = ctx.request.query;
  const channel = await db.collection('channel').findOne({ channelName });
  if (!channel) ctx.throw(400, '渠道不存在');
  let orderList = await db.collection('order').find({ channelName, adType, online: 1 }).toArray();
  const today = moment().format('YYYY-MM-DD');
  orderList = lodash.shuffle(orderList);
  const data = {};
  const [ CPC, CPM ] = [ 1, 2 ];
  for (const order of orderList) {
    const repeatDeviceId = await redis.sismember(`clickADdeviceIdSet#${order.orderId}`, deviceId);
    const showTimes = (await redis.get(`showTimes#${order.orderId}`)) || 0;
    const clickTimes = (await redis.get(`clickTimes#${order.orderId}`)) || 0;
    // CPM 展示大于投放数量 或者 CPC 点击大于投放数量 的广告下线
    if (order.amount !== -1 && ((order.payType === CPC && clickTimes > order.amount) || 
    (order.payType === CPM && showTimes > order.amount))) {
      await db.collection('order').updateOne({ orderId: order.orderId }, { $set: { online: 0 }});
      continue;
    }
    // 没点击过的设备 并且同一用户展示次数没达标 
    if (repeatDeviceId === 0 && (order.showTimes === -1 || parseInt(showTimes) < order.showTimes)) { 
      data.adType = order.adType;
      data.orderId = order.orderId;
      data.wxAppId = order.wxAppId;
      data.wxGameId = order.wxGameId;
      data.wxAppParams = order.wxAppParams;
      data.picUrl = order.picUrl;
      data.picMd5 = order.picMd5;
      break;
    }
  }
  ctx.body = { code: 200, data };
})

/**
 * 统计上报
 */
router.post('/report', async (ctx) => {
  const rules = { 
    adType: { required: true, type: 'int' },
    deviceId: { required: true, type: 'string' },
    channelName: { required: true, type: 'string' }, 
    orderId: { required: false, type: 'int' }, 
    action: { required: true, type: 'string' }, 
    message: { required: false, type: 'string' }, 
  }
  const params = ctx.request.body;
  const errors = common.validate(rules, params);
  if (errors) ctx.throw(400, '参数错误');

  const { deviceId, channelName, orderId, action } = ctx.request.body;
  const [ order, channel ] = await Promise.all([
    db.collection('order').findOne({ orderId }),
    db.collection('channel').findOne({ channelName })
  ]);
  if (!order || !channel) ctx.throw(400, '上报数据有误');
  const today = moment().format('YYYY-MM-DD');
  if (action === 'click') {
    await redis.sadd(`clickADdeviceIdSet#${orderId}`, deviceId);
    const timeStamp = new Date(`${order.endDate} 23:59:59`).getTime();
    await redis.expireat(`clickADdeviceIdSet#${orderId}`, timeStamp/1000);
    await redis.incr(`clickTimes#${orderId}`);
    const clickTimeStamp = new Date(`${order.endDate} 23:59:59`).getTime();
    await redis.expireat(`clickTimes#${orderId}`, clickTimeStamp/1000);
  }
  if (action === 'show') {
    await redis.incr(`showTimes#${orderId}`);
    const timeStamp = new Date(`${order.endDate} 23:59:59`).getTime();
    await redis.expireat(`showTimes#${orderId}`, timeStamp/1000);
  }

  await db.collection('report').insertOne(params);
  ctx.body = { code: 200, data: {} };
})

module.exports = router
