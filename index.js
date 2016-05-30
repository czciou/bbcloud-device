var nconf = require('nconf');
var mongoose = require('mongoose');
require('./models/device');

nconf.argv().env();
var NODE_ENV = nconf.get('NODE_ENV') || 'development';
nconf.file({file: 'config.' + NODE_ENV + '.json'});

mongoose.connect(nconf.get('mongodb'));

require('seneca')()
  .use('device', {
    port: nconf.get('deviceServicePort'),
    secret: nconf.get('secret')
  })
  .use('mongoose-entity', {mongoose})
  .listen({port: nconf.get('seneca:device:port')});
