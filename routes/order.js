const router = require('koa-router')()
const common = require('../lib/common');
const db = require('../lib/mongodb');

router.prefix('/order')

router.post('/insert', async function (ctx, next) {
})

router.post('/query', async function (ctx, next) {
  const order = await db.collection('order').find().toArray();
  ctx.body = { code: 200, data: order };
})

module.exports = router
