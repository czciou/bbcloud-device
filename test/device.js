var senecaLib = require('seneca');
var expect = require('chai').expect;
var Promise = require('bluebird');
var nconf = require('nconf');
var path = require('path');

// init config
nconf.argv().env();
var NODE_ENV = nconf.get('NODE_ENV') || 'development';
nconf.file({file: path.join(__dirname, '..', 'config.' + NODE_ENV + '.json')});

// init seneca
var seneca = senecaLib().client(nconf.get('seneca:device:port'));
var act = Promise.promisify(seneca.act, {context: seneca});

describe('device', function() {
  it('should return {msg:"ok"}', function() {
      return act('role:device, cmd:import-devices', {
          aliIdFilePath:path.join(__dirname, '/aliDeviceIds.json'),
          macIdFilePath:path.join(__dirname, '/macIds.xlsx')
      }).then(function(results) {
        expect(results.msg).to.be.a('string');
        expect(results.msg).to.be.equals('ok');
      });
    });

});
