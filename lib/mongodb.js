const mongoose = require('mongoose');

const options = { 
    server: {
        poolSize: 10,
        auto_reconnect: true,
        keepAlive: 10
    }
}

const MONGODB_URL = 'mongodb://47.107.177.10/vsdk';
  
let db = mongoose.connect(MONGODB_URL);
db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
});
module.exports = db;