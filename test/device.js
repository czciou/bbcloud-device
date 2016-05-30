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
  // it('should return ok ???',function () {
  //   return act('role:device, cmd:exportDevices',{})
  //   .then(function (result) {
  //     console.log('result',result);
  //       expect(result.msg).to.be.a('string');
  //       expect(result.msg).to.be.equals('ok czt');
  //     })
  // });

  it('should create a new device', function() {

      return act('role:mongoose-entity, cmd:create', {
          data:{
            name:'cjj',
            bbcloudDeviceId:'bbid',
            wechatDeviceId:'wchatid',
            aliyunDeviceId:'aliid'
          },
          model:'Device'
      }).then(function(results) {
        console.log('results:',results.name);
        expect(results.name).to.be.a('string');
      });

    });

});
