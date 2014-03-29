// includes
var noble = require('noble');
var util = require("util");
var events = require("events");

// load in configuration
var config = require('../config');


// pattern IDs
exports.PATTERNS = {
  DigitalRain: 0x1,
  Light: 0x2,
  Off: 0x3,
  Flame: 0x4,
  Halo: 0x5,
  Spiral: 0x6,
  Rave: 0x7,
  Weather: 0x8,
  Spin: 0x9,
  Strobe: 0xA,
  Lava: 0xB,
  Rainbow: 0xC,
  Lines: 0xD,
  Sparkle: 0xE,
  BinaryClock: 0xF,
  Hourglass: 0x10,
  Fireworks: 0x11,
  Plasma: 0x12,
  Glow: 0x16,
  Pulse: 0x17
}



// constructor
function Ion(mac_address) {
  this.mac_address = mac_address;
  this.found_lamp = false;
  this.connected = false;
  this.auto_reconnect = false;
  this.ready = false;
}

// turn the ion object into an eventemitter
util.inherits(Ion, events.EventEmitter);


Ion.prototype.isConnected = function() {
  return this.connected;
};


Ion.prototype.isReady = function() {
  return this.ready;
};


// setup the connection and handle discovery
Ion.prototype.connect = function() {
  var self = this;

  // start scanning
  noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      noble.startScanning();
    } else {
      noble.stopScanning();
    }
  });

  // find lamps
  noble.on('discover', function(peripheral) {
    var advertisement = peripheral.advertisement;
    var mac = peripheral.uuid;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (localName && serviceUuids[0]) {
      if (serviceUuids[0] === config.lampUuid && !self.found_lamp && mac === self.mac_address) {
        self.found_lamp = true;
        self.emit('discovered');
        noble.stopScanning();
        self.device = peripheral;
        discover_lamp();
      }
    }
  });

  function discover_lamp() {
    self.device.on('disconnect', function() {
      self.connected = false;
      self.emit('disconnected');

      if (self.auto_reconnect) {
        // TODO
      }
    });

    // connect to device
    self.device.connect(function(error) {
      if (!error) {
        self.connected = true;
        self.emit('connected');
      } else {
        self.emit('error', error);
      }

      self.device.discoverServices([], function(error, services) {
        for (var i=0; i<services.length; i++) {
          if (services[i].uuid === config.lampUuid) {
            services[i].discoverCharacteristics([], function(error, characteristics) {
              for (var j=0; j<characteristics.length; j++) {
                // found the control characteristic
                if (characteristics[j].uuid === config.controlChar) {
                  self.controlCharacteristic = characteristics[j];

                  self.ready = true;

                  // discovery complete
                  self.emit('ready');
                }
              }
            });
          }
        }
      });
    });
  }
};

Ion.prototype.disconnect = function() {
  if (this.connected) {
    this.device.disconnect();
    this.ready = false;
  }
};


// set the active pattern of the lamp
Ion.prototype.setPattern = function(pattern_id, cb) {
  var self = this;

  // sets pattern
  self.controlCharacteristic.write(new Buffer([2, pattern_id]), false, function(err) {
    if (err && cb)
      cb(err);
    else if (cb)
      cb(null);
  });
};


// set a pattern config option
Ion.prototype.setPatternConfig = function(pattern_id, config_id, config_param, cb) {
  var self = this;

  var buf = new Buffer(11);
  buf.writeUInt8(0x3, 0);               // op code (set pattern config)
  buf.writeUInt32LE(pattern_id, 1);     // pattern ID (32 bit)
  buf.writeUInt8(0x1, 5);               // number of config items (just one)
  buf.writeUInt8(config_id, 6);         // config ID for this pattern
  buf.writeUInt32LE(config_param, 7);   // actual value to configure (32 bit)

  self.controlCharacteristic.write(buf, false, function(err) {
    if (err && cb)
      cb(err);
    else if (cb)
      cb(null);
  });
};


// set two pattern config options
Ion.prototype.setPatternConfigDouble = function(pattern_id, config_id_one, config_param_one, config_id_two, config_param_two, cb) {
  var self = this;

  var buf = new Buffer(16);
  buf.writeUInt8(0x3, 0);                     // op code (set pattern config)
  buf.writeUInt32LE(pattern_id, 1);           // pattern ID (32 bit)
  buf.writeUInt8(0x2, 5);                     // number of config items (two)
  buf.writeUInt8(config_id_one, 6);           // config ID 1 for this pattern
  buf.writeUInt32LE(config_param_one, 7);     // actual value 1 to configure (32 bit)
  buf.writeUInt8(config_id_two, 11);          // config ID 2 for this pattern
  buf.writeUInt32LE(config_param_two, 12);    // actual value 2 to configure (32 bit)

  self.controlCharacteristic.write(buf, false, function(err) {
    if (err && cb)
      cb(err);
    else if (cb)
      cb(null);
  });
};


// put the lamp into dfu mode
Ion.prototype.setDfuMode = function(cb) {
  var self = this;

  // sets pattern
  self.controlCharacteristic.write(new Buffer([6]), false, function(err) {
    if (err && cb)
      cb(err);
    else if (cb)
      cb(null);
  });
};


Ion.prototype.setAutoReconnect = function() {
  this.auto_reconnect = true;
}


exports.createLamp = function (mac_address) {
  var lamp = new Ion(mac_address);

  return lamp;
};