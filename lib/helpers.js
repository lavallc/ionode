// load in ION json descriptors
var ionJSON = require('./ion.json');
var ionMoods = ionJSON.moods;
var ionNotifications = ionJSON.notifications;


function getMoodForName(moodName) {
	for (mood in ionMoods) {
		// this allows names with or without spaces, with or without capitals
		if (ionMoods[mood].name.toLowerCase().replace(/\s+/g, '') === moodName.toLowerCase().replace(/\s+/g, ''))
			return ionMoods[mood];
	}

	// TEMPORARY: treat notifications as moods
	for (mood in ionNotifications) {
		// this allows names with or without spaces, with or without capitals
		if (ionMoods[mood].name.toLowerCase().replace(/\s+/g, '') === moodName.toLowerCase().replace(/\s+/g, ''))
			return ionMoods[mood];
	}

	return null;
}

function getMoodConfigForName(moodName, configName) {
	for (mood in ionMoods) {
		// this allows names with or without spaces, with or without capitals
		if (ionMoods[mood].name.toLowerCase().replace(/\s+/g, '') === moodName.toLowerCase().replace(/\s+/g, '')) {
			for (config in ionMoods[mood].configs) {
				// this allows names with or without spaces, with or without capitals
				if (ionMoods[mood].configs[config].name.toLowerCase().replace(/\s+/g, '') == configName.toLowerCase().replace(/\s+/g, ''))
					return ionMoods[mood].configs[config];
			}
		}
	}

	// TEMPORARY: treat notifications as moods
	for (mood in ionNotifications) {
		// this allows names with or without spaces, with or without capitals
		if (ionMoods[mood].name.toLowerCase().replace(/\s+/g, '') === moodName.toLowerCase().replace(/\s+/g, '')) {
			for (config in ionMoods[mood].configs) {
				// this allows names with or without spaces, with or without capitals
				if (ionMoods[mood].configs[config].name.toLowerCase().replace(/\s+/g, '') == configName.toLowerCase().replace(/\s+/g, ''))
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