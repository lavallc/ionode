// includes
var noble = require('noble'),
    util = require("util"),
    events = require("events"),
    helpers = require('./helpers'),
    packets = require('./packets'),
    dfu = require('./dfu'),
    raw_buffer = require('./raw_buffer'),
    request = require("request");

// load in BLE configuration
var config = require('./config');

var currentWeatherUrl = "http://api.openweathermap.org/data/2.5/weather?units=imperial&cnt=1&";
var forecastWeatherUrl = "http://api.openweathermap.org/data/2.5/forecast?units=imperial&cnt=1&";


// constructor for ION lamps
function ION(identifier) {
  this.autoReconnect = false;
  // identifier can be the ION's name or its UUID
  this.identifier = identifier;
  // actual BLE device name (populated on connect)
  this.name = null;
  // noble instance vars
  this.device = null;
  this.lampService = null;
  this.controlCharacteristic = null;
  this.notifyCharacteristic = null;
  // ion state
  this.connected = false;
  this.discoveryComplete = false;
  this.identifiedViaName = false;
  this.initialNotifyAcknowledged = false;
  // have all the services/characteristics been discovered
  this.ready = false;
  // used for holding the reconnect timer
  this.reconnectTimer = null;
  // used for holding the weather refresh timer
  this.weatherTimer = null;
  // request IDs allow us to tie packet responses to callbacks
  this.nextRequestId = 0;
  // hold onto callbacks linked against request IDs
  this.requestCallbacks = {};

  // weather vars
  this.weatherLat = null;
  this.weatherLon = null;

  // this should be here in the first place
  Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
      if (this[i] === obj) {
        return true;
      }
    }
    return false;
  }

  // sends a packet to ION
  this.sendPacket = function(packet) {
    var self = this;

    if (self.ready) {
      self.controlCharacteristic.write(packet, false, function(err) {
        if (err) {
          if (packet.readUInt8(0) in self.requestCallbacks) {
            if (typeof self.requestCallbacks[packet.readUInt8(0)] === 'function')
              self.requestCallbacks[packet.readUInt8(0)](err);

            // clear out request callback
            delete self.requestCallbacks[packet.readUInt8(0)];
          }
        }
      });
    }
  }

  // updates a raw LED bank (5 LEDs at a time)
  this.sendBankData = function(bankId, cb) {
    // skip this bank if writing is not needed
    if (!raw_buffer.doesBankRequireUpdate(bankId))
      return cb(null);

    var bankStart = bankId * 5;
    var reqId = this.assignCallback(function(err) {
      if (!err) {
        raw_buffer.wroteBank(bankId);
      }
      cb(err);
    });
    this.sendPacket(packets.makeSetRawBankPacket(reqId, bankId, raw_buffer.getLED(bankStart), raw_buffer.getLED(bankStart+1), raw_buffer.getLED(bankStart+2), raw_buffer.getLED(bankStart+3), raw_buffer.getLED(bankStart+4)));
  }

  // send current time to ION
  this.sendTimePacket = function(cb) {
    var date = new Date;
    var hr_24 = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();

    var reqId = this.assignCallback(cb);
    this.sendPacket(packets.makeSetTimePacket(reqId, hr_24, min, sec));
  }

  // links a request ID against a callback function
  this.assignCallback = function(cb) {
    // grab the next available ID
    var nextId = this.nextRequestId;

    // assign callback to this request ID
    this.requestCallbacks[nextId] = cb;

    // increment/loop request ID
    if (nextId < 254)
      this.nextRequestId++;
    else
      this.nextRequestId = 0;

    return nextId;
  }

  // send current weather conditions (and sunrise/sunset) to ION
  this.setWeather = function(current_temp, current_conditions, future_temp, future_conditions, sunrise_24hr, sunrise_min, sunset_24hr, sunset_min, cb) {
    var reqId = this.assignCallback(cb);
    this.sendPacket(packets.makeSetWeatherPacket(reqId, current_temp, current_conditions, future_temp, future_conditions, sunrise_24hr, sunrise_min, sunset_24hr, sunset_min));
  }

  // convert openweathermap icon codes to current weather condition codes for ION
  function getWeatherCodeForIconString(weatherIcon) {
    var clearCodes = ["01d", "01n", "02d", "02n"];
    var cloudCodes = ["03d", "03n", "04d", "04n"];
    var rainCodes = ["09d", "09n", "10d", "10n"];
    var thunderstormCodes = ["11d", "11n"];
    var snowCodes = ["13d", "13n"];

    if (clearCodes.contains(weatherIcon)) {
      return packets.weatherCodes.kWeatherClear;
    } else if (cloudCodes.contains(weatherIcon)) {
      return packets.weatherCodes.kWeatherClouds;
    } else if (rainCodes.contains(weatherIcon)) {
      return packets.weatherCodes.kWeatherRain;
    } else if (thunderstormCodes.contains(weatherIcon)) {
      return packets.weatherCodes.kWeatherThunderstorm;
    } else if (snowCodes.contains(weatherIcon)) {
      return packets.weatherCodes.kWeatherSnow;
    } else {
      // the relation between this catch all case and weather code is intentional
      return packets.weatherCodes.kWeatherHazy;
    }
  }

  // grab weather data from openweathermap
  this.requestWeatherData = function() {
    var self = this;

    // clear old timers
    if (self.weatherTimer !== null) {
      clearTimeout(self.weatherTimer);
      self.weatherTimer = null;
    }

    if (self.weatherLat != null && self.weatherLon != null) {
      try {
        request(currentWeatherUrl + "lat=" + self.weatherLat + "&lon=" + self.weatherLon, function(error, response, body) {
          var currentConditionsJSON = JSON.parse(body);

          // parse out current temp
          var currentTemp = coerceTemp(currentConditionsJSON.main.temp);
          // parse out current conditions
          var currentConditions = getWeatherCodeForIconString(currentConditionsJSON.weather[0].icon);

          // request forecast data
          request(forecastWeatherUrl + "lat=" + self.weatherLat + "&lon=" + self.weatherLon, function(error, response, body) {
            var forecastConditionsJSON = JSON.parse(body);

            // parse out forecast temp (6 hours from now - 2nd item in array)
            var futureTemp = coerceTemp(forecastConditionsJSON.list[1].main.temp);
            // parse out forecast conditions (6 hours from now - 2nd item in array)
            var futureConditions = getWeatherCodeForIconString(forecastConditionsJSON.list[1].weather[0].icon);

            // parse out sunrise/sunset unix timestamps
            var sunriseTimestamp = currentConditionsJSON.sys.sunrise;
            var sunsetTimestamp = currentConditionsJSON.sys.sunset;

            var sunriseDate = new Date(sunriseTimestamp*1000);
            var sunsetDate = new Date(sunsetTimestamp*1000);

            var sunriseHour = sunriseDate.getHours();
            var sunriseMin = sunriseDate.getMinutes();

            var sunsetHour = sunsetDate.getHours();
            var sunsetMin = sunsetDate.getMinutes();

            // push weather data to ION
            self.setWeather(currentTemp, currentConditions, futureTemp, futureConditions, sunriseHour, sunriseMin, sunsetHour, sunsetMin, function(err) {
              if (!err) {
                // weather set successfully!

                // update again in 15 minutes
                self.weatherTimer = setTimeout(function() {
                  self.requestWeatherData();
                }, 1000 * 60 * 15);
              } else {
                // weather failed to update

                // update again in 3 minutes
                self.weatherTimer = setTimeout(function() {
                  self.requestWeatherData();
                }, 1000 * 60 * 3);
              }
            });
          });
        });
      } catch (err) {
        // weather failed to update

        // update again in 3 minutes
        self.weatherTimer = setTimeout(function() {
          self.requestWeatherData();
        }, 1000 * 60 * 3);
      }
    }
  }

  // keep temperature values within range of what lamp supports
  function coerceTemp(temp) {
    var currentTempInt = Math.round(temp);
    var result;
    
    if (currentTempInt > 127)
      result = 127;
    else if (currentTempInt < -128)
      result = -128;
    else
      result = currentTempInt;
    
    return result;
  }
}

