/* IONODE EXAMPLES
 * raw_mode :: cpu load meter
 * scales CPU load to a green/yellow/red color bar
 *
 * by Eric Barch [09.14.14]
 */

// imports
var ionode = require('ionode'),
    os = require('os');


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

  // bottom ring is always bright green
  setRing(0, green_bright);

  // begin loop to write current CPU load to ION
  writeLoadToLampLoop();
});


// define colors used in load bar
var red_bright = {r: 170, g: 0, b: 0};
var red_dim = {r: 20, g: 0, b: 0};
var green_bright = {r: 0, g: 170, b: 0};
var green_dim = {r: 0, g: 20, b: 0};
var yellow_bright = {r: 170, g: 170, b: 0};
var yellow_dim = {r: 20, g: 20, b: 0};


// sets a ring of color (rings 0-9, color: {r: val, g: val, b: val})
function setRing(ringIndex, ringColor) {
  // bad index, shunned!
  if (ringIndex > 9)
    return;

  // invert so that 0 is the bottom ring
  ringIndex = 9 - ringIndex;

  // sets colors in ionode's raw buffer
  ion.setRawLED(ringIndex, ringColor);
  ion.setRawLED(ringIndex+10, ringColor);
  ion.setRawLED(ringIndex+20, ringColor);
  ion.setRawLED(ringIndex+30, ringColor);
}

// grabs CPU load (takes ~100msec) and writes cpu load bar via ION's raw mode
function writeLoadToLampLoop() {
  getCPUPercent(function(currentCPUPercent) {
    if (currentCPUPercent >= 10) {
      setRing(1, green_bright);
    } else {
      setRing(1, green_dim);
    }

    if (currentCPUPercent >= 20) {
      setRing(2, green_bright);
    } else {
      setRing(2, green_dim);
    }

    if (currentCPUPercent >= 30) {
      setRing(3, green_bright);
    } else {
      setRing(3, green_dim);
    }

    if (currentCPUPercent >= 40) {
      setRing(4, yellow_bright);
    } else {
      setRing(4, yellow_dim);
    }

    if (currentCPUPercent >= 50) {
      setRing(5, yellow_bright);
    } else {
      setRing(5, yellow_dim);
    }

    if (currentCPUPercent >= 60) {
      setRing(6, yellow_bright);
    } else {
      setRing(6, yellow_dim);
    }

    if (currentCPUPercent >= 70) {
      setRing(7, red_bright);
    } else {
      setRing(7, red_dim);
    }

    if (currentCPUPercent >= 80) {
      setRing(8, red_bright);
    } else {
      setRing(8, red_dim);
    }

    if (currentCPUPercent >= 90) {
      setRing(9, red_bright);
    } else {
      setRing(9, red_dim);
    }

    // write ionode's raw buffer to ION
    ion.setRawShow(function(err) {
        if (!err) {
          // success, let's have another go
          writeLoadToLampLoop();
        } else {
          // that ain't right
          console.log(err);
        }
    });
  });
}













// from https://gist.github.com/bag-man/5570809

//Create function to get CPU information
function cpuAverage() {
  //Initialise sum of idle and time of cores and fetch CPU info
  var totalIdle = 0, totalTick = 0;
  var cpus = os.cpus();
 
  //Loop through CPU cores
  for(var i = 0, len = cpus.length; i < len; i++) {
 
    //Select CPU core
    var cpu = cpus[i];
 
    //Total up the time in the cores tick
    for(type in cpu.times) {
      totalTick += cpu.times[type];
    }     
 
    //Total up the idle time of the core
    totalIdle += cpu.times.idle;
  }
 
  //Return the average Idle and Tick times
  return {idle: totalIdle / cpus.length,  total: totalTick / cpus.length};
}

function getCPUPercent(cb) {
  //Grab first CPU Measure
  var startMeasure = cpuAverage();

  //Set delay for second Measure
  setTimeout(function() { 
   
    //Grab second Measure
    var endMeasure = cpuAverage(); 
   
    //Calculate the difference in idle and total time between the measures
    var idleDifference = endMeasure.idle - startMeasure.idle;
    var totalDifference = endMeasure.total - startMeasure.total;
   
    //Calculate the average percentage CPU usage
    var percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
   
    //Output result
    cb(percentageCPU);
   
  }, 100);
}
