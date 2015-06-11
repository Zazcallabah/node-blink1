var HID = require('node-hid');

var VENDOR_ID = 0x27B8;
var PRODUCT_ID = 0x01ED;

var REPORT_ID = 1;
var REPORT_LENGTH = 9;

var _blink1HIDdevices = function() {
  return HID.devices(VENDOR_ID, PRODUCT_ID);
};

var devices = function() {
  var serialNumbers = [];

  _blink1HIDdevices().forEach(function(device) {
    serialNumbers.push(device.serialNumber);
  });

  return serialNumbers;
};

function Blink1(serialNumber) {
  var blink1HIDdevices = _blink1HIDdevices();

  if (blink1HIDdevices.length === 0) {
    throw new Error('No blink(1)\'s could be found');
  }

  var blink1HIDdevicePath = null;

  if (serialNumber === undefined) {
    serialNumber =  blink1HIDdevices[0].serialNumber;
  }

  blink1HIDdevices.some(function(blink1HIDdevice) {
    if (serialNumber === blink1HIDdevice.serialNumber) {
      blink1HIDdevicePath = blink1HIDdevice.path;
    }

    return (blink1HIDdevicePath !== null);
  });

  if (blink1HIDdevicePath === null) {
    throw new Error('No blink(1)\'s with serial number ' + serialNumber + ' could be found');
  }

  this.serialNumber = serialNumber;
  this.hidDevice = new HID.HID(blink1HIDdevicePath);
}

Blink1.prototype._sendCommand = function(/* command [, args ...]*/) {
  var featureReport = [REPORT_ID, 0, 0, 0, 0, 0, 0, 0, 0];

  featureReport[1] = arguments[0].charCodeAt(0);

  for (var i = 1; i < arguments.length; i++) {
    featureReport[i + 1] = arguments[i];
  }

  this.hidDevice.sendFeatureReport(featureReport);
};

Blink1.prototype._isValidCallback = function(callback) {
  return (typeof callback === 'function');
};

Blink1.prototype._getCallback(opt) {
  if(!opt) {
    return opt;
  }
  if(this._isValidCallback(opt)) {
    return opt;
  }
  return opt.callback;
}

Blink1.prototype._validateNumber = function(number, name, min, max) {
  if (typeof number !== 'number') {
    throw new Error(name + ' must be a number');
  }

  if (number < min || number > max) {
    throw new Error(name + ' must be between ' + min + ' and ' + max);
  }
};

Blink1.prototype._validateAddress = function(address) {
  this._validateNumber(address, 'address', 0, 0xffff);
};

Blink1.prototype._validateValue = function(value) {
  this._validateNumber(value, 'value', 0, 0xff);
};

Blink1.prototype._validateBit = function(value) {
  this._validateNumber(value, 'bit', 0, 1);
};

Blink1.prototype._validateCount = function(value) {
  this._validateNumber(value, 'count', 0, 0xff);
};

Blink1.prototype._validateFadeMillis = function(fadeMillis) {
  this._validateNumber(fadeMillis, 'fadeMillis', 0, 0x9FFF6);
};

Blink1.prototype._validateRGB = function(r, g, b) {
  this._validateNumber(r, 'r', 0, 0xff);
  this._validateNumber(g, 'g', 0, 0xff);
  this._validateNumber(b, 'b', 0, 0xff);
};

Blink1.prototype._validateMillis = function(millis) {
  this._validateNumber(millis, 'millis', 0, 0x9FFF6);
};

Blink1.prototype._validateMk2Position = function(position) {
  this._validateNumber(position, 'position', 0, 31);
};

Blink1.prototype._validateIndex = function(index) {
  this._validateNumber(index, 'index', 0, 2);
};

Blink1.prototype._readResponse = function(callback) {
  if (this._isValidCallback(callback)) {
    callback.apply(this, [this.hidDevice.getFeatureReport(REPORT_ID, REPORT_LENGTH)]);
  }
};

Blink1.prototype.degamma = function(n) {
  return Math.floor(((1 << Math.floor(n / 32)) - 1) +
          Math.floor((1 << Math.floor(n / 32)) * Math.floor((n % 32) + 1) + 15) / 32);
};

