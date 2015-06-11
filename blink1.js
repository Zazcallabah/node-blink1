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

Blink1.prototype._doCallback = function(opt, par) {
  if(this._isValidCallback(opt)) {
    opt(par);
  }
  else if(opt && this._isValidCallback(opt.callback)) {
    opt.callback(par);
  }
};

Blink1.prototype._validateNumber = function(number, name, min, max) {
  if (typeof number !== 'number' || isNaN(number)) {
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
  var ledn = parseInt(opt.ledn || 0, 10);
  var r = parseInt(opt.r || 0, 10);
  var g = parseInt(opt.g || 0, 10);
  var b = parseInt(opt.b || 0, 10);
  var fadeMillis = parseInt(opt.fadeMillis || 0, 10);
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

  this._doCallback(opt);
};

Blink1.prototype.setRGB = function(opt) {
  if(!opt)
    opt={};
  var ledn = parseInt(opt.ledn || 0, 10);
  var r = parseInt(opt.r || 0, 10);
  var g = parseInt(opt.g || 0, 10);
  var b = parseInt(opt.b || 0, 10);
  var gammaAdjust = opt.gammaAdjust || false;

  this._validateRGB(r, g, b);
  this._validateIndex(ledn);
  
  var cr = gammaAdjust ? r : this.degamma(r);
  var cg = gammaAdjust ? g : this.degamma(g);
  var cb = gammaAdjust ? b : this.degamma(b);

  this._sendCommand('n', cr, cg, cb, 0, 0, ledn);

  this._doCallback(opt);
};

Blink1.prototype.readCurrentRGB = function(opt) {
  if(!opt)
    opt={};
  var ledn = parseInt(opt.ledn || 0, 10);
  this._validateIndex(ledn);

  this._sendCommand('r', ledn, 0, 0, 0, 0, ledn);

  this._readResponse(function(response) {
    var value = {
      r: response[2],
      g: response[3],
      b: response[4],
      ledn: response[7]
    };
    this._doCallback(opt, value);
  });
};

Blink1.prototype.serverDown = function(opt) {
  if(!opt)
    opt={};
  var on = parseInt(opt.on || 0, 10);
  var millis = parseInt(opt.millis || 0, 10);
  this._validateMillis(millis);
  this._validateBit(on);

  var dms = millis / 10;

  this._sendCommand('D', on, dms >> 8, dms % 0xff);

  this._doCallback(opt);
};

Blink1.prototype.playLoop = function(opt) {
  if(!opt)
    opt={};
  var startPosition = parseInt(opt.startPosition || 0, 10);
  var endPosition = parseInt(opt.endPosition || 0, 10);
  var count = parseInt(opt.count || 0, 10);
  var play = parseInt(opt.play || 0, 10);

  this._validateMk2Position(startPosition);
  this._validateMk2Position(endPosition);
  this._validateCount(count);
  this._validateBit(play);
  if (startPosition > endPosition) {
    throw new Error('startPosition must be less than or equal to endPosition');
  }

  this._sendCommand('p', play, position, endPosition, count);

  this._doCallback(opt);
};

Blink1.prototype.play = function(opt) {
  this._sendCommand('p', 1);

  this._doCallback(opt);
};

Blink1.prototype.pause = function(opt) {
  this._sendCommand('p', 0);

  this._doCallback(opt);
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

    this._doCallback(opt, value);
  });
};

Blink1.prototype.writePatternLine = function(opt) {
  if(!opt)
    opt={};
  var fadeMillis = parseInt(opt.fadeMillis || 0, 10);
  var r = parseInt(opt.r || 0, 10);
  var g = parseInt(opt.g || 0, 10);
  var b = parseInt(opt.b || 0, 10);
  var lineIndex = parseInt(opt.lineIndex || 0, 10);
  var gammaAdjust = opt.gammaAdjust || false;


  this._validateFadeMillis(fadeMillis);
  this._validateRGB(r, g, b);
  this._validateMk2Position(lineIndex);

  var dms = fadeMillis / 10;

  var cr = gammaAdjust ? r : this.degamma(r);
  var cg = gammaAdjust ? g : this.degamma(g);
  var cb = gammaAdjust ? b : this.degamma(b);

  this._sendCommand('P', cr, cg, cb, dms >> 8, dms % 0xff, lineIndex);

  this._doCallback(opt);
};

Blink1.prototype.persistPatternLine = function(opt) {
  this._sendCommand('W', 0xBE, 0xEF, 0xCA, 0xFE);

  this._doCallback(opt);
};

Blink1.prototype.readPatternLine = function(opt) {
  if(!opt)
    opt={};
  var lineIndex = parseInt(opt.lineIndex || 0, 10);
  this._validateMk2Position(lineIndex);

  this._sendCommand('R', 0, 0, 0, 0, 0, lineIndex, 0);

  this._readResponse(function(response) {
    var value = {
      lineIndex: lineIndex,
      r: response[2],
      g: response[3],
      b: response[4],
      fadeMillis: ((response[5] << 8) + (response[6] & 0xff)) * 10,
      ledn: response[7]
    };
    this._doCallback(opt, value);
  });
};

Blink1.prototype.setLed = function(opt) {
  if(!opt)
    opt={};
  var ledn = parseInt(opt.ledn || 0, 10);
  this._validateIndex(ledn);
  this._sendCommand('l', ledn);
  this._doCallback(opt);
};

Blink1.prototype.version = function(opt) {
  this._sendCommand('v');

  this._readResponse(function(response) {
    var version = String.fromCharCode(response[3]) + '.' + String.fromCharCode(response[4]);
    this._doCallback(opt, version);
  });
};

Blink1.prototype.close = function(opt) {
  this.hidDevice.close();

  this._doCallback(opt);
};

Blink1.devices = devices;

module.exports = Blink1;
module.exports.Blink1 = Blink1; // backwards compatibility with older version
