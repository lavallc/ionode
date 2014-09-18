/* IONODE EXAMPLES
 * basic :: set color loop
 * sets hue and saturation (changing over time) in a loop
 *
 * by Eric Barch [09.15.14]
 */

// imports
var ionode = require('../../lib/index');


// replace with your ION's name (default is 'ion')
var ion = ionode.createLamp('ion');


// when disconnected, attempt to reconnect
ion.setAutoReconnect(true);

// attempt to connect to ION
ion.connect();

// when ION is seen, this is called
ion.on('discovered', function() {
  console.log('ion discovered');
});

// when ION first connects, but before it's ready (initialized) this is called
ion.on('connected', function() {
  console.log('ion connected');
});

// ION was disconnected
ion.on('disconnected', function() {
  console.log('ion disconnected');
});

// ionode is attempting to reconnect to ION
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

  // set mood to digital rain
  ion.setMood('digitalrain', function(err, newMoodName) {
    if (!err) {
      // our callback contains the new mood name that we just set
      console.log('set mood: ' + newMoodName);

      // begin setting a new color continuously
      setColorLoop();
    }
  });
});


// current value of hue that we will increment and write to ION (0 = red, 120 = green, 240 = blue)
var currentHue = 0;

function setColorLoop() {
  // when setting color, we must always write a hue and saturation together
  ion.setMoodConfig('digitalrain', 'color', currentHue, 255, function(err) {
    if (!err) {
      console.log('hue set to ' + currentHue);

      // cycle the hue value
      if (currentHue >= 359)
        currentHue = 0;
      else
        currentHue++;

      // call ourselves again
      setColorLoop();
    } else {
      // error
      console.log('bah humbug');
    }
  });
}