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
//db.order.insert({orderId:1,adId:1,showTimes:3,wxAppId:"wxb6c5cd631cf7a1c4",wxGameId:"gh_22905d787f66",wxAppParams:"/pages/index/index?channel=464957001",channelName:'测试渠道',adType:1,end_date:'2019-03-31'})
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
  if (errors) return ctx.body = { errors };

  const { adType, deviceId, channelName } = ctx.request.query;
  const channel = await db.collection('channel').findOne({ channelName });
  if (!channel) ctx.throw(400, '渠道不存在');
  let orderList = await db.collection('order').find({ channelName, adType }).toArray();
  const today = moment().format('YYYY-MM-DD');
  orderList = lodash.shuffle(orderList);
  const data = {};
  for (const order of orderList) {
    const repeatDeviceId = await redis.sismember(`clickADdeviceIdSet#${order.orderId}`, deviceId);
    const showTimes = (await redis.get(`showTimes#${order.adId}#${today}`)) || 0;
    if (repeatDeviceId === 0 && parseInt(showTimes) < order.showTimes) { // 没点击过的设备 并且展示次数没达标
      const adInfo = await db.collection('ad').findOne({ adId: order.adId });
      data.adType = adInfo.adType;
      data.adId = order.adId;
      data.orderId = order.orderId;
      data.wxAppId = order.wxAppId;
      data.wxGameId = order.wxGameId;
      data.wxAppParams = order.wxAppParams;
      data.picUrl = adInfo.picUrl;
      data.picMd5 = adInfo.picMd5;
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
    adId: { required: true, type: 'int' }, 
    orderId: { required: true, type: 'int' }, 
    action: { required: true, type: 'string' }, 
    message: { required: false, type: 'string' }, 
  }
  const params = ctx.request.body;
  const errors = common.validate(rules, params);
  if (errors) return ctx.body = { errors };

  const { deviceId, channelName, adId, orderId, action } = ctx.request.body;
  const [ order, ad, channel ] = await Promise.all([
    db.collection('order').findOne({ orderId }),
    db.collection('ad').findOne({ adId }),
    db.collection('channel').findOne({ channelName })
  ]);
  if (!order || !ad || !channel) ctx.throw(400, '上报数据有误');
  const today = moment().format('YYYY-MM-DD');
  if (action === 'click') {
    await redis.sadd(`clickADdeviceIdSet#${orderId}`, deviceId);
    const timeStamp = new Date(`${order.end_date} 23:59:59`).getTime();
    await redis.expireat(`clickADdeviceIdSet#${orderId}`, timeStamp/1000);
  }
  if (action === 'show') {
    await redis.incr(`showTimes#${adId}#${today}`);
    const timeStamp = new Date(`${today} 23:59:59`).getTime();
    await redis.expireat(`showTimes#${adId}#${today}`, timeStamp/1000);
  }

  await db.collection('report').insertOne(params);
  ctx.body = { code: 200, data: {} };
})

module.exports = router
