var toughCookie = require("tough-cookie");
var request = require("request");
var geolib = require("geolib");
var geocoder = require('node-geocoder')('openstreetmap', 'https');

var findmyphone = {
	login: function(callback) {

		findmyphone.iRequest = request.defaults({
			jar: true,
			headers: {
				"Origin": "https://www.icloud.com"
			}
		});

		if (findmyphone.apple_id == null || findmyphone.password == null) {
			callback("Please define user / password");
		}

		var options = {
			url: "https://setup.icloud.com/setup/ws/1/login",
			json: {
				"apple_id": findmyphone.apple_id,
				"password": findmyphone.password
			}
		};

		findmyphone.iRequest.post(options, function(error, response, body) {

			if (!response || response.statusCode != 200) {
				return callback(error);
			}
			findmyphone.base_path = body.webservices.findme.url;
			options = {
				url: findmyphone.base_path + "/fmipservice/client/web/initClient",
				json: {
					"clientContext": {
						"appName": "iCloud Find (Web)",
						"appVersion": "2.0",
						"timezone": "US/Eastern",
						"inactiveTime": 3571,
						"apiVersion": "3.0",
						"fmly": true
					}
				}
			};
			findmyphone.iRequest.post(options, callback);
		});
	},
	alertDevice: function(deviceId, callback) {

		var options = {
			url: findmyphone.base_path + "/fmipservice/client/web/playSound",
			json: {
				"subject": "Find My iPhone Alert",
				"device": deviceId
			}
		};
		findmyphone.iRequest.post(options, callback);
	},
	getLocationOfDevice: function(device, callback) {

		if (!device.location) {
			return callback("No location in device");
		}

		geocoder.reverse({
			lat: device.location.latitude,
			lon: device.location.longitude
		}, function(err, res) {
			if (res.length == 0 || err) {
				return callback(err);
			}
			return callback(err, res[0]);
		});

	},
	getDistanceOfDevice: function(device, myLatitude, myLongitude, callback) {
		if (device.location) {
			var meters = geolib.getDistance({
				latitude: myLatitude,
				longitude: myLongitude
			}, {
				latitude: device.location.latitude,
				longitude: device.location.longitude
			});

			callback(null, geolib.convertUnit("mi", meters, 0));
		} else {
			callback("No location found for this device");
		}
	},
	getDevices: function(callback) {

		findmyphone.login(function(error, response, body) {

			if (!response || response.statusCode != 200) {
				return callback(error);
			}

			var devices = [];
			// Retrieve each device on the account
			body.content.forEach(function(device) {
				devices.push({
					id: device.id,
					name: device.name,
					deviceModel: device.deviceModel,
					modelDisplayName: device.modelDisplayName,
					deviceDisplayName: device.deviceDisplayName,
					batteryLevel: device.batteryLevel,
					isLocating: device.isLocating,
					lostModeCapable: device.lostModeCapable,
					location: device.location
				});
			});

			callback(error, devices);
		});
	}
};

exports.findmyphone = findmyphone;