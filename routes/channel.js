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
  const channelId = Math.round(Math.random() * 100000000);
  await db.collection('channel').insertOne({ 
    channelName, 
    channelPkg, 
    channelId, 
    createAt: new Date(), 
    updateAt: new Date(), 
  });
  ctx.body = { code: 200, data: {} };
})

router.post('/query', async function (ctx, next) {
  const channel = await db.collection('channel').find().toArray();
  ctx.body = { code: 200, data: channel };
})

module.exports = router
