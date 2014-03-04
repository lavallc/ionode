var ionode = require('./lib/index'),
    ion = ionode.createLamp('d99f89c9a3a9');



ion.connect();


var currentHue = 0;


ion.on('ready', function() {
	console.log('lamp ready');

	// pulse pattern
	ion.setPattern(ionode.PATTERNS.Boost, function(err) {
		if (!err) {
			setHue();
		}
	});
});


// begin hue infinite loop
function setHue() {
	var config_id = 1;
	var config_val = currentHue;

	ion.setPatternConfig(ionode.PATTERNS.Boost, config_id, config_val, function(err) {
		if (!err) {
			setTimeout(setHue, 100);
		}
	});

	// cycle the hue value
	currentHue++;
	if (currentHue > 359)
		currentHue = 0;
}