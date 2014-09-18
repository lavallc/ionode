/* IONODE EXAMPLES
 * weather :: weather updates
 * demonstrates sending weather data to ION via latitude and longitude
 *
 * by Eric Barch [09.17.14]
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

  // begin weather updates with given latitude/longitude (will update every 15 minutes automatically)
  ion.beginWeatherUpdates("43.00", "-83.00");
});