// turn the ion object into an eventemitter
util.inherits(ION, events.EventEmitter);





/************ USER FACING CALLS ************/

ION.prototype.connect = function(reconnect) {
  var self = this;

  if (reconnect || self.discoveryComplete)
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
        // helpful to know in case the user renames the lamp
        if (peripheral.advertisement.localName === self.identifier)
          self.identifiedViaName = true;

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
      self.notifyCharacteristic = null;
      self.connected = false;
      self.ready = false;
      self.initialNotifyAcknowledged = false;
      self.requestCallbacks = {};
      self.nextRequestId = 0;

      self.emit('disconnected');

      // kill off weather updates
      if (self.weatherTimer !== null) {
        clearTimeout(self.weatherTimer);
        self.weatherTimer = null;
      }

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

  function handleLampNotification(data) {
    // on connect we immediately get a notification
    if (!self.initialNotifyAcknowledged)
      return self.initialNotifyAcknowledged = true;

    // 0xFF means an event that we did not request (mood change for instance)
    if (data.readUInt8(0) !== 0xFF) {
      // do we have a callback that matches our request ID of the packet?
      if (data.readUInt8(0) in self.requestCallbacks) {
        var callback = self.requestCallbacks[data.readUInt8(0)];
        var packet = packets.decodePacket(data);

        if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeAck) {
          // ACK/NAK RESPONSE: err
          if (typeof callback === 'function')
            callback(null);
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeNak) {
          // ACK/NAK RESPONSE: err
          var calledBack = false;

          for (var key in packets.packetNakCodes) {
            if (packets.packetNakCodes[key] === packet.response_code) {
              // the 'key' is the string name for the NAK reason
              if (typeof callback === 'function')
                callback(key);
              calledBack = true;
            }
          }

          // wat
          if (!calledBack && typeof callback === 'function')
            callback('Unknown NAK Error');
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeInit) {
          // INIT RESPONSE: err, protocolVersion
          if (typeof callback === 'function')
            callback(null, packet.protocol_version);
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeSetDeviceName) {
          // DEVICE NAME RESPONSE: err, name

          // update our name
          self.name = packet.name;
          if (self.identifiedViaName)
            self.identifier = self.name;

          // callback time
          if (typeof callback === 'function')
            callback(null, packet.name);
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeGetDeviceSettings || packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeSetDeviceSettings) {
          // DEVICE SETTINGS RESPONSE: err, knock_enabled, quiet_time_enabled, quiet_hour_start, quiet_minute_start, quiet_hour_end, quiet_minute_end, shuffle_time, notifications_enabled, leash_enabled
          if (typeof callback === 'function')
            callback(null, packet.knock_enabled, packet.quiet_time_enabled, packet.quiet_hour_start, packet.quiet_minute_start, packet.quiet_hour_end, packet.quiet_minute_end, packet.shuffle_time, packet.notifications_enabled, packet.leash_enabled);
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeGetMoodConfig || packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeSetMoodConfig) {
          // MOOD CONFIG RESPONSE: err, data
          if (typeof callback === 'function')
            callback(null, packet.data);
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeGetNotificationConfig || packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeSetNotificationConfig) {
          // NOTIFICATION CONFIG RESPONSE: err, notification_id, enabled, pattern_id, hue, brightness, saturation, speed, duration, sticky
          if (typeof callback === 'function')
            callback(null, packet.notification_id, packet.enabled, packet.pattern_id, packet.brightness, packet.saturation, packet.speed, packet.duration, packet.sticky);
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeSetCurrentMood || packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeGetCurrentMood) {
          // CURRENT MOOD RESPONSE: err, moodName
          if (typeof callback === 'function')
            callback(null, helpers.getNameForMoodId(packet.mood_id));
        } else if (packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeUpdateRotation || packet.op_code === packets.packetOpCodes.kLumenPacketOpCodeGetRotation) {
          // ROTATION RESPONSE: err, listOfMoodNamesInRotation

          // swap mood IDs for names
          for (var i=0; i<packet.rotation.length; i++) {
            if (helpers.getNameForMoodId(packet.rotation[i]) !== null) {
              packet.rotation[i] = helpers.getNameForMoodId(packet.rotation[i]);
            }
          }

          if (typeof callback === 'function')
            callback(null, packet.rotation);
        } else {
          self.emit('error', 'received packet with unknown op code');
        }

        // clear out request callback
        delete self.requestCallbacks[data.readUInt8(0)];
      } else {
        self.emit('error', 'received packet with unknown request id');
      }
    } else {
      // right now this is the only event we receive without requesting something from the lamp
      if (data.readUInt8(1) === packets.packetOpCodes.kLumenPacketOpCodeGetCurrentMood) {
        // MOOD CHANGED RESPONSE: moodName
        self.emit('mood_changed', helpers.getNameForMoodId(data.readUInt8(2)));
      }
    }
  }

  // we are beginning to initialize w/ ION
  function sendInitPacket(cb) {
    var reqId = self.assignCallback(cb);
    self.sendPacket(packets.makeInitPacket(reqId));
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
            return self.emit('error', error);

          self.lampService = services[0];

          if (self.lampService === undefined) {
            return self.emit('error', 'could not find ION service');
          }

          // find all the lamp's characteristics
          self.lampService.discoverCharacteristics([], function(error, characteristics) {
            // output errors
            if (error)
              return self.emit('error', error);

            for (var j=0; j<characteristics.length; j++) {
              // found the control characteristic
              if (characteristics[j].uuid === config.controlChar) {
                self.controlCharacteristic = characteristics[j];
              } else if (characteristics[j].uuid === config.notifyChar) {
                self.notifyCharacteristic = characteristics[j];

                // decode and handle incoming notifications from the lamp
                self.notifyCharacteristic.on('read', function(data, isNotification) {
                  handleLampNotification(data);
                });

                // enable notifications (BLE notify, not app notifications)
                self.notifyCharacteristic.notify(true, function(err) {
                  // this event is triggered after notifications have been enabled
                  // therefore we are ready to send an init packet
                  self.ready = true;
                  sendInitPacket(function(err, protocolVer) {
                    if (packets.supportedProtocolVersion === protocolVer) {
                      // we're good, firmware versions match
                      self.discoveryComplete = true;
                      self.emit('ready');
                    } else {
                      self.setAutoReconnect(false);
                      self.disconnect();
                      self.emit('error', 'protocol version mismatch');
                    }
                  });
                });
              }
            }
          });
        });
      } else {
        // damn it all to hell
        self.emit('error', error);
      }
    });
  }

  function reconnectLamp(lamp) {
    // make sure the lamp is still disconnected
    lamp.disconnect();
    // clear out the timer so another reconnect can occur
    lamp.reconnectTimer = null;
    // connect to the lamp (reconnect mode, skips discovery)
    lamp.connect(true);
  }
}

