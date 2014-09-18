/* ION buffer for raw mode */

var ionBuffer = [];
var ionBufferStateWritten = [];

function initArray(red, green, blue) {
	ionBuffer = [];
	ionBufferStateWritten = [];
	for (var i=0; i<40; i++) {
		ionBuffer.push({r: red, g: green, b: blue});
		ionBufferStateWritten.push(true);
	}
}

// initialize
initArray(0, 0, 0);

function setLED(index, color) {
	if (index < 40) {
		if('r' in color && 'g' in color && 'b' in color) {
			ionBuffer[index] = {r: color.r, g: color.g, b: color.b};
			ionBufferStateWritten[index] = false;
		}
	}
}

function getBuffer() {
	return ionBuffer;
}

function getLED(ledIndex) {
	return ionBuffer[ledIndex];
}

function clearBuffer() {
	initArray(0, 0, 0);
}

function fillBuffer(r, g, b) {
	initArray(r, g, b);
}

function wroteBank(bankId) {
	var bankStart = 5*bankId;
	for (var i=bankStart; i<bankStart+5; i++) {
		ionBufferStateWritten[i] = true;
	}
}

function doesBankRequireUpdate(bankId) {
	var bankStart = 5*bankId;
	for (var i=bankStart; i<bankStart+5; i++) {
		if (!ionBufferStateWritten[i])
			return true;
	}
	return false;
}


module.exports = {
	setLED: setLED,
	getBuffer: getBuffer,
	getLED: getLED,
	clearBuffer: clearBuffer,
	fillBuffer: fillBuffer,
	wroteBank: wroteBank,
	doesBankRequireUpdate: doesBankRequireUpdate
}