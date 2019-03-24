const router = require('koa-router')()
const common = require('../lib/common');
const db = require('../lib/mongodb');

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
  const rules = {
    index: {required: true, type: 'int'},
    limit: {required: true, type: 'int'}
  };
  common.params_handler(ctx, rules);
  const {index, limit} = ctx.request.body;
  const channel = await db.collection('channel').find().limit(limit).skip((index-1)*limit).toArray();
  const count = await db.collection('channel').count();
  ctx.body = { code: 200, data: {list:channel, count} };
})

// 渠道活跃统计
router.post('/stat', async function (ctx, next) {
  const rules = {
    index: {required: true, type: 'int'},
    limit: {required: true, type: 'int'}
  };
  common.params_handler(ctx, rules);
  const {index, limit} = ctx.request.body;
  const query = common.get_request_params(ctx);
  const channelStat = await db.collection('orderStat').find(query).limit(limit).skip((index-1)*limit).toArray();
  const count = await db.collection('orderStat').count(query);
  ctx.body = { code: 200, data: {list:channelStat, count} };
})

module.exports = router
