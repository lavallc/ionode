// includes
var noble = require('noble');
var util = require("util");
var events = require("events");
var helpers = require('./helpers');

// load in configuration
var config = require('../config');


// constructor for ION lamps
function ION(identifier) {
  this.autoReconnect = false;
  // identifier can be the ION's name or its UUID
  this.identifier = identifier;
  this.name = null;
  // the noble instance
  this.device = null;
  this.lampService = null;
  this.controlCharacteristic = null;
  this.connected = false;
  // have all the services/characteristics been discovered
  this.ready = false;
  // used for holding the reconnect timer
  this.reconnectTimer = null;
}

// turn the ion object into an eventemitter
util.inherits(ION, events.EventEmitter);


function reconnectLamp(lamp) {
  // make sure the lamp is still disconnected
  lamp.disconnect();
  // clear out the timer so another reconnect can occur
  lamp.reconnectTimer = null;
  // connect to the lamp (reconnect mode, skips discovery)
  lamp.connect(true);
}


ION.prototype.connect = function(reconnect) {
  var self = this;

  if (reconnect)
    // cut to the chase
    discoverLamp();
  else {
    // start scanning
    noble.on('stateChange', function(state) {
      if (state === 'poweredOn') {
        // find devices, no duplicates
        noble.startScanning([], false);
      } else {
        // alert the user
        self.emit('error', 'bluetooth adapter not enabled or not connected');
        noble.stopScanning();
      }
    });

    noble.on('discover', function(peripheral) {
      // if the uuid or name matches our identifier, we want to connect to this lamp
      if (peripheral.uuid === self.identifier || peripheral.advertisement.localName === self.identifier) {
        noble.stopScanning();
        self.name = peripheral.advertisement.localName;
        self.device = peripheral;
        self.emit('discovered');
        // bind disconnect event to the device
        bindDisconnect();
        // move onto service discovery
        discoverLamp();
      }
    });
  }

  function bindDisconnect() {
    // clear everything out on a disconnect
    self.device.on('disconnect', function() {
      self.name = null;
      self.lampService = null;
      self.controlCharacteristic = null;
      self.connected = false;
      self.ready = false;

      self.emit('disconnected');

      // reconnect timeout if autoReconnect was enabled
      if (self.autoReconnect) {
        if (self.reconnectTimer === null) {
          self.reconnectTimer = setTimeout(function() {
            self.emit('reconnecting');
            reconnectLamp(self);
          }, 2000);
        }
      }
    });
  }

  function discoverLamp() {
    // connect to device
    self.device.connect(function(error) {
      if (!error) {
        self.connected = true;
        self.emit('connected');

        // look for the lamp service only
        self.device.discoverServices([config.lampUuid], function(error, services) {
          // output errors
          if (error)
            self.emit('error', error);

          self.lampService = services[0];

          // find all the lamp's characteristics
          self.lampService.discoverCharacteristics([], function(error, characteristics) {
            // output errors
            if (error)
              self.emit('error', error);

            for (var j=0; j<characteristics.length; j++) {
              // found the control characteristic
              if (characteristics[j].uuid === config.controlChar) {
                self.controlCharacteristic = characteristics[j];

                // we are now ready
                if (!self.ready) {
                  self.ready = true;

                  // discovery complete
                  self.emit('ready');
                }
              }
            }
          });
        });
      } else {
        self.emit('error', error);
      }
    });
  }
}

ION.prototype.disconnect = function() {
  if (this.connected) {
    // cleanup will be handled in the disconnect event above
    this.device.disconnect();
  }
}

ION.prototype.getName = function() {
  return this.name;
}

ION.prototype.isConnected = function() {
  return this.connected;
}

ION.prototype.isReady = function() {
  return this.ready;
}

ION.prototype.getMood = function() {
  // not implemented
  return null;
}

ION.prototype.setMood = function(moodName, cb) {
  var self = this;

  // get the mood object from the mood name
  var mood = helpers.getMoodForName(moodName);

  // sets mood
  if (this.ready && mood) {
    this.controlCharacteristic.write(new Buffer([2, mood.id]), false, function(err) {
      if (err && cb) {
        self.emit('error', err);
        cb(err);
      } else if (cb) {
        cb(null);
      }
    });
  }
}

ION.prototype.setMoodConfig = function(moodName, optionName, val, cb) {
  var self = this;

  // get the mood object from the mood name
  var mood = helpers.getMoodForName(moodName);
  // get the mood config object from the mood name and config name
  var moodConfig = helpers.getMoodConfigForName(moodName, optionName);

  // make sure the mood and config objects were found
  if (mood && moodConfig) {
    // if the user didn't set a value, assume the default value
    if (typeof val === 'undefined' || typeof val === 'function') {
      // the user's callback was passed in as val, assign it to cb
      if (typeof val === 'function')
        cb = val;
      val = moodConfig.default;
    }
  }

  // make sure the mood and config objects were found, make sure val is an integer, and verify the integer is in range
  if (this.ready && mood && moodConfig && helpers.isInt(val) && val >= moodConfig.min && val <= moodConfig.max) {
    var buf = new Buffer(11);
    buf.writeUInt8(0x3, 0);               // op code (set pattern config)
    buf.writeUInt32LE(mood.id, 1);        // pattern ID (32 bit)
    buf.writeUInt8(0x1, 5);               // number of config items (just one)
    buf.writeUInt8(moodConfig.id, 6);     // config ID for this pattern
    buf.writeUInt32LE(val, 7);            // actual value to configure (32 bit)

    this.controlCharacteristic.write(buf, false, function(err) {
      if (err && cb) {
        self.emit('error', err);
        cb(err);
      } else if (cb) {
        cb(null);
      }
    });
  } else {
    if (cb)
      cb('invalid parameters');
  }
}

ION.prototype.updateWeather = function(currentConditions, currentTemp, futureConditions, futureTemp) {
  // not implemented
}

ION.prototype.updateTime = function(hr_24, min, sec) {
  // not implemented
}

ION.prototype.updateFirmware = function() {
  // not implemented
}

ION.prototype.notify = function(notifyName, color, duration) {
  // not implemented
}

ION.prototype.enterDfu = function(cb) {
  var self = this;

  if (this.ready) {
    this.controlCharacteristic.write(new Buffer([6]), false, function(err) {
      if (err && cb) {
        self.emit('error', err);
        cb(err);
      } else if (cb) {
        cb(null);
      }
    });
  }
}

ION.prototype.setAutoReconnect = function(reconnect) {
  this.autoReconnect = reconnect;
}


function createLamp(id) {
  return new ION(id);
}


exports.createLamp = createLamp;