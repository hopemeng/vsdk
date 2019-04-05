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
    const repeatDeviceId = parseInt(await redis.sismember(`clickADdeviceIdSet#${order.orderId}`, deviceId));
    const showTimes = parseInt((await redis.get(`showTimes#${order.orderId}`)) || 0);
    const clickTimes = parseInt((await redis.get(`clickTimes#${order.orderId}`)) || 0);
    // CPM 展示大于投放数量 或者 CPC 点击大于投放数量 的广告下线
    if (order.amount !== -1 && ((order.payType === CPC && clickTimes > order.amount) || 
    (order.payType === CPM && showTimes > order.amount))) {
      await db.collection('order').updateOne({ orderId: order.orderId }, { $set: { online: 0 }});
      continue;
    }
    // 没点击过的设备
    if (repeatDeviceId === 0) { 
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
    adType: { required: false, type: 'int' },
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
  if (!channel) ctx.throw(400, '上报数据有误');
  const today = moment().format('YYYY-MM-DD');
  const everyDayExpireTime = (new Date(moment().add(3, 'day').format('YYYY-MM-DD')).getTime()) / 1000;
  let totalExpireTime = 10;
  if (order) totalExpireTime = (new Date(moment(order.endDate).add(3, 'day').format('YYYY-MM-DD')).getTime()) / 1000;
  const pipe = redis.pipeline(false);

  if (action === 'click') { // 点击
    // 点击广告的设备集合
    pipe.sadd(`clickADdeviceIdSet#${orderId}`, deviceId);
    pipe.expireat(`clickADdeviceIdSet#${orderId}`, totalExpireTime);
    // 广告点击总数
    pipe.incr(`clickTimes#${orderId}`);
    pipe.expireat(`clickTimes#${orderId}`, totalExpireTime);

    // 广告每日点击总数
    pipe.incr(`clickTimes#${orderId}#${today}`);
    pipe.expireat(`clickTimes#${orderId}#${today}`, everyDayExpireTime);
  }

  if (action === 'show') { // 展示
    // 广告展示总数
    pipe.incr(`showTimes#${orderId}`);
    pipe.expireat(`showTimes#${orderId}`, totalExpireTime);
    // 广告每日展示总数
    pipe.incr(`showTimes#${orderId}#${today}`);
    pipe.expireat(`showTimes#${orderId}#${today}`, everyDayExpireTime);
    // 广告每日展示去重用户数
    pipe.sadd(`showADdeviceIdSet#${orderId}#${today}`, deviceId);
    pipe.expireat(`showADdeviceIdSet#${orderId}#${today}`, everyDayExpireTime);
  }
  if (action === 'close') { // 关闭
    // 广告每日关闭总数
    pipe.incr(`closeTimes#${orderId}#${today}`);
    pipe.expireat(`closeTimes#${orderId}#${today}`, everyDayExpireTime);
  }
  if (action === 'has_data') { // 请求成功有数据
    // 每日请求成功有数据总数
    pipe.incr(`hasDataTimes#${orderId}#${today}`);
    pipe.expireat(`hasDataTimes#${orderId}#${today}`, everyDayExpireTime);
  }

  // 记录渠道每日活跃用户数
  pipe.sadd(`channelActiveDeviceIdSet#${channelName}#${today}`, deviceId);
  pipe.expireat(`channelActiveDeviceIdSet#${channelName}#${today}`, everyDayExpireTime);
  await pipe.exec();
  await db.collection('report').insertOne(params);
  ctx.body = { code: 200, data: {} };
})

module.exports = router
