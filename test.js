var ionode = require('./lib/index'),
    ion = ionode.createLamp('d99f89c9a3a9');



ion.connect();


var currentHue = 0;


ion.on('ready', function() {
	console.log('lamp ready');

	// pulse pattern
	ion.setPattern(0x12, function(err) {
		if (!err) {
			setHue();
		}
	});
	
});


// begin hue infinite loop
function setHue() {
	ion.setPatternConfig(0x12, 1, currentHue, function(err) {
		if (!err) {
			setTimeout(setHue(), 1000);
		}
	});
	currentHue++;
	if (currentHue > 359)
		currentHue = 0;
}