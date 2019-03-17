const redisConfig = {
    host: '47.107.177.10',
    port: 6379,
    password: 'vsI51Ukdo'
};
const ioredis = require('ioredis');
const redis = new ioredis(redisConfig);

module.exports = redis;