var supportedProtocolVersion = 0x0001;

var packetOpCodes = {
    kLumenPacketOpCodeAck: 0x01,
    kLumenPacketOpCodeNak: 0x02,
    kLumenPacketOpCodeInit: 0x03,
    kLumenPacketOpCodeSetDeviceName: 0x04,
    kLumenPacketOpCodeGetDeviceSettings: 0x05,
    kLumenPacketOpCodeSetDeviceSettings: 0x06,
    kLumenPacketOpCodeSetWeather: 0x07,
    kLumenPacketOpCodeSetTime: 0x08,
    kLumenPacketOpCodeSetMoodConfig: 0x09,
    kLumenPacketOpCodeGetMoodConfig: 0x0A,
    kLumenPacketOpCodeSaveMoodConfigs: 0x0B,
    kLumenPacketOpCodeRestoreMoodConfigs: 0x0C,
    kLumenPacketOpCodeSetNotificationConfig: 0x0D,
    kLumenPacketOpCodeGetNotificationConfig: 0x0E,
    kLumenPacketOpCodeSetCurrentMood: 0x0F,
    kLumenPacketOpCodeGetCurrentMood: 0x10,
    kLumenPacketOpCodeTriggerNotification: 0x11,
    kLumenPacketOpCodeUpdateRotation: 0x12,
    kLumenPacketOpCodeGetRotation: 0x13,
    kLumenPacketOpCodeEnterDFUMode: 0x14,
    kLumenPacketOpCodeShowNotification: 0x15,
    kLumenPacketOpCodeSetRawSettings: 0x16,
    kLumenPacketOpCodeBeginBond: 0x17,
    kLumenPacketOpCodeClearNotification: 0x18,
    kLumenPacketOpCodeSetRawBank: 0x19,
    kLumenPacketOpCodeSetRawLED: 0x1A,
    kLumenPacketOpCodeSetRawClearAll: 0x1B,
    kLumenPacketOpCodeSetRawFillColor: 0x1C,
    kLumenPacketOpCodeSetRawRefresh: 0x1D
}

var packetNakCodes = {
    kLumenNakInvalidOpCode: 0x01,
    kLumenNakUnknownDeviceType: 0x02,
    kLumenNakInvalidDeviceName: 0x03,
    kLumenNakInvalidDeviceSettings: 0x04,
    kLumenNakInvalidWeather: 0x05,
    kLumenNakInvalidTime: 0x06,
    kLumenNakInvalidMoodConfig: 0x07,
    kLumenNakUnknownMood: 0x08,
    kLumenNakUnknownMoodConfig: 0x09,
    kLumenNakInvalidNotificationConfig: 0x0A,
    kLumenNakUnknownNotification: 0x0B,
    kLumenNakInvalidRotation: 0x0C,
    kLumenNakBondFailed: 0x0D,
    kLumenNakNoBond: 0x0E,
    kLumenNakNoInit: 0x0F
}

var weatherCodes = {
    kWeatherClear: 0x01,
    kWeatherClouds: 0x02,
    kWeatherRain: 0x03,
    kWeatherSnow: 0x04,
    kWeatherThunderstorm: 0x05,
    kWeatherHazy: 0x06
}


/* packet decoders */
function decodeAckPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1)
    }
    return packet;
}

function decodeNakPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        response_code: buf.readUInt8(2)
    }
    return packet;
}

function decodeFirmwareVersionPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        protocol_version: buf.readUInt16LE(2),
        firmware_version: buf.readUInt16LE(4),
        bonded: buf.readUInt8(6) !== 0 ? true : false
    }
    return packet;
}

function decodeDeviceNamePacket(buf) {
    var nameLength = buf.length - 2;
    var name = '';

    for (var i = 0; i<nameLength; i++) {
        name += String.fromCharCode(buf.readUInt8(2+i));
    }

    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        name: name
    }
    return packet;
}

function decodeDeviceSettingsPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        knock_enabled: buf.readUInt8(2) !== 0 ? true : false,
        quiet_time_enabled: buf.readUInt8(3) !== 0 ? true : false,
        quiet_hour_start: buf.readUInt8(4),
        quiet_minute_start: buf.readUInt8(5),
        quiet_hour_end: buf.readUInt8(6),
        quiet_minute_end: buf.readUInt8(7),
        shuffle_enabled: buf.readUInt8(8) !== 0 ? true : false,
        shuffle_time: buf.readUInt8(8),
        notifications_enabled: buf.readUInt8(9) !== 0 ? true : false,
        leash_enabled: buf.readUInt8(10) !== 0 ? true : false
    }
    return packet;
}

function decodeMoodConfigPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        mood_id: buf.readUInt8(2),
        config_id: buf.readUInt8(3),
        data: buf.readUInt32LE(4)
    }
    return packet;
}

function decodeNotificationConfigPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        notification_id: buf.readUInt8(2),
        enabled: buf.readUInt8(3) !== 0 ? true : false,
        pattern_id: buf.readUInt8(4),
        hue: buf.readUInt16LE(5),
        brightness: buf.readUInt8(7),
        saturation: buf.readUInt8(8),
        speed: buf.readUInt8(9),
        duration: buf.readUInt8(10),
        notification_sticky: buf.readUInt8(11) !== 0 ? true : false
    }
    return packet;
}

function decodeMoodPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        mood_id: buf.readUInt8(2)
    }
    return packet;
}

function decodeRotationPacket(buf) {
    var rotationLength = buf.length - 2;
    var rotation = [];

    for (var i = 0; i<rotationLength; i++) {
        rotation.push(buf.readUInt8(2+i));
    }

    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        rotation: rotation
    }
    return packet;
}

function decodeUnknownPacket(buf) {
    var packet = {
        req_id: buf.readUInt8(0),
        op_code: buf.readUInt8(1),
        payload: buf.slice(2)
    }
    return packet;
}




