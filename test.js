var ionode = require('./lib/index'),
    ion = ionode.createLamp('d99f89c9a3a9');



ion.setAutoReconnect(true);
ion.connect();


ion.on('discovered', function() {
	console.log('lamp discovered');
});

ion.on('connected', function() {
	console.log('connected');
});

ion.on('disconnected', function() {
	console.log('disconnected');
});

ion.on('reconnecting', function() {
	console.log('reconnecting');
});

ion.on('error', function(err) {
	console.log('error: ' + err);
});



ion.on('ready', function() {
	console.log('lamp ready');

	ion.setMood('digital rain', function(err) {
		if (!err) {
			setHue();
		}
	});
});


// begin hue infinite loop
var currentHue = 0;

function setHue() {
	ion.setMoodConfig('digital rain', 'hue', currentHue, function(err) {
		if (!err) {
			setTimeout(setHue, 50);
		}
	});

	// cycle the hue value
	currentHue++;
	if (currentHue > 359)
		currentHue = 0;
}