Blink1.prototype.fadeToRGB = function(opt) {
  if(!opt)
    opt={};
  var ledn = opt.ledn || 0;
  var r = opt.r || 0;
  var g = opt.g || 0;
  var b = opt.b || 0;
  var fadeMillis = opt.fadeMillis || 0;
  var gammaAdjust = opt.gammaAdjust || false;

  this._validateFadeMillis(fadeMillis);
  this._validateRGB(r, g, b);
  this._validateIndex(ledn);

  var dms = fadeMillis / 10;
  
  // time component cant be 0
  if( dms === 0 )
    dms = 1;

  var cr = gammaAdjust ? r : this.degamma(r);
  var cg = gammaAdjust ? g : this.degamma(g);
  var cb = gammaAdjust ? b : this.degamma(b);

  this._sendCommand('c', cr, cg, cb, dms >> 8, dms % 0xff, ledn);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.setRGB = function(opt) {
  if(!opt)
    opt={};
  var ledn = opt.ledn || 0;
  var r = opt.r || 0;
  var g = opt.g || 0;
  var b = opt.b || 0;
  var gammaAdjust = opt.gammaAdjust || false;

  this._validateRGB(r, g, b);
  this._validateIndex(ledn);
  
  var cr = gammaAdjust ? r : this.degamma(r);
  var cg = gammaAdjust ? g : this.degamma(g);
  var cb = gammaAdjust ? b : this.degamma(b);

  this._sendCommand('n', cr, cg, cb, 0, 0, ledn);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.readCurrentRGB = function(opt) {
  if(!opt)
    opt={};
  var ledn = opt.ledn || 0;
  this._validateIndex(ledn);

  this._sendCommand('r', ledn, 0, 0, 0, 0, ledn);

  this._readResponse(function(response) {
    var value = {
      r: response[2],
      g: response[3],
      b: response[4],
      ledn: response[7]
    };
    var cb = this._getCallback(opt);
    if(cb) {
      cb(value);
    }
  });
};

Blink1.prototype.serverDown = function(opt) {
  if(!opt)
    opt={};
  var on = opt.on || 0;
  var millis = opt.millis || 0;
  this._validateMillis(millis);
  this._validateBit(on);

  var dms = millis / 10;

  this._sendCommand('D', on, dms >> 8, dms % 0xff);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.playLoop = function(opt) {
  if(!opt)
    opt={};
  var startPosition = opt.startPosition || 0;
  var endPosition = opt.endPosition || 0;
  var count = opt.count || 0;
  var play = opt.play || 0;

  this._validateMk2Position(startPosition);
  this._validateMk2Position(endPosition);
  this._validateCount(count);
  this._validateBit(play);
  if (startPosition > endPosition) {
    throw new Error('startPosition must be less than or equal to endPosition');
  }

  this._sendCommand('p', play, position, endPosition, count);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.play = function(opt) {
  this._sendCommand('p', 1);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.pause = function(opt) {
  this._sendCommand('p', 0);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.readPlayState = function(opt) {
  this._sendCommand('S');

  this._readResponse(function(response) {
    var value = {
      playing: response[2],
      playstart: response[3],
      playend: response[4],
      playcount: response[5],
      playpos: response[6]
    };

    var cb = this._getCallback(opt);
    if(cb) {
      cb(value);
    }
  });
};

Blink1.prototype.writePatternLine = function(opt) {
  if(!opt)
    opt={};
  var fadeMillis = opt.fadeMillis || 0;
  var r = opt.r || 0;
  var g = opt.g || 0;
  var b = opt.b || 0;
  var lineIndex = opt.lineIndex || 0;
  var gammaAdjust = opt.gammaAdjust || false;


  this._validateFadeMillis(fadeMillis);
  this._validateRGB(r, g, b);
  this._validateMk2Position(lineIndex);

  var dms = fadeMillis / 10;

  var cr = gammaAdjust ? r : this.degamma(r);
  var cg = gammaAdjust ? g : this.degamma(g);
  var cb = gammaAdjust ? b : this.degamma(b);

  this._sendCommand('P', cr, cg, cb, dms >> 8, dms % 0xff, lineIndex);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.persistPatternLine = function(opt) {
  this._sendCommand('W', 0xBE, 0xEF, 0xCA, 0xFE);

  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.readPatternLine = function(opt) {
  if(!opt)
    opt={};
  var position = opt.position || 0;
  this._validateMk2Position(position);

  this._sendCommand('R', 0, 0, 0, 0, 0, position, 0);

  this._readResponse(function(response) {
    var value = {
      r: response[2],
      g: response[3],
      b: response[4],
      fadeMillis: ((response[5] << 8) + (response[6] & 0xff)) * 10,
      ledn: response[7]
    };

    var cb = this._getCallback(opt);
    if(cb) {
      cb(value);
    }
  });
};

Blink1.prototype.setLed = function(opt) {
  if(!opt)
    opt={};
  var ledn = opt.ledn || 0;
  this._validateIndex(ledn);
  this._sendCommand('l', ledn);
  var cb = this._getCallback(opt);
  if(cb) {
    cb();
  }
};

Blink1.prototype.version = function(opt) {
  this._sendCommand('v');

  this._readResponse(function(response) {
    var version = String.fromCharCode(response[3]) + '.' + String.fromCharCode(response[4]);
    var cb = this._getCallback(opt);
    if(cb) {
      cb(version);
    }
  });
};

Blink1.prototype.close = function(opt) {
  this.hidDevice.close();

  var cb = this._getCallback(opt);
    if(cb) {
      cb(version);
    }
};

Blink1.devices = devices;

module.exports = Blink1;
module.exports.Blink1 = Blink1; // backwards compatibility with older version
