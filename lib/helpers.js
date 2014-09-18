// load in ION json descriptors
var ionJSON = require('./ion.json');
var ionMoods = ionJSON.moods;
var ionNotifications = ionJSON.notifications;


// get a mood object for a name (spaces and case ignored)
function getMoodForName(moodName) {
	for (mood in ionMoods) {
		// this allows names with or without spaces, with or without capitals
		if (ionMoods[mood].name.toLowerCase().replace(/\s+/g, '') === moodName.toLowerCase().replace(/\s+/g, ''))
			return ionMoods[mood];
	}

	return null;
}

// given a mood ID, return its name
function getNameForMoodId(moodId) {
	for (mood in ionMoods) {
		// this allows names with or without spaces, with or without capitals
		if (ionMoods[mood].id === moodId)
			return ionMoods[mood].name.toLowerCase().replace(/\s+/g, '');
	}

	return null;
}

// given a mood name and config name, return a config object (description)
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

	return null;
}

// given a notification name, return its notification object
function getNotificationForName(notificationName) {
	for (notification in ionNotifications) {
		// this allows names with or without spaces, with or without capitals
		if (ionNotifications[notification].name.toLowerCase().replace(/\s+/g, '') === notificationName.toLowerCase().replace(/\s+/g, ''))
			return ionNotifications[notification];
	}

	return null;
}

function isInt(n) {
   return typeof n === 'number' && n % 1 == 0;
}


module.exports = {
	getMoodForName: getMoodForName,
	getNameForMoodId: getNameForMoodId,
	getMoodConfigForName: getMoodConfigForName,
	getNotificationForName: getNotificationForName,
	isInt: isInt
}