ION.prototype.disconnect = function() {
  if (this.connected) {
    // cleanup will be handled in the disconnect event above
    this.autoReconnect = false;
    this.device.disconnect();
  }
}

ION.prototype.enterDfu = function(cb) {
  // not typically used by end users, but useful to anyone curious
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeEnterDFUModePacket(reqId));
}

// what is this ION's name? (may have changed since connecting)
ION.prototype.getName = function() {
  return this.name;
}

ION.prototype.isConnected = function() {
  return this.connected;
}

// is the lamp ready to accept packets?
ION.prototype.isReady = function() {
  return this.ready;
}

ION.prototype.setAutoReconnect = function(reconnect) {
  this.autoReconnect = reconnect;
}

ION.prototype.renameDevice = function(name, cb) {
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeSetDeviceNamePacket(reqId, name));
}

// get ION's current mood
ION.prototype.getMood = function(cb) {
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeGetCurrentMoodPacket(reqId));
}

// set ION's current mood
ION.prototype.setMood = function(moodName, cb) {
  // get the mood object from the mood name
  var mood = helpers.getMoodForName(moodName);

  // sets mood
  if (mood) {
    var reqId = this.assignCallback(cb);
    this.sendPacket(packets.makeSetCurrentMoodPacket(reqId, mood.id));
  } else {
    cb('unknown mood');
  }
}

