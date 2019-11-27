// includes
var noble = require('@abandonware/noble');
var fs = require("fs");

// load in configuration
var config = require('./config');

// op codes for DFU
var opCodes = {
  START_DFU:                    1,
  INITIALIZE_DFU:               2,
  RECEIVE_FIRMWARE_IMAGE:       3,
  VALIDATE_FIRMWARE_IMAGE:      4,
  ACTIVATE_FIRMWARE_AND_RESET:  5
};

// status codes for DFU
var dfuStatus = {
  SUCCESS:                      1,
  INVALID_STATE:                2,
  NOT_SUPPORTED:                3,
  DATA_SIZE_EXCEEDS_LIMITS:     4,
  CRC_ERROR:                    5,
  OPERATION_FAILED:             6
};

// flags
var hexParsed = false;
var nobleReady = false;

// grab the filename passed in on the commandline
var hexFilename;

// buffer/connectivity state
var parsedHex;
var bytesSent = 0;
var doneSendingFirmware = false;
var finishedReset = false;
var selectedPeripheral;

// display error and quit
function endOnError(err) {
  console.log(err);
  process.exit(1);
}

// display success and quit
function endOnSuccess() {
  console.log('ion was flashed successfully');
  process.exit(0);
}

// strip hyphens, lowercase
function formatUuid(fstr) {
  return fstr.toLowerCase().replace(/-/g, "");
}

function beginLoad(hexFile) {
  hexFilename = hexFile;

  // read in the hex file
  fs.readFile(hexFilename, function (err, data) {
      if (err) throw err;

      // we no longer parse hex (passing in BIN files by default)
      parsedHex = data;
      hexParsed = true;
      console.log('hex file loaded');

      if (nobleReady) {
        console.log('scanning...');
        noble.startScanning();
      }
  });
}


// start scanning
noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    nobleReady = true;
    if (hexParsed) {
      noble.startScanning();
    }
  } else {
    nobleReady = false;
    noble.stopScanning();
  }
});


// find dfu device
noble.on('discover', function(peripheral) {
    var advertisement = peripheral.advertisement;

    var localName = advertisement.localName;
    var txPowerLevel = advertisement.txPowerLevel;
    var manufacturerData = advertisement.manufacturerData;
    var serviceData = advertisement.serviceData;
    var serviceUuids = advertisement.serviceUuids;

    if (localName && serviceUuids[0]) {
      if (serviceUuids[0] === formatUuid(config.DFU.dfuUuid)) {
        console.log('found ion in dfu mode');
        noble.stopScanning();
        selectedPeripheral = peripheral;
        explore(peripheral);
      }
    }
});


// holds references to the characteristics and descriptor we use
var controlCharacteristic, packetCharacteristic, cccd;

function explore(peripheral) {
  peripheral.on('disconnect', function() {
    if (finishedReset)
      endOnSuccess();
    else
      endOnError('lost connection to ion');
  });

  // connect to device
  peripheral.connect(function(error) {
    peripheral.discoverServices([], function(error, services) {

      for (var i=0; i<services.length; i++) {
        if (services[i].uuid === formatUuid(config.DFU.dfuUuid)) {

          services[i].discoverCharacteristics([], function(error, characteristics) {
            for (var j=0; j<characteristics.length; j++) {
              // found the control characteristic
              if (characteristics[j].uuid === formatUuid(config.DFU.controlStateChar)) {
                controlCharacteristic = characteristics[j];

                // setup read listener and enable notifications
                controlCharacteristic.on('read', onControlCharacteristicData);
                controlCharacteristic.notify(true);

                controlCharacteristic.discoverDescriptors(function(error, descriptors) {
                  for (var k=0; k<descriptors.length; k++) {
                    // found cccd (descriptor used to initiate flashing)
                    if (descriptors[k].uuid === formatUuid(config.DFU.cccdUuid)) {
                      cccd = descriptors[k];

                      console.log('beginning upload...');
                      startFlash();
                    }
                  }
                });
              // found the packet data characteristic
              } else if (characteristics[j].uuid === formatUuid(config.DFU.packetChar)) {
                packetCharacteristic = characteristics[j];
              }
            }
          });
        }
      }
    });
  });
}


// we get control responses here
function onControlCharacteristicData(data, isNotification) {
  if (data.length == 3) {
    if (data[1] == opCodes.START_DFU && data[2] == dfuStatus.SUCCESS) {
      console.log("ion ready to receive firmware");
      
      // start firmware send
      controlCharacteristic.write(new Buffer([opCodes.RECEIVE_FIRMWARE_IMAGE]), false, function(err) {
        if (err)
          endOnError('failed to begin sending firmware');
        else
          sendNextFileChunk();  // time to write the entire firmware blob
      });

    } else if (data[1] == opCodes.RECEIVE_FIRMWARE_IMAGE && data[2] == dfuStatus.SUCCESS) {
      console.log('ion received firmware successfully');

      controlCharacteristic.write(new Buffer([opCodes.VALIDATE_FIRMWARE_IMAGE]), false, function(err) {
        if (err)
          endOnError('ion failed to validate');
      });

    } else if (data[1] == opCodes.VALIDATE_FIRMWARE_IMAGE && data[2] == dfuStatus.SUCCESS) {
      console.log('ion validated firmware successfully');

      controlCharacteristic.write(new Buffer([opCodes.ACTIVATE_FIRMWARE_AND_RESET]), false, function(err) {
        if (err)
          endOnError('failed to reset ion');
        else {
          console.log('resetting ion...');
          finishedReset = true;
          selectedPeripheral.disconnect();
        }
      });

    }
  }
}


function startFlash() {
  cccd.writeValue(new Buffer([1, 0]), function(err) {
    if (err)
      endOnError('error setting initial cccd value');
    else {
      console.log('upload initialized');

      controlCharacteristic.write(new Buffer([opCodes.START_DFU]), false, function(err) {
        if (err)
          endOnError('error entering dfu mode');
        else {
          console.log('entered dfu mode');
          console.log('hex file size: ' + parsedHex.length + ' bytes');

          // convert length integer into uint32 to send to nrf
          var bufferLength = new Buffer(4);
          bufferLength.writeUInt32LE(parsedHex.length, 0);

          // send length to nrf
          packetCharacteristic.write(bufferLength, false, function(err) {
            if (err) {
              endOnError('could not write payload size');
            } else {
              console.log('wrote payload size');
            }
          });
        }
      });
    }
  })
}


function sendNextFileChunk() {
  // don't try to send more data
  if (doneSendingFirmware)
    return;

  // bytes to write this loop through
  var bytesToWrite = Math.min(parsedHex.length - bytesSent, config.DFU.packetSize);

  // we're done, actually
  if (bytesToWrite == 0) {
    doneSendingFirmware = true;
    return;
  }

  // our last packet may be smaller than max packet size
  if (bytesToWrite < config.DFU.packetSize)
    doneSendingFirmware = true;

  // create buffer and load in bytes for this packet
  var byteIndex = 0;
  var nextChunkBuf = Buffer(bytesToWrite);
  while(bytesToWrite > 0) {
    nextChunkBuf[byteIndex++] = parsedHex[bytesSent++];
    bytesToWrite--;
  }

  // write the buffer over BLE
  packetCharacteristic.write(nextChunkBuf, false, function(err) {
    if (err) {
      endOnError('failed payload chunk write, aborting...');
    } else {
      // run this function again, we're ready
      sendNextFileChunk();
    }
  });

  // progress
  console.log(((bytesSent/parsedHex.length) * 100).toFixed(2) + "%");
}

module.exports = {
  beginLoad: beginLoad
}