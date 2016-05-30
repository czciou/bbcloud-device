var Promise = require('bluebird');
var cors = require('cors');
var bodyParser = require('body-parser');
var express = require('express');
var nconf = require('nconf');
var mongoose = require('mongoose');
var Device = mongoose.model('Device');
var XLSX = require('xlsx');

module.exports = function(opts) {
  var seneca = this;

  // init actions
  // seneca.add('init:device', init);
  seneca.add('role:device, cmd:import-devices', importDevices);
  seneca.add('role:device, cmd:export-devices', exportDevices);

  var deviceClient = seneca.client({port: nconf.get('seneca:device:port')});
  var act = Promise.promisify(deviceClient.act, {context: deviceClient});

  return;


  function importDevices(args, done) {
    var newDevices = args.devices.map(function (item) {
        return new Device(item);
      })
    Device.insertMany(newDevices,done);
  }

  function exportDevices(query,done) {
    var page = query._page;
    var perPage = query._perPage;
    var sortField = query._sortField;
    var sortDir = query._sortDir;
    var filters = query._filters;

    var skip = parseInt((page - 1) * perPage);
    var limit = parseInt(perPage);
    var sort = {};
    try {sort[sortField] = sortDir.toLowerCase()} catch (err) {}
    try {filters = JSON.parse(req.query._filters)} catch (err) {}

    var model = 'Device';
    act('role:mongoose-entity, cmd:findAll', {
      model, filters, limit, skip, sort
    }).then(function(result) {
      var data = result.entities;
      var range = 'A1:B' + (data.length+1);
        var wb = {
          SSF: XLSX.SSF.get_table(),
          SheetNames: ['设备号导出'],
          Sheets: {
            '设备号导出': {
              '!ref': range,
              A1: {
                v: '微信设备号',
                t: 's'
              },
              B1:{
                v: '阿里设备号',
                t: 's'
              }
            }
          }
        }
        data.forEach(function (item,index) {
          var Arow = 'A'+(index+2);
          var Brow = 'B'+(index+2);
          wb.Sheets['设备号导出'][Arow]={'v':item.wechatDeviceId,'t':'s'};
          wb.Sheets['设备号导出'][Brow]={'v':item.aliyunDeviceId,'t':'s'};
        })
        //TODO response file redictly,without save
        /* write file */
        XLSX.writeFile(wb, 'test.xlsx');
        // res.download('test.xlsx');
        done(null,{filePath:'test.xlsx'});
      }).catch(function (err) {
        console.log(err);
        done(err)
      })
  }


  function init(args, done) {
    // var port = nconf.get('deviceServicePort');
    // var app = express();

    // register middlewares
    // app.use(cors());
    // app.use(bodyParser.json());


    // Register routes
    // app.use(require('./routers/device'));

    // catch 404 and forward to error handler
    // app.use(function(req, res, next) {
    //   var err = new Error('Not Found');
    //   err.status = 404;
    //   next(err);
    // });
    //
    // console.log('express started:' + port);
    // app.listen(port, done);
  }

};