// set a mood config value
ION.prototype.setMoodConfig = function(moodName, optionName, val, val2orCb, cb) {
  // used in the case of hue/saturation
  if (typeof val2orCb === 'function') {
    cb = val2orCb;
  }

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
  if (mood && moodConfig && helpers.isInt(val) && val >= moodConfig.min && val <= moodConfig.max) {
    if (optionName.toLowerCase().replace(/\s+/g, '') === 'color') {
      if (helpers.isInt(val2orCb) && val2orCb >= 0 && val2orCb <= 255) {
        // parameters are valid (hue + sat call)
        var reqId1 = this.assignCallback(null);
        var reqId2 = this.assignCallback(cb);
        this.sendPacket(packets.makeSetMoodConfigPacket(reqId1, mood.id, moodConfig.id, val));
        // saturation always comes after hue
        this.sendPacket(packets.makeSetMoodConfigPacket(reqId2, mood.id, moodConfig.id+1, val2orCb));
      } else {
        if (cb)
          cb('invalid parameters');
      }
    } else {
      var reqId = this.assignCallback(cb);
      this.sendPacket(packets.makeSetMoodConfigPacket(reqId, mood.id, moodConfig.id, val));
    }
  } else {
    if (cb)
      cb('invalid parameters');
  }
}

// get a mood config value
ION.prototype.getMoodConfig = function(moodName, optionName, cb) {
  // get the mood object from the mood name
  var mood = helpers.getMoodForName(moodName);
  // get the mood config object from the mood name and config name
  var moodConfig = helpers.getMoodConfigForName(moodName, optionName);

  // make sure the mood and config objects were found
  if (mood && moodConfig) {
    var reqId = this.assignCallback(cb);
    this.sendPacket(packets.makeGetMoodConfigPacket(reqId, mood.id, moodConfig.id));
  } else {
    if (cb)
      cb('invalid parameters');
  }
}