module.exports = {
    makeInitPacket: function(req_id) {
        var buf = new Buffer(3);
        buf.writeUInt8(req_id, 0);                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeInit, 1);    // op code
        buf.writeUInt8(0x03, 2);                                    // device type (ios - 0x01, android - 0x02, ionode - 0x03)
        return buf;
    },

    makeSetDeviceNamePacket: function(req_id, name) {
        var sizedName = name.length <= 18 ? name : name.substring(0, 18);

        var buf = new Buffer(2+sizedName.length);
        buf.writeUInt8(req_id, 0);                                              // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetDeviceName, 1);       // op code
        for (var i = 0; i < sizedName.length; i++) {
            buf.writeUInt8(sizedName.charCodeAt(i), 2+i);                       // fill buffer w/ name
        }
        return buf;
    },

    makeGetDeviceSettingsPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                              // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeGetDeviceSettings, 1);   // op code
        return buf;
    },

    makeSetDeviceSettingsPacket: function(req_id, knock_enabled, quiet_time_enabled, quiet_hour_start, quiet_minute_start, quiet_hour_end, quiet_minute_end, shuffle_time, notifications_enabled, leash_enabled) {
        var buf = new Buffer(11);
        buf.writeUInt8(req_id, 0);                                              // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetDeviceSettings, 1);   // op code
        buf.writeUInt8(knock_enabled ? 0x01 : 0x00, 2);
        buf.writeUInt8(quiet_time_enabled ? 0x01 : 0x00, 3);
        buf.writeUInt8(quiet_hour_start, 4);
        buf.writeUInt8(quiet_minute_start, 5);
        buf.writeUInt8(quiet_hour_end, 6);
        buf.writeUInt8(quiet_minute_end, 7);
        buf.writeUInt8(shuffle_time, 8);
        buf.writeUInt8(notifications_enabled ? 0x01 : 0x00, 9);
        buf.writeUInt8(leash_enabled ? 0x01 : 0x00, 10);
        return buf;
    },

    makeSetWeatherPacket: function(req_id, current_temp, current_conditions, future_temp, future_conditions, sunrise_24hr, sunrise_min, sunset_24hr, sunset_min) {
        var buf = new Buffer(10);
        buf.writeUInt8(req_id, 0);                                          // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetWeather, 1);      // op code
        buf.writeInt8(current_temp, 2);
        buf.writeUInt8(current_conditions, 3);
        buf.writeInt8(future_temp, 4);
        buf.writeUInt8(future_conditions, 5);
        buf.writeUInt8(sunrise_24hr, 6);
        buf.writeUInt8(sunrise_min, 7);
        buf.writeUInt8(sunset_24hr, 8);
        buf.writeUInt8(sunset_min, 9);
        return buf;
    },

    makeSetTimePacket: function(req_id, hr_24, min, sec) {
        var buf = new Buffer(5);
        buf.writeUInt8(req_id, 0);                                          // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetTime, 1);         // op code
        buf.writeUInt8(hr_24, 2);
        buf.writeUInt8(min, 3);
        buf.writeUInt8(sec, 4);
        return buf;
    },

    makeSetMoodConfigPacket: function(req_id, mood_id, config_id, config_data) {
        var buf = new Buffer(8);
        buf.writeUInt8(req_id, 0);                                              // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetMoodConfig, 1);       // op code
        buf.writeUInt8(mood_id, 2);
        buf.writeUInt8(config_id, 3);
        buf.writeUInt32LE(config_data, 4);
        return buf;
    },

    makeGetMoodConfigPacket: function(req_id, mood_id, config_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                              // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeGetMoodConfig, 1);       // op code
        return buf;
    },

    makeSaveMoodConfigsPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                              // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSaveMoodConfigs, 1);      // op code
        return buf;
    },

    makeRestoreMoodConfigsPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeRestoreMoodConfigs, 1);       // op code
        return buf;
    },

    makeSetNotificationConfigPacket: function(req_id, notification_id, enabled, pattern_id, hue, brightness, saturation, speed, duration, sticky) {
        var buf = new Buffer(12);
        buf.writeUInt8(req_id, 0);                                                      // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetNotificationConfig, 1);       // op code
        buf.writeUInt8(notification_id, 2);
        buf.writeUInt8(enabled ? 0x01 : 0x00, 3);
        buf.writeUInt8(pattern_id, 4);
        buf.writeUInt16LE(hue, 5);
        buf.writeUInt8(brightness, 7);
        buf.writeUInt8(saturation, 8);
        buf.writeUInt8(speed, 9);
        buf.writeUInt8(duration, 10);
        buf.writeUInt8(sticky ? 0x01 : 0x00, 11);
        return buf;
    },

    makeGetNotificationConfigPacket: function(req_id, notification_id) {
        var buf = new Buffer(3);
        buf.writeUInt8(req_id, 0);                                                      // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeGetNotificationConfig, 1);       // op code
        buf.writeUInt8(notification_id, 2);
        return buf;
    },

    makeSetCurrentMoodPacket: function(req_id, mood_id) {
        var buf = new Buffer(3);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetCurrentMood, 1);          // op code
        buf.writeUInt8(mood_id, 2);
        return buf;
    },

    makeGetCurrentMoodPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeGetCurrentMood, 1);          // op code
        return buf;
    },

    makeTriggerNotificationPacket: function(req_id, notification_id) {
        var buf = new Buffer(3);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeTriggerNotification, 1);     // op code
        buf.writeUInt8(notification_id, 2);
        return buf;
    },

    makeUpdateRotationPacket: function(req_id, mood_id_array) {
        var sizedMoodArray = mood_id_array.length <= 18 ? mood_id_array : mood_id_array.slice(0, 18);

        var buf = new Buffer(2+sizedMoodArray.length);
        buf.writeUInt8(req_id, 0);                                              // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeUpdateRotation, 1);      // op code
        for (var i = 0; i < sizedMoodArray.length; i++) {
            buf.writeUInt8(sizedMoodArray[i], 2+i);                             // fill buffer w/ mood IDs
        }
        return buf;
    },

    makeGetRotationPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeGetRotation, 1);             // op code
        return buf;
    },

    makeEnterDFUModePacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeEnterDFUMode, 1);            // op code
        return buf;
    },

    makeShowNotificationPacket: function(req_id, pattern_id, hue, brightness, saturation, speed, duration, sticky) {
        var buf = new Buffer(10);
        buf.writeUInt8(req_id, 0);                                                      // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeShowNotification, 1);            // op code
        buf.writeUInt8(pattern_id, 2);
        buf.writeUInt16LE(hue, 3);
        buf.writeUInt8(brightness, 5);
        buf.writeUInt8(saturation, 6);
        buf.writeUInt8(speed, 7);
        buf.writeUInt8(duration, 8);
        buf.writeUInt8(sticky ? 0x01 : 0x00, 9);
        return buf;
    },

    makeBeginBondPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeBeginBond, 1);               // op code
        return buf;
    },

    makeClearNotificationPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeClearNotification, 1);       // op code
        return buf;
    },

    makeSetRawBankPacket: function(req_id, bank_id, led0_color, led1_color, led2_color, led3_color, led4_color) {
        var buf = new Buffer(18);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetRawBank, 1);              // op code
        buf.writeUInt8(bank_id, 2);
        buf.writeUInt8(led0_color.r, 3);
        buf.writeUInt8(led0_color.g, 4);
        buf.writeUInt8(led0_color.b, 5);
        buf.writeUInt8(led1_color.r, 6);
        buf.writeUInt8(led1_color.g, 7);
        buf.writeUInt8(led1_color.b, 8);
        buf.writeUInt8(led2_color.r, 9);
        buf.writeUInt8(led2_color.g, 10);
        buf.writeUInt8(led2_color.b, 11);
        buf.writeUInt8(led3_color.r, 12);
        buf.writeUInt8(led3_color.g, 13);
        buf.writeUInt8(led3_color.b, 14);
        buf.writeUInt8(led4_color.r, 15);
        buf.writeUInt8(led4_color.g, 16);
        buf.writeUInt8(led4_color.b, 17);
        return buf;
    },

    makeSetRawLEDPacket: function(req_id, led_id, led_color) {
        var buf = new Buffer(6);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetRawLED, 1);               // op code
        buf.writeUInt8(led_id, 2);
        buf.writeUInt8(led_color.r, 3);
        buf.writeUInt8(led_color.g, 4);
        buf.writeUInt8(led_color.b, 5);
        return buf;
    },

    makeSetRawClearAllPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetRawClearAll, 1);          // op code
        return buf;
    },

    makeSetRawFillColorPacket: function(req_id, fill_color) {
        var buf = new Buffer(5);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetRawFillColor, 1);         // op code
        buf.writeUInt8(fill_color.r, 2);
        buf.writeUInt8(fill_color.g, 3);
        buf.writeUInt8(fill_color.b, 4);
        return buf;
    },

    makeSetRawRefreshPacket: function(req_id) {
        var buf = new Buffer(2);
        buf.writeUInt8(req_id, 0);                                                  // request id
        buf.writeUInt8(packetOpCodes.kLumenPacketOpCodeSetRawRefresh, 1);           // op code
        return buf;
    },

    decodePacket: function(buf) {
        if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeAck)
            return decodeAckPacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeNak)
            return decodeNakPacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeInit)
            return decodeFirmwareVersionPacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeSetDeviceName)
            return decodeDeviceNamePacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeGetDeviceSettings || buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeSetDeviceSettings)
            return decodeDeviceSettingsPacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeGetMoodConfig || buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeSetMoodConfig)
            return decodeMoodConfigPacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeGetNotificationConfig || buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeSetNotificationConfig)
            return decodeNotificationConfigPacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeSetCurrentMood || buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeGetCurrentMood)
            return decodeMoodPacket(buf);
        else if (buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeUpdateRotation || buf.readUInt8(1) === packetOpCodes.kLumenPacketOpCodeGetRotation)
            return decodeRotationPacket(buf);
        else
            return decodeUnknownPacket(buf);
    },

	supportedProtocolVersion: supportedProtocolVersion,

    packetOpCodes: packetOpCodes,

    packetNakCodes: packetNakCodes,

    weatherCodes: weatherCodes
}