# Ionode - Control your ION lamp from Node!

So we heard you've got an ION. And perhaps you want to control that ION from your PC, Raspberry Pi, or legendary Gibson. Now is your time to shine.


## Getting Started

First off, make sure you're using a Bluetooth 4.0 compatible adapter with your computing device of choice. If you're looking for recommendations, we've tested with this guy extensively: http://www.iogear.com/product/GBU521/ You'll also need to ensure that your user has permission to interact with the Bluetooth adapter. If you're lazy, feel free to run your node scripts with sudo.

## Installation

First, you'll need a recent version of Node.js installed on your system. If you're setting Node.js up on your Raspberry Pi, we recommend following the guide here:

https://learn.adafruit.com/raspberry-pi-hosting-node-red/setting-up-node-dot-js

Once you've got Node.js up and running, it's as simple as...

```
sudo apt-get install bluetooth bluez-utils libbluetooth-dev
mkdir ion && cd ion && npm install ionode
sudo node node_modules/ionode/examples/basic/set_color_loop.js
```

## Basic usage

```javascript
var ionode = require('ionode');
// creates an ION object that will connect to the ION named 'ion'
var ion = ionode.createLamp('ion');

ion.connect();

ion.on('ready', function() {
  console.log('init complete, ion ready');

  // set mood to digital rain
  ion.setMood('digitalrain', function(err) {
    if (!err) {
      console.log('set mood digitalrain!');
    }
  });
});
```


## Events

ION objects inherit from EventEmitter. The following events can be captured.

```javascript
var ion = ionode.createLamp('ion');

// when ION is seen, this is called
ion.on('discovered', function() {
  console.log('ion discovered');
});

// when ION first connects, but before it's ready (initialized) this is called
ion.on('connected', function() {
  console.log('ion connected');
});

// ION disconnected
ion.on('disconnected', function() {
  console.log('ion disconnected');
});

// ionode is currently attempting to reconnect to ION
ion.on('reconnecting', function() {
  console.log('ion reconnecting');
});

// a general ION error occurred
ion.on('error', function(err) {
  console.log('ion error: ' + err);
});

// called when ION is tapped and changes moods
ion.on('mood_changed', function(moodName) {
  console.log('mood changed to ' + moodName);
});

// called when ION completes initialization and is ready to be controlled
ion.on('ready', function() {
  console.log('init complete, ion ready');
});

ion.connect();
```


## Connection

After creating your ion object using 'createLamp', simply call connect.

```javascript
ion.connect();
```

Disconnecting is achieved as one would imagine.

```javascript
ion.disconnect();
```

## ion.getName()

Returns ION's current name (if valid).


## ion.isConnected()

Returns true/false if ION is connected (but not necessarily ready).


## ion.isReady()

Returns true/false if ION is ready to control.


## ion.setAutoReconnect(autoReconnect)

If autoReconnect is true, ionode will automatically try to reconnect if ION becomes disconnected.


## ion.renameDevice(newName, [callback])

Give the specified ION a new name. Callback returns 2 parameters:

  1. error (null if no error)
  2. new name (the name just set)

```javascript
ion.renameDevice('roflcopter', function(err, newName) {
  if (!err)
    console.log('success!');
}
```


## ion.setMood(moodName, callback)

Sets the mood to the mood name provided. Callback returns 2 parameters:

  1. error (null if no error)
  2. new mood name (the mood just set)

```javascript
ion.setMood('lava', function(err, newMoodName) {
  if (!err)
    console.log('success!');
}
```

See the end of this document for all possible moods.

## ion.setMoodConfig(moodName, optionName, [callback])

Used for configs that have no value to be set. For instance, the Light mood supports several of these configs. Callback consists of only an error parameter (null if no error).

```javascript
ion.setMoodConfig('light', 'bluesky', function(err) {
  if (!err)
    console.log('beautiful blue skies');
});
```

See the end of this document for all possible mood configs.

## ion.setMoodConfig(moodName, optionName, value, [callback])

Used for configs that expect a value to be set. Callback consists of only an error parameter (null if no error).

```javascript
ion.setMoodConfig('digitalrain', 'speed', 255, function(err) {
  if (!err)
    console.log('lickity split!');
});
```

See the end of this document for all possible mood configs.

## ion.setMoodConfig(moodName, optionName, value1, value2, [callback])

Currently only used for setting color of a mood. The first value is hue (0-360) with the second being saturation (0-255). Callback consists of only an error parameter (null if no error).

```javascript
ion.setMoodConfig('digitalrain', 'color', 240, 255, function(err) {
  if (!err)
    console.log('proud to be blue');
});
```

See the end of this document for all possible mood configs.

## ion.getMoodConfig(moodName, optionName, [callback])

Returns the current value of the mood config. Callback returns 2 parameters:

  1. error (null if no error)
  2. new mood name (the mood just set)

```javascript
ion.getMoodConfig('rainbow', 'speed', function(err, val) {
  if (!err)
    console.log('rainbow speed is set to ' + val);
}
```

## ion.getRotation(callback)

Returns the current list of moods in the ION's rotation list (which can be modified via the mobile app). Callback consists of 2 parameters:

  1. error (null if no error)
  2. array of mood names

## ion.saveMoodConfigs([callback])

Stores the current mood's configs to flash memory. After saving, power cycling ION will result in the same state of the mood being restored. Callback consists of only an error parameter (null if no error).

```javascript
ion.saveMoodConfigs(function(err) {
  if (!err)
    console.log('damn, that is some fine saving');
}
```

## ion.restoreCurrentMoodConfigsToDefault([callback])

Returns the current mood's configs back to the factory default and commits to flash. Callback consists of only an error parameter (null if no error).

