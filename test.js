var icloud = require("./index").findmyphone;
var assert = require("assert");

//apple_id=someone@gmail.com apple_password=somePassword mocha test


describe('Logging in', function() {
	var device;

	before(function(done) {
		this.timeout(30000);

		if (!process.env.hasOwnProperty("apple_id")) {
			console.error("Missing apple_id environmental variable");
		}
		if (!process.env.hasOwnProperty("apple_password")) {
			console.error("Missing apple_password environmental variable");
		}

		icloud.apple_id = process.env.apple_id;
		icloud.password = process.env.apple_password;

		assert(icloud.apple_id);
		assert(icloud.password);

		icloud.getDevices(function(error, devices) {
			assert(!error);
			assert(devices.length > 0);
			devices.forEach(function(d) {
				if (device == undefined && d.location && d.lostModeCapable) {
					console.log(d);
					device = d;
				}
			});
			assert(device);
			done();
		});
	});

	it('should get distance in miles', function(done) {
		icloud.getDistanceOfDevice(device, 51.525, 7.4575, function(err, miles) {
			assert(miles > 0);
			console.log(miles + " miles");
			done();
		});
	});

	it('should send alert', function(done) {
		this.timeout(30000);
		icloud.alertDevice(device.id, function(error) {
			assert(!error);
			done();
		});
	});

	it('should get location', function(done) {
		this.timeout(30000);
		icloud.getLocationOfDevice(device, function(error, location) {
			assert(!error);
			assert(location);
			done();
		});
	});

	
	describe('should alert with legacy api', function() {
		this.timeout(30000);
		var find = require('./index');
		it('should send legacy alert', function(done) {
			find(icloud.apple_id, icloud.password, null, function(error) {
				assert(!error);
				done();
			});
		});
	});
	
});