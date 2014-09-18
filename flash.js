var binFilename = process.argv[2];

if (!binFilename) {
  console.log('please provide bin file as parameter');
  process.exit(0);
}

var ionode = require('./lib/index');
ionode.updateFirmware(binFilename);