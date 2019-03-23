const schedule = require('node-schedule');
const db = require('../lib/mongodb');

const j = schedule.scheduleJob('0 * * *', function(){
  await db.collection('order').update({ endDate: { $lte: new Date()}}, { $set: { online: 0 } });
});