// get ION's current rotation of moods
ION.prototype.getRotation = function(cb) {
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeGetRotationPacket(reqId));
}

// save the current state of the mood configs of the current mood
ION.prototype.saveMoodConfigs = function(cb) {
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeSaveMoodConfigsPacket(reqId));
}

// restore to default the state of the current mood's configs
ION.prototype.restoreCurrentMoodConfigsToDefault = function(cb) {
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeRestoreMoodConfigsPacket(reqId));
}

// set a single LED state in the raw buffer
ION.prototype.setRawLED = function(ledId, ledColor) {
  raw_buffer.setLED(ledId, ledColor);
  // chainable!
  return this;
}

// clears ionode's raw buffer and commits to ION
ION.prototype.setRawClearAll = function(cb) {
  raw_buffer.clearBuffer();
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeSetRawClearAllPacket(reqId));
  // chainable!
  return this;
}

// fills ionode's raw buffer with the provided color {r: val, g: val, b: val} and commits to ION
ION.prototype.setRawFillColor = function(fillColor, cb) {
  raw_buffer.fillBuffer(fillColor.r, fillColor.g, fillcolor.b);
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeSetRawFillColorPacket(reqId, fillColor));
  // chainable!
  return this;
}

// dump ionode's raw buffer to ION and commit changes
ION.prototype.setRawShow = function(cb) {
  var self = this;

  self.sendBankData(0, function(err) {
    if (err) { return cb(err) };
    self.sendBankData(1, function(err) {
      if (err) { return cb(err) };
      self.sendBankData(2, function(err) {
        if (err) { return cb(err) };
        self.sendBankData(3, function(err) {
          if (err) { return cb(err) };
          self.sendBankData(4, function(err) {
            if (err) { return cb(err) };
            self.sendBankData(5, function(err) {
              if (err) { return cb(err) };
              self.sendBankData(6, function(err) {
                if (err) { return cb(err) };
                self.sendBankData(7, function(err) {
                  if (err) { return cb(err) };
                  var reqId = self.assignCallback(cb);
                  self.sendPacket(packets.makeSetRawRefreshPacket(reqId));
                });
              });
            });
          });
        });
      });
    });
  });

  // chainable!
  return this;
}

// feed weather data to ION and update every 15 minutes from now on
ION.prototype.beginWeatherUpdates = function(lat, lon) {
  this.weatherLat = lat;
  this.weatherLon = lon;
  this.requestWeatherData();
}

// tells ION to display a notification with the given parameters
ION.prototype.showNotification = function(patternName, hue, brightness, saturation, speed, duration, sticky, cb) {
  // get the notification object from the notification name
  var notification = helpers.getNotificationForName(patternName);

  // sets notification
  if (notification) {
    var reqId = this.assignCallback(cb);
    this.sendPacket(packets.makeShowNotificationPacket(reqId, notification.id, hue, brightness, saturation, speed, duration, sticky));
  } else {
    cb('unknown notification');
  }
}

// clears a sticky notification (if active)
ION.prototype.clearNotification = function(cb) {
  var reqId = this.assignCallback(cb);
  this.sendPacket(packets.makeClearNotificationPacket(reqId));
}




/************ EXPORT ************/

function createLamp(id) {
  return new ION(id);
}

function updateFirmware(filename) {
  // this will currently flash ANY lamp in DFU mode
  dfu.beginLoad(filename);
}

exports.createLamp = createLamp;
exports.updateFirmware = updateFirmware;