```javascript
ion.restoreCurrentMoodConfigsToDefault(function(err) {
  if (!err)
    console.log('a fresh start');
}
```

## Raw Mode

Raw mode allows you to manipulate each pixel to your heart's content. Ionode uses an internal buffer to hold onto LED state. Only after calling setRawShow() will your changes appear (unless you use setRawClearAll or setRawFillColor, those update immediately).


### ion.setRawLED(ledIndex, {r: ?, g: ?, b: ?})

ledIndex can range between 0-39. Each 10 indicies corresponds to a vertical row of LEDs on ION, for a total of "4 sides".

The second parameter must be an object containing an r, g, and b value.

```javascript
// the lonely red pixel
ion.setRawLED(0, {r: 255, g: 0, b: 0});
```


### ion.setRawShow([callback])

After using setRawLED(), your changes can be sent and displayed on your ION by using setRawShow(). Callback consists of only an error parameter (null if no error).

```javascript
ion.setRawShow(function(err) {
  if (!err)
    console.log('pretty colors');
});
```


### ion.setRawClearAll([callback])

This call will set all LEDs to the 'off' state and immediately update ION. Callback consists of only an error parameter (null if no error).

```javascript
ion.setRawClearAll(function(err) {
  if (!err)
    console.log('it all goes dark');
});
```


### ion.setRawFillColor({r: ?, g: ?, b: ?}, [callback])

This call will set all LEDs to the rgb values specified and immediately update ION. Callback consists of only an error parameter (null if no error).

```javascript
ion.setRawFillColor({r: 0, g: 0, b: 255}, function(err) {
  if (!err)
    console.log('not effing blue enough');
});
```


## ion.beginWeatherUpdates(latitude, longitude)

Tells ionode to begin sending weather data to ION every 15 minutes for the Weather and Thermometer moods.

```javascript
ion.beginWeatherUpdates("43.00", "-83.00");
```


## ion.showNotification(notificationName, hue, brightness, saturation, speed, duration, sticky, [callback])

Displays a notification on ION. Callback consists of only an error parameter (null if no error). Parameters are as follows:

  * notificationName ('halo', 'spin', or 'glow')
  * hue (0-360)
  * brightness (0-255)
  * saturation (0-255)
  * speed (0-255)
  * duration (0-10) seconds
  * sticky (true/false) if the notification must be acknowledged by tapping the top or calling clearNotification()

```javascript
// a friendly green bouncing disc
ion.showNotification('halo', 120, 255, 255, 40, 3, false, function(err) {
  if (!err)
    console.log('it bounces!');
});
```


## ion.clearNotification([callback])

Clears a sticky notification (if active). Callback consists of only an error parameter (null if no error).

```javascript
ion.clearNotification(function(err) {
  if (!err)
    console.log('and now back to your regularly scheduled programming');
});
```


## Mood List
  * off
  * light
  * flame
  * digitalrain
  * rainbow
  * weather
  * thermometer
  * hourglass
  * lava
  * lines
  * plasma
  * sparkle
  * spiral
  * fireworks
  * strobe
  * pulse
  * rave
  * whirlpool
  * volume


## Mood Config options

### Off
  * n/a

### Light
  * candle (no parameters)
  * incandescent (no parameters)
  * fluorescent (no parameters)
  * bluesky (no parameters)
  * sunlight (no parameters)
  * brightness (0-255)
  * color (0-360 hue, 0-255 saturation)
  * lowglow (0-disabled, 1-enabled)

### Flame
  * color (0-360 hue, 0-255 saturation)
  * inferno (0-disabled, 1-enabled)
  * enablesound (0-disabled, 1-enabled)

### Light
  * candle (no parameters)
  * incandescent (no parameters)
  * fluorescent (no parameters)
  * bluesky (no parameters)
  * sunlight (no parameters)
  * brightness (0-255)
  * color (0-360 hue, 0-255 saturation)
  * lowglow (0-disabled, 1-enabled)

### DigitalRain
  * color (0-360 hue, 0-255 saturation)
  * speed (0-255)

### Rainbow
  * speed (0-150)
  * brightness (0-255)
  * reverse (0-disabled, 1-enabled)

### Weather
  * forecast (0-disabled, 1-enabled)

### Thermometer
  * forecast (0-disabled, 1-enabled)

### Hourglass
  * time (0-65535 seconds)
  * color (0-360 hue, 0-255 saturation)

### Lava
  * color (0-360 hue, 0-255 saturation)
  * speed (0-255)

### Lines
  * color (0-360 hue, 0-255 saturation)
  * speed (0-255)

### Plasma
  * color (0-360 hue, 0-255 saturation)
  * speed (0-150)
  * soundenabled (0-disabled, 1-enabled)

### Sparkle
  * color (0-360 hue, 0-255 saturation)
  * speed (0-150)
  * sparklebrightness (0-255)

### Spiral
  * color (0-360 hue, 0-255 saturation)
  * speed (0-255)
  * brightness (0-255)

### Fireworks
  * dominantcolor (0-360 hue, 0-255 saturation)
  * enablecolor (0-disabled, 1-enabled)
  * speed (0-255)
  * frequency (0-255)
  * soundenabled (0-disabled, 1-enabled)

### Strobe
  * color (0-360 hue, 0-255 saturation)
  * colorenabled (0-disabled, 1-enabled)
  * interval (0-255)

### Pulse
  * speed (0-255)
  * soundenabled (0-disabled, 1-enabled)

### Rave
  * speed (0-255)
  * dominantcolor (0-360 hue, 0-255 saturation)
  * bassboost (0-disabled, 1-enabled)

### Whirlpool
  * speed (0-255)
  * dominantcolor (0-360 hue, 0-255 saturation)
  * bassboost (0-disabled, 1-enabled)

### Volume
  * n/a
