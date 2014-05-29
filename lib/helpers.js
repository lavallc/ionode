// load in ION json descriptors
var ionJSON = require('./ion.json');
var ionMoods = ionJSON.moods;
var ionNotifications = ionJSON.notifications;


function getMoodForName(moodName) {
	for (mood in ionMoods) {
		if (ionMoods[mood].name.toLowerCase() === moodName.toLowerCase())
			return ionMoods[mood];
	}

	return null;
}

function getMoodConfigForName(moodName, configName) {
	for (mood in ionMoods) {
		if (ionMoods[mood].name.toLowerCase() === moodName.toLowerCase()) {
			for (config in ionMoods[mood].configs) {
				if (ionMoods[mood].configs[config].name.toLowerCase() == configName.toLowerCase())
					return ionMoods[mood].configs[config];
			}
		}
	}

	return null;
}

function isInt(n) {
   return typeof n === 'number' && n % 1 == 0;
}


module.exports = {
	getMoodForName: getMoodForName,
	getMoodConfigForName: getMoodConfigForName,
	isInt: isInt
}