const router = require('koa-router')()
const common = require('../lib/common');
const db = require('../lib/mongodb');
const moment = require('moment');

router.prefix('/channel')

router.post('/insert', async function (ctx, next) {
  const rules = { 
    channelPkg: { required: true, type: 'string' },
    channelName: { required: true, type: 'string' }, 
  }
  common.params_handler(ctx, rules);
  const params = ctx.request.body;
  const errors = common.validate(rules, params);
  if (errors) ctx.throw(400, '参数错误');

  const { channelPkg, channelName } = ctx.request.body;
  const channel = await db.collection('channel').findOne({ channelName });
  if (channel) ctx.throw(400, '渠道已存在，添加失败');
  await db.collection('channel').insertOne({ 
    channelName, 
    channelPkg, 
    createAt: new Date(), 
    updateAt: new Date(), 
  });
  ctx.body = { code: 200, data: {} };
})

router.post('/query', async function (ctx, next) {
  // const rules = {
  //   index: {required: false, type: 'int'},
  //   limit: {required: false, type: 'int'}
  // };
  // common.params_handler(ctx, rules);
  const {index=0, limit=100} = ctx.request.body;
  const channel = await db.collection('channel').find().limit(limit).skip(index*limit).toArray();
  const count = await db.collection('channel').countDocuments();
  ctx.body = { code: 200, data: {list:channel, count} };
})

// 渠道活跃统计
router.post('/stat', async function (ctx, next) {
  const rules = {
    index: {required: true, type: 'int'},
    limit: {required: true, type: 'int'}
  };
  common.params_handler(ctx, rules);
  const {index, limit, hostChannel, startDate, endDate} = ctx.request.body;
  const query = {};
  if ( startDate ) {
    query.statDate = query.statDate || {};
    query.statDate['$gte'] = moment(startDate).format('YYYY-MM-DD');
  }
  if ( endDate ) {
    query.statDate = query.statDate || {};
    query.statDate['$lte'] = moment(endDate).format('YYYY-MM-DD');
  }
  hostChannel && (query.channelName=hostChannel);
  console.log(query)
  const channelStat = await db.collection('channelStat').find(query).limit(limit).skip(index*limit).toArray();
  const count = await db.collection('channelStat').countDocuments(query);
  ctx.body = { code: 200, data: {list:channelStat, count} };
})

module.exports = router
