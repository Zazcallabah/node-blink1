
var should = require('should');
var mockery = require('mockery');

describe('blink(1)', function() {
  var BLINK1_SRC_PATH = './blink1';

  var VENDOR_ID = 0x27B8;
  var PRODUCT_ID = 0x01ED;

  var FEATURE_REPORT_ID = 1;
  var FEATURE_REPORT_LENGTH = 9;

  var MOCK_HID_DEVICE_1_SERIAL_NUMBER = '1A001407';
  var MOCK_HID_DEVICE_2_SERIAL_NUMBER = '1A001408';
  var MOCK_HID_DEVICE_1_PATH = 'path_1A001407';
  var MOCK_HID_DEVICE_2_PATH = 'path_1A001408';

  var MOCK_HID_DEVICE_1 = {
    serialNumber: MOCK_HID_DEVICE_1_SERIAL_NUMBER,
    path: MOCK_HID_DEVICE_1_PATH
  };

  var MOCK_HID_DEVICE_2 = {
    serialNumber: MOCK_HID_DEVICE_2_SERIAL_NUMBER,
    path: MOCK_HID_DEVICE_2_PATH
  };

  var Blink1;
  var mockHIDdevices;
  var sentFeatureReport;
  var recvFeatureReport;
  var closed = false;

  var mockHIDdevice = {
    sendFeatureReport: function(featureReport) {
      sentFeatureReport = featureReport;
    },

    getFeatureReport: function(id, length) {
      return ((id === FEATURE_REPORT_ID ) && (length === FEATURE_REPORT_LENGTH)) ? recvFeatureReport : null;
    },

    close: function() {
      closed = true;
    }
  };

  var mockHID = {
    devices: function(vendorId, productId) {
      return ((vendorId === VENDOR_ID) && (productId === PRODUCT_ID)) ? mockHIDdevices : null;
    },

    HID: function(path) {
      return (path === MOCK_HID_DEVICE_1_PATH) ? mockHIDdevice : null;
    }
  };

  beforeEach(function() {
    mockery.registerAllowable(BLINK1_SRC_PATH);
    mockery.enable();

    mockery.registerMock('node-hid', mockHID);

    Blink1 = require(BLINK1_SRC_PATH);
  });

  afterEach(function() {
    mockery.deregisterAllowable(BLINK1_SRC_PATH);
    mockery.disable();

    mockery.deregisterMock('node-hid');

    Blink1 = null;
    mockHIDdevices = null;

    recvFeatureReport = null;
    sentFeatureReport = null;
  });

  describe('#devices', function() {

    it('should return no serial numbers when there are no blink(1) HID devices', function() {
      mockHIDdevices = [];

      Blink1.devices().should.have.length(0);
    });

    it('should return two serial numbers when there are two blink(1) HID devices', function() {
      mockHIDdevices = [MOCK_HID_DEVICE_1, MOCK_HID_DEVICE_2];

      Blink1.devices().should.eql([MOCK_HID_DEVICE_1_SERIAL_NUMBER, MOCK_HID_DEVICE_2_SERIAL_NUMBER]);
    });
  });

  describe('#Blink1', function() {

    it('should throw an error when there are no blink(1) HID devices', function() {
      mockHIDdevices = [];

      (function(){
        new Blink1();
      }).should.throwError('No blink(1)\'s could be found');
    });

    it('should not throw an error when there are blink(1) HID devices', function() {
      mockHIDdevices = [MOCK_HID_DEVICE_1];

      new Blink1();
    });

    it('should throw an error when there are no blink(1) HID devices with the supplied serial number', function() {
      mockHIDdevices = [MOCK_HID_DEVICE_1];

      (function(){
        new Blink1(MOCK_HID_DEVICE_2_SERIAL_NUMBER);
      }).should.throwError('No blink(1)\'s with serial number ' + MOCK_HID_DEVICE_2_SERIAL_NUMBER + ' could be found');
    });

    it('should not throw an error when there are blink(1) HID devices with the supplied serial number', function() {
      mockHIDdevices = [MOCK_HID_DEVICE_1];

      new Blink1(MOCK_HID_DEVICE_1_SERIAL_NUMBER);
    });

    it('should store correct serial number', function() {
      mockHIDdevices = [MOCK_HID_DEVICE_1];

      var blink1 = new Blink1(MOCK_HID_DEVICE_1_SERIAL_NUMBER);
      blink1.serialNumber.should.eql(MOCK_HID_DEVICE_1_SERIAL_NUMBER);
    });

    it('should select first blink(1) HID device when no serial number is supplied', function() {
      mockHIDdevices = [MOCK_HID_DEVICE_1, MOCK_HID_DEVICE_2];

      var blink1 = new Blink1();
      blink1.serialNumber.should.eql(MOCK_HID_DEVICE_1_SERIAL_NUMBER);
    });

    it('should open correct HID device path', function() {
      mockHIDdevices = [MOCK_HID_DEVICE_1, MOCK_HID_DEVICE_2];

      var blink1 = new Blink1(MOCK_HID_DEVICE_1_SERIAL_NUMBER);
      blink1.serialNumber.should.eql(MOCK_HID_DEVICE_1_SERIAL_NUMBER);
      blink1.hidDevice.should.equal(mockHIDdevice);
    });
  });

  var blink1;

  var setupBlink1 = function() {
    mockHIDdevices = [MOCK_HID_DEVICE_1, MOCK_HID_DEVICE_2];

    blink1 = new Blink1();
  };

  var teardownBlink1 = function() {
    blink1 = null;
  };

  describe('#Blink1.version', function() {

    beforeEach(function() {
      setupBlink1();

      recvFeatureReport = [FEATURE_REPORT_ID, 0x76, 0, 0x31, 0x30, 0, 0, 0, 0];
    });
    afterEach(teardownBlink1);

    it('should send version feature report', function() {
      blink1.version();

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x76, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('should call back with version', function(done) {
      blink1.version(function(version) {
        done();
      });
    });

    it('should call back with correct version', function(done) {

      blink1.version(function(version) {
        version.should.eql('1.0');
        done();
      });
    });
  });

  describe('#Blink1.fadeRGB', function() {
    var FADE_MILLIS = 10;
    var R = 10;
    var G = 20;
    var B = 40;
    var INDEX = 1;

    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should throw an error when fadeMillis is not a number', function() {
      (function(){
        blink1.fadeRGB({fadeMillis:'Bad fadeMillis'});
      }).should.throwError('fadeMillis must be a number');
    });

    it('should throw an error when fadeMillis is less than 0', function() {
      (function(){
        blink1.fadeRGB({fadeMillis:-1});
      }).should.throwError('fadeMillis must be between 0 and 655350');
    });

    it('should throw an error when fadeMillis is greater than 655350', function() {
      (function(){
        blink1.fadeRGB({fadeMillis:655351});
      }).should.throwError('fadeMillis must be between 0 and 655350');
    });

    it('should throw an error when r is not a number', function() {
      (function(){
        blink1.fadeRGB({r:'nan'});
      }).should.throwError('r must be a number');
    });

    it('should throw an error when r is less than 0', function() {
      (function(){
        blink1.fadeRGB({r:-1});
      }).should.throwError('r must be between 0 and 255');
    });

    it('should throw an error when r is greater than 255', function() {
      (function(){
        blink1.fadeRGB({r:256});
      }).should.throwError('r must be between 0 and 255');
    });

    it('should throw an error when g is not a number', function() {
      (function(){
        blink1.fadeRGB({g:'nan'});
      }).should.throwError('g must be a number');
    });

    it('should throw an error when g is less than 0', function() {
      (function(){
        blink1.fadeRGB({g:-1});
      }).should.throwError('g must be between 0 and 255');
    });

    it('should throw an error when g is greater than 255', function() {
      (function(){
        blink1.fadeRGB({g:256});
      }).should.throwError('g must be between 0 and 255');
    });

    it('should throw an error when b is not a number', function() {
      (function(){
        blink1.fadeRGB({b:'nan'});
      }).should.throwError('b must be a number');
    });

    it('should throw an error when b is less than 0', function() {
      (function(){
        blink1.fadeRGB({b:-1});
      }).should.throwError('b must be between 0 and 255');
    });

    it('should throw an error when b is greater than 255', function() {
      (function(){
        blink1.fadeRGB({b:256});
      }).should.throwError('b must be between 0 and 255');
    });

    it('should send fadetorgb feature report', function() {
      blink1.fadeRGB({fademillis:FADE_MILLIS, r:R, g:G, b:B});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x63, R, G, B, (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, 0, 0]);
    });

    it('should call back', function(done) {
      blink1.fadeRGB({fademillis:FADE_MILLIS, r:R, g:G, b:B, callback: done});
    });

    it('should call back as default parameter', function(done) {
      blink1.fadeRGB(done);
    });

    it('should throw an error when index is less than 0', function() {
      (function(){
        blink1.fadeRGB({ledn: -1});
      }).should.throwError('index must be between 0 and 2');
    });

    it('should throw an error when index is greater than 2', function() {
      (function(){
        blink1.fadeRGB({ledn: 3});
      }).should.throwError('index must be between 0 and 2');
    });

    it('should send fadetorgb index feature report', function() {
      blink1.fadeRGB({fademillis:FADE_MILLIS, r:R, g:G, b:B, ledn:INDEX});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x63, R, G, B, (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, INDEX, 0]);
    });
	
    it('should send fadetorgb index feature report speed param', function() {
      blink1.fadeRGB({speed:FADE_MILLIS, r:R, g:G, b:B, ledn:INDEX});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x63, R, G, B, (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, INDEX, 0]);
    });

    it('should send fadetorgb index feature report despite string parameters', function() {
      blink1.fadeRGB({fademillis:""+FADE_MILLIS, r:""+R, g:""+G, b:""+B, ledn:""+INDEX});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x63, R, G, B, (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, INDEX, 0]);
    });
    it('should send fadetorgb index feature report with gamma adjustment', function() {
      blink1.fadeRGB({fademillis:FADE_MILLIS, r:R, g:G, b:B, ledn:INDEX, gammaAdjust:true});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x63, blink1.degamma(R),  blink1.degamma(G),  blink1.degamma(B), (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, INDEX, 0]);
    });
  });

  describe('#Blink1.setRGB', function() {
    var R = 10;
    var G = 20;
    var B = 40;

    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should throw an error when r is not a number', function() {
      (function(){
        blink1.setRGB({r:'Bad r'});
      }).should.throwError('r must be a number');
    });

    it('should throw an error when r is less than 0', function() {
      (function(){
        blink1.setRGB({r:-1});
      }).should.throwError('r must be between 0 and 255');
    });

    it('should throw an error when r is greater than 255', function() {
      (function(){
        blink1.setRGB({r:256});
      }).should.throwError('r must be between 0 and 255');
    });

    it('should throw an error when g is not a number', function() {
      (function(){
        blink1.setRGB({g:'bad'});
      }).should.throwError('g must be a number');
    });

    it('should throw an error when g is less than 0', function() {
      (function(){
        blink1.setRGB({g:-1});
      }).should.throwError('g must be between 0 and 255');
    });

    it('should throw an error when g is greater than 255', function() {
      (function(){
        blink1.setRGB({g:256});
      }).should.throwError('g must be between 0 and 255');
    });

    it('should throw an error when b is not a number', function() {
      (function(){
        blink1.setRGB({b:'bbb'});
      }).should.throwError('b must be a number');
    });

    it('should throw an error when b is less than 0', function() {
      (function(){
        blink1.setRGB({b:-1});
      }).should.throwError('b must be between 0 and 255');
    });

    it('should throw an error when b is greater than 255', function() {
      (function(){
        blink1.setRGB({b:256});
      }).should.throwError('b must be between 0 and 255');
    });

    it('should send setrgb feature report', function() {
      blink1.setRGB({r:R, g:G, b:B});
      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x6e, R, G, B, 0, 0, 0, 0]);
    });

    it('should send setrgb feature report despite string params', function() {
      blink1.setRGB({r:R+"", g:""+G, b:""+B});
      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x6e, R, G, B, 0, 0, 0, 0]);
    });

    it('should send setrgb feature report with gamma adjustment', function() {
      blink1.setRGB({r:R, g:G, b:B, gammaAdjust:true});
      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x6e, blink1.degamma(R),  blink1.degamma(G),  blink1.degamma(B), 0, 0, 0, 0]);
    });

    it('should call back', function(done) {
      blink1.setRGB(done);
    });
  });

  describe('#Blink1.readRGB', function() {
    var INDEX = 1;
    var R = 1;
    var G = 2;
    var B = 3;

    beforeEach(function() {
      setupBlink1();

      recvFeatureReport = [FEATURE_REPORT_ID, 0x72, R, G, B, 0, 0, 0, 0];
    });
    afterEach(teardownBlink1);

    it('should send rgb feature report', function() {
      blink1.readRGB();

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x72, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('should call back with values', function(done) {
      blink1.readRGB(function(val) {
        done();
      });
    });

    it('should call back with correct values', function(done) {
      blink1.readRGB(function(val) {
        val.r.should.eql(R);
        val.g.should.eql(G);
        val.b.should.eql(B);
        done();
      });
    });

    it('should send rgb index feature report', function() {
      blink1.readRGB({ledn:INDEX});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x72, INDEX, 0, 0, 0, 0, INDEX, 0]);
    });

    it('should call back with r, g, b (index)', function(done) {
      blink1.readRGB({ledn:INDEX, callback:function(val) {
        done();
      }});
    });

    it('should call back with correct r, g, b (index)', function(done) {
      blink1.readRGB({ledn:INDEX, callback:function(val) {
        val.r.should.eql(R);
        val.g.should.eql(G);
        val.b.should.eql(B);
        done();
      }});
    });
  });

  describe('#Blink1.enableServerDown', function() {
    var MILLIS = 10;

    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should throw an error when millis is not a number', function() {
      (function(){
        blink1.serverDown({on:1,millis:'Bad millis'});
      }).should.throwError('millis must be a number');
    });

    it('should throw an error when millis is less than 0', function() {
      (function(){
        blink1.serverDown({on:1,millis:-1});
      }).should.throwError('millis must be between 0 and 655350');
    });

    it('should throw an error when millis is greater than 655350', function() {
      (function(){
        blink1.serverDown({on:1,millis:655351});
      }).should.throwError('millis must be between 0 and 655350');
    });

    it('should send serverdown on feature report', function() {
      blink1.serverDown({on:1,millis:MILLIS});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x44, 1, (MILLIS / 10) >> 8, (MILLIS / 10) % 0xff, 0, 0, 0, 0]);
    });

    it('should call back', function(done) {
      blink1.serverDown({on:1,callback:done});
    });
  });

  describe('#Blink1.disableServerDown', function() {
    var MILLIS = 10;

    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should throw an error when millis is not a number', function() {
      (function(){
        blink1.serverDown({on:0,millis:'Bad millis'});
      }).should.throwError('millis must be a number');
    });

    it('should throw an error when millis is less than 0', function() {
      (function(){
        blink1.serverDown({on:0,millis:-1});
      }).should.throwError('millis must be between 0 and 655350');
    });

    it('should throw an error when millis is greater than 655350', function() {
      (function(){
        blink1.serverDown({on:0,millis:655351});
      }).should.throwError('millis must be between 0 and 655350');
    });

    it('should send serverdown off feature report', function() {
      blink1.serverDown();

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x44, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('should call back', function(done) {
      blink1.serverDown(done);
    });
  });

  describe('#Blink1.playLoop', function() {
    var STARTPOSITION = 5;
    var ENDPOSITION = 8;
    var COUNT = 1;

    beforeEach(setupBlink1);
    afterEach(teardownBlink1);


    it('should throw an error when start position is not a number', function() {
      (function(){
        blink1.playLoop({startPosition:'Bad position'});
      }).should.throwError('position must be a number');
    });

    it('should throw an error when end position is not a number', function() {
      (function(){
        blink1.playLoop({endPosition:'Bad position'});
      }).should.throwError('position must be a number');
    });

    it('should throw an error when count is not a number', function() {
      (function(){
        blink1.playLoop({count:'Bad position'});
      }).should.throwError('count must be a number');
    });

    it('should throw an error when instruction bit is not a number', function() {
      (function(){
        blink1.playLoop({play:'Bad position'});
      }).should.throwError('bit must be a number');
    });

    it('should throw an error when start position is less than 0', function() {
      (function(){
        blink1.playLoop({startPosition:-1});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should throw an error when end position is less than 0', function() {
      (function(){
        blink1.playLoop({endPosition:-1});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should throw an error when count is less than 0', function() {
      (function(){
        blink1.playLoop({count:-1});
      }).should.throwError('count must be between 0 and 255');
    });
	
    it('should throw an error when start is more than end', function() {
      (function(){
        blink1.playLoop({startPosition:10,endPosition:9});
      }).should.throwError('startPosition must be less than or equal to endPosition');
    });

    it('should throw an error when instr is less than 0', function() {
      (function(){
        blink1.playLoop({play:-1});
      }).should.throwError('bit must be between 0 and 1');
    });

    it('should throw an error when start position is greater than 31', function() {
      (function(){
        blink1.playLoop({startPosition:32});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should throw an error when end position is greater than 11', function() {
      (function(){
        blink1.playLoop({endPosition:32});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should send play on feature report', function() {
      blink1.playLoop({play:1, startPosition:STARTPOSITION, endPosition:ENDPOSITION, count:COUNT });

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x70, 1, STARTPOSITION, ENDPOSITION, COUNT, 0, 0, 0]);
    });
    it('should send play on feature report despite string args', function() {
      blink1.playLoop({play:1+"", startPosition:STARTPOSITION+"", endPosition:ENDPOSITION+"", count:COUNT+"" });

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x70, 1, STARTPOSITION, ENDPOSITION, COUNT, 0, 0, 0]);
    });
    it('should send pause on feature report', function() {
      blink1.playLoop({play:0, startPosition:STARTPOSITION, endPosition:ENDPOSITION, count:COUNT });

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x70, 0, STARTPOSITION, ENDPOSITION, COUNT, 0, 0, 0]);
    });

    it('should call back', function(done) {
      blink1.playLoop(done);
    });
  });

  describe('#Blink1.play', function() {
    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should send play off feature report', function() {
      blink1.play();

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x70, 1, 0, 0, 0, 0, 0, 0]);
    });

    it('should call back', function(done) {
      blink1.pause(done);
    });
  });

  describe('#Blink1.pause', function() {
    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should send play off feature report', function() {
      blink1.pause();

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x70, 0, 0, 0, 0, 0, 0, 0]);
    });

    it('should call back', function(done) {
      blink1.pause(done);
    });
  });

  describe('#Blink1.writePatternLine', function() {
    var FADE_MILLIS = 10;
    var R = 10;
    var G = 20;
    var B = 40;
    var POSITION = 5;

    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should throw an error when fadeMillis is not a number', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:'notnumber', r:R, g:G, b:B, lineIndex:POSITION});
      }).should.throwError('fadeMillis must be a number');
    });

    it('should throw an error when fadeMillis is less than 0', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:-1, r:R, g:G, b:B, lineIndex:POSITION});      }).should.throwError('fadeMillis must be between 0 and 655350');
    });

    it('should throw an error when fadeMillis is greater than 655350', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:655351, r:R, g:G, b:B, lineIndex:POSITION});
       }).should.throwError('fadeMillis must be between 0 and 655350');
    });

    it('should throw an error when r is not a number', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:'n', g:G, b:B, lineIndex:POSITION});
      }).should.throwError('r must be a number');
    });

    it('should throw an error when r is less than 0', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:-1, g:G, b:B, lineIndex:POSITION});
      }).should.throwError('r must be between 0 and 255');
    });

    it('should throw an error when r is greater than 255', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:256, g:G, b:B, lineIndex:POSITION});
      }).should.throwError('r must be between 0 and 255');
    });

    it('should throw an error when g is not a number', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:'b', b:B, lineIndex:POSITION});
      }).should.throwError('g must be a number');
    });

    it('should throw an error when g is less than 0', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:-1, b:B, lineIndex:POSITION});
		}).should.throwError('g must be between 0 and 255');
    });

    it('should throw an error when g is greater than 255', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:256, b:B, lineIndex:POSITION});
      }).should.throwError('g must be between 0 and 255');
    });

    it('should throw an error when b is not a number', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:G, b:'b', lineIndex:POSITION});
      }).should.throwError('b must be a number');
    });

    it('should throw an error when b is less than 0', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:G, b:-1, lineIndex:POSITION});
      }).should.throwError('b must be between 0 and 255');
    });

    it('should throw an error when b is greater than 255', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:G, b:256, lineIndex:POSITION});
      }).should.throwError('b must be between 0 and 255');
    });

    it('should throw an error when position is not a number', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:G, b:B, lineIndex:' '});
      }).should.throwError('position must be a number');
    });

    it('should throw an error when position is less than 0', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:G, b:B, lineIndex:-1});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should throw an error when position is greater than 11', function() {
      (function(){
        blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:G, b:B, lineIndex:32});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should send writepatternline feature report', function() {
              blink1.writePatternLine({fadeMillis:FADE_MILLIS, r:R, g:G, b:B, lineIndex:POSITION});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x50, R,G,B, (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, POSITION, 0]);
    });
    it('should send writepatternline feature report despite string params', function() {
              blink1.writePatternLine({fadeMillis:FADE_MILLIS+"", r:R+"", g:G+"", b:B+"", lineIndex:POSITION+""});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x50, R,G,B, (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, POSITION, 0]);
    });

    it('should call back', function(done) {
      blink1.writePatternLine({callback: done});
    });
  });

  describe('#Blink1.readPatternLine', function() {
    var POSITION = 5;

    var FADE_MILLIS = 1000;
    var R = 10;
    var G = 20;
    var B = 40;

    beforeEach(function() {
      setupBlink1();

      recvFeatureReport = [FEATURE_REPORT_ID, 0x52, R, G, B, (FADE_MILLIS / 10) >> 8, (FADE_MILLIS / 10) % 0xff, POSITION, 0];
    });
    afterEach(teardownBlink1);

    it('should throw an error when position is not a number', function() {
      (function(){
        blink1.readPatternLine({lineIndex:'Bad position'});
      }).should.throwError('position must be a number');
    });

    it('should throw an error when position is less than 0', function() {
      (function(){
        blink1.readPatternLine({lineIndex:-1});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should throw an error when position is greater than 11', function() {
      (function(){
        blink1.readPatternLine({lineIndex:32});
      }).should.throwError('position must be between 0 and 31');
    });

    it('should send readpatternline feature report', function() {
      blink1.readPatternLine({lineIndex:POSITION});

      sentFeatureReport.should.eql([FEATURE_REPORT_ID, 0x52, 0, 0, 0, 0, 0, POSITION, 0]);
    });

    it('should call back with value', function(done) {
      blink1.readPatternLine(function(value) {
        done();
      });
    });

    it('should call back with correct value', function(done) {

      blink1.readPatternLine({lineIndex:POSITION, callback:function(value) {
        value.r.should.eql(R);
        value.g.should.eql(G);
        value.b.should.eql(B);
        value.fadeMillis.should.eql(FADE_MILLIS);
		value.lineIndex.should.eql(POSITION);

        done();
      }});
    });
  });

  describe('#Blink1.close', function() {
    beforeEach(setupBlink1);
    afterEach(teardownBlink1);

    it('should close HID device', function(done) {
      blink1.close(done);

      closed.should.eql(true);
    });

    it('should callback', function(done) {
      blink1.close(function() {
        closed.should.eql(true);

        done();
      });
    });
  });
});