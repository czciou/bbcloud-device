var Promise = require('bluebird');
var fs = require('fs');
var cors = require('cors');
var bodyParser = require('body-parser');
var express = require('express');
var nconf = require('nconf');
var mongoose = require('mongoose');
var Device = mongoose.model('Device');
var XLSX = require('xlsx');
var _ = require('underscore');
var UUID = require('node-uuid');

module.exports = function(opts) {
  var seneca = this;

  // init actions
  // seneca.add('init:device', init);
  seneca.add('role:device, cmd:import-devices', importDevices);
  // seneca.add('role:device, cmd:import-devices-parseAliDeviceIds', parseAliDeviceIds);
  // seneca.add('role:device, cmd:export-devices', exportDevices);

  var deviceClient = seneca.client({port: nconf.get('seneca:device:port')});
  var act = Promise.promisify(deviceClient.act, {context: deviceClient});

  return;
  function promiseSequentialize(promiseFactories) {
    var chain = Promise.resolve();
    promiseFactories.forEach(function (promiseFactory) {
      chain = chain.then(promiseFactory);
    });
    return chain;
  }

  function generateBBCloudId(){
    var manufacturerCode = 'AAA',
        toyCode = 'BBBBBB',
        uuid = UUID();
        year = new Date().getFullYear().toString().substring(2,4);

    return manufacturerCode+toyCode+year+uuid;
  }

  function parseMacIds_forReal_XLSX(filePath) {
    if (filePath) {
      return Promise.resolve().then(function () {

        var workbook = XLSX.readFile(filePath);
        /* DO SOMETHING WITH workbook HERE */
        var sheet_name_list = workbook.SheetNames;
        var tempRows = [];
        sheet_name_list.forEach(function(y) { /* iterate through sheets */
          var worksheet = workbook.Sheets[y];
          //tempCount用于记数，只取两列数据
          var tempCount = 0;
          var tempRow ={};
          for (z in worksheet) {
            /* all keys that do not begin with "!" correspond to cell addresses */
            if(z[0] === '!') continue;
            var rowRex = /[A,B,a,b](\d+)/;
            if(rowRex.test(z) && RegExp.$1>1){
              if(tempCount == 0 ){
                tempRow['macId'] = worksheet[z].v;
                tempCount++;
              }  else{
                tempRow['macData'] = worksheet[z].v;
                tempRows.push(tempRow);
                tempCount = 0,tempRow = {};
              }
            }else{
              continue;
            }
          }
        })
        if (tempRows.length==0) {
          done(new Error('file content is empty.'))
        }
        return tempRows;
      }).catch(function (err) {
        console.log('异常在这里出现了');
        // console.log(err);
        throw err;
        // return
      })

    }else{
      done((new Error('filePath is required')),{})
    }
  }

  function parseAliIds_forReal_Json(filePath){
      if (filePath) {

        return new Promise(function (resolve, reject) {
          fs.readFile(filePath, {encoding:'utf-8'}, function (err, bytesRead) {
            if (err) {
              return reject(err);
            }
            var data=JSON.parse(bytesRead);
            resolve(data);
          });
        })
      }else{
        throw new Error('filePath is required')
      }
    }

  function parseMacIds(filePath) {
    return [{macId:'macId1',secret:'sssss1111'},{macId:'macId2',secret:'sssss2222'},{macId:'macId3',secret:'sssss3333'}]
  }

  function parseAliDeviceIds(filePath) {
    return [{device_id:'ali1',device_secret:'ali111'},{device_id:'ali2',device_secret:'ali222'},{device_id:'ali3',device_secret:'ali333'}]
  }
  function requestWechatIds(data) {
    return Promise.resolve().then(function(){
      //对外请求 TODO
      if (!data) {
        data = new Array();
      }
      var secretStr = Math.random()+''
      var newData = {wechatId:'wechat1'+secretStr,secret:secretStr,qrticket:'qrticketString',devicelicence:'devicelicenceString'};
      data.push(newData);
      return data;
    })
  }

  function importDevices(args,done) {
    if (!args.macIdFilePath) {
      done(new Error('macids file is required'))
    }
    if (!args.aliIdFilePath) {
      done(new Error('aliId file is required'))
    }
    Promise.all([parseMacIds_forReal_XLSX(args.macIdFilePath),parseAliIds_forReal_Json(args.aliIdFilePath)])
    .then(function (result) {
      var macIds = result[0];
      var aliIds = result[1];

      console.log('aliIds[0]:',aliIds[0]);
      console.log('macIds[0]:',macIds[0]);
      var wechatRequestArray=[];
      //请求3个设备号
      for (var i = 0; i < 3; i++) {
        wechatRequestArray.push(requestWechatIds)
      }
      promiseSequentialize(wechatRequestArray).then(function (data) {
        //结果 组装 Device
        console.log('data is:',data);
        var devicesArray = new Array();
        data.map(function (item,index) {
          var bbId = generateBBCloudId();
          var deviceData = {
            macAddress:macIds[index].macId,
            bbcloudDeviceId:bbId,
            wechatDeviceId:item.device_id,
            wechatDeviceQrticket:item.qrticket,
            wechatDeviceLicence:item.devicelicence,
            aliyunDeviceId:aliIds[index].device_id,
            aliyunDeviceSecret:aliIds[index].device_secret
          }
          var device = new Device(deviceData);
          devicesArray.push(device);
        })
        if (devicesArray.length==0) {
          done(new Error('insert data is empty'))
        }
        saveMultiRecords(devicesArray);
        done(null,{msg:'ok'});
      })
    }).catch(function (err) {
      console.log('错拉~文件解析出错拉！');
      done(err)
    })
  }

  function saveMultiRecords(devices) {
    var len = devices.length;
    var perSaveNum = 10000;
    var times = Math.ceil(len / perSaveNum);
    var start = 0 ,end = 0;
    for (var i = 0; i < times; i++) {
      console.log('save le %d 次',i);
      start = perSaveNum*i;
      end = (start + perSaveNum)>len?len:(start + perSaveNum);
      var toSaveDevices = devices.slice(start,end)
      Device.insertMany(toSaveDevices)
    }
  }

  //请求微信设备id num:请求数量
  function reqestWechatDeviceIds(num){
    return ['wechatId1','wechatId2','wechatId3','wechatId4','wechatId5','wechatId6'];
  }



  //pause disable
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
          wb.Sheets['设备号导出'][Arow]={'v':item.macData,'t':'s'};
          wb.Sheets['设备号导出'][Brow]={'v':item.macId,'t':'s'};
        })
        //TODO save as a special filename
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
