var request = require("request");
var util = require("util");
var FileCookieStore = require("tough-cookie-file-store");
var fs = require("fs");
var async = require("async");

var findmyphone = {
	idmsaLoginUrl: null,
	idmsaWidgetKey: null,
	loginUrl: null,
	useIdmsa: true,
	init: function(callback, replaceOnLogin) {
		async.series({
			checkLoginParams: function(next) {
				if (((!findmyphone.hasOwnProperty("apple_id") || findmyphone.apple_id == null) ||
					(!findmyphone.hasOwnProperty("password") || findmyphone.password == null)) &&
					((!findmyphone.hasOwnProperty("dsWebAuthToken") || findmyphone.dsWebAuthToken == null) ||
					(!findmyphone.hasOwnProperty("trustToken") || findmyphone.trustToken == null))) {
					return next("Please define apple_id / password or dsWebAuthToken / trustToken");
				}

				if (findmyphone.cookieFileStore) {
					var path = findmyphone.cookieFileStore;
					fs.exists(path, function(exists) {
						if (!exists) {
							fs.open(path, 'w', function(err) {
								return next(err);
							});
						} else {
							return next();
						}
					});
				} else {
					return next();
				}
			},
			cookie: function(next) {
				if (findmyphone.cookieFileStore) {
					var CookieJar = require("tough-cookie").CookieJar;
					var Store = new FileCookieStore(findmyphone.cookieFileStore);
					var j = new CookieJar(Store);
					findmyphone.jar = request.jar(Store);
				} else {
					findmyphone.jar = request.jar();
				}
				return next();
			},
			defaults: function(next) {
				findmyphone.iRequest = request.defaults({
					jar: findmyphone.jar,
					headers: {
						"Origin": "https://www.icloud.com",
						//"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.113 Safari/537.36"
						"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36"
					}
				});

				return next();
			}
		}, function(err) {
			if (err) {
				return callback(err);
			}

			findmyphone.setCookie(function() {
				findmyphone.checkSession(function(err, res, body) {
					if (err || res.statusCode !== 200 || !body) {
						findmyphone.login(function(err, res, body) {
							return callback(err, res, body);
						}, replaceOnLogin);
					} else {
						return callback(err, res, body);
					}
				}, replaceOnLogin);
			});
		});

	},
	setCookie: function(callback) {
		findmyphone.jar = null;
		if (findmyphone.cookieFileStore) {
			var j = request.jar(new FileCookieStore(findmyphone.cookieFileStore));
			findmyphone.jar = request.jar({
				jar: j
			});
		} else {
			findmyphone.jar = request.jar();
		}
		callback();
	},
	login: function(callback, replaceOnLogin) {
		var options
		
		if (findmyphone.useIdmsa) {
			if (findmyphone.hasOwnProperty("verifyCode") && findmyphone.verifyCode != null) {
				options = {
					url: "https://idmsa.apple.com/appleauth/auth/verify/trusteddevice/securitycode",
					json: {
						"securityCode": {
							"code": findmyphone.verifyCode
						}
					},
					headers: {
						"Origin": "https://idmsa.apple.com",
						"Referer": findmyphone.idmsaLoginUrl,
						"X-Apple-Widget-Key": findmyphone.idmsaWidgetKey,
						"X-Apple-ID-Session-Id": findmyphone.sessionId,
						"scnt": findmyphone.scnt
					}
				};

				findmyphone.iRequest.post(options, function(error, response, body) {
					if (!response || (response.statusCode != 200 && response.statusCode != 204)) {
						return callback("Verify Error");
					}

					options = {
						url: "https://idmsa.apple.com/appleauth/auth/2sv/trust",
						json: {
							"securityCode": {
								"code": findmyphone.verifyCode
							}
						},
						headers: {
							"Origin": "https://idmsa.apple.com",
							"Referer": findmyphone.idmsaLoginUrl,
							"X-Apple-Widget-Key": findmyphone.idmsaWidgetKey,
							"X-Apple-ID-Session-Id": findmyphone.sessionId,
							"scnt": findmyphone.scnt
						}
					};

					findmyphone.iRequest.get(options, function(error, response, body) {
						if (!response || (response.statusCode != 200 && response.statusCode != 204)) {
							return callback("Trust Error");
						}

						findmyphone.dsWebAuthToken  = response.headers["x-apple-session-token"];
						findmyphone.trustToken  = response.headers["x-apple-twosv-trust-token"];

						options = {
							url: "https://setup.icloud.com/setup/ws/1/accountLogin",
							json: {
								"dsWebAuthToken": findmyphone.dsWebAuthToken,
								"trustToken": findmyphone.trustToken,
								"extended_login": true
							}
						}

						findmyphone.iRequest.post(options, function(error, response, body) {
							if (!response || response.statusCode != 200) {
								return callback("Account Login Error");
							}
							console.log(response);
							return callback("Now you can remove Session Token and scnt");
						});
					});
				});
			} else {
				options = {
					url: "https://idmsa.apple.com/appleauth/auth/signin",
					json: {
						"accountName": findmyphone.apple_id,
						"password": findmyphone.password,
						"rememberMe": true,
						"trustTokens": []
					},
					headers: {
						"Origin": "https://idmsa.apple.com",
						"Referer": findmyphone.idmsaLoginUrl,
						"X-Apple-Widget-Key": findmyphone.idmsaWidgetKey
					}
				}

				if (findmyphone.hasOwnProperty("trustToken") && findmyphone.trustToken != null) {
					options.json.trustTokens = [findmyphone.trustToken]
				}

				if (findmyphone.hasOwnProperty("trustTokens") && findmyphone.trustTokens != null) {
					options.json.trustTokens = findmyphone.trustTokens
				}

				findmyphone.iRequest.post(options, function(error, response, body) {
					if (response && response.statusCode == 409) {
						findmyphone.dsWebAuthToken  = response.headers["x-apple-session-token"];
						findmyphone.sessionId = response.headers["x-apple-id-session-id"];
						findmyphone.scnt = response.headers["scnt"];

						options = {
							url: "https://idmsa.apple.com/appleauth/auth",
							headers: {
								"Origin": "https://idmsa.apple.com",
								"Referer": findmyphone.idmsaLoginUrl,
								"X-Apple-Widget-Key": findmyphone.idmsaWidgetKey,
								"X-Apple-ID-Session-Id": findmyphone.sessionId,
								"scnt": findmyphone.scnt
							}
						};
						
						findmyphone.iRequest.get(options, function(error, response, body) {
							if (!response || (response.statusCode != 200)) {
								return callback("Auth Error");
							}

							return callback("Insert Verifier with Session Token " + findmyphone.sessionId + " and scnt " + findmyphone.scnt);
						});
					} else {
						if (!response || response.statusCode != 200) {
							return callback("Login Error");
						}

						findmyphone.dsWebAuthToken  = response.headers["x-apple-session-token"];
						
						options = {
							url: "https://setup.icloud.com/setup/ws/1/accountLogin",
							json: {
								"dsWebAuthToken": findmyphone.dsWebAuthToken,
								"extended_login": true
							}
						}

						findmyphone.iRequest.post(options, function(error, response, body) {
							if (!response || response.statusCode != 200) {
								return callback("Account Login Error");
							}

							if (replaceOnLogin === undefined) {
								if ( typeof(body) === "string"){
									body = JSON.parse(body)
								}

								findmyphone.onLogin(body, function(err, resp, body) {
									return callback(err, resp, body);
								});
							}else{
								return callback(error, response, body);
							}
						});
					}
				});
			}
		}else{
			if (findmyphone.hasOwnProperty("dsWebAuthToken") && findmyphone.dsWebAuthToken != null &&
				findmyphone.hasOwnProperty("trustToken") && findmyphone.trustToken != null) {
				options = {
					url: "https://setup.icloud.com/setup/ws/1/login",
					json: {
						"dsWebAuthToken": findmyphone.dsWebAuthToken,
						"trustToken": findmyphone.trustToken,
						"extended_login": true
					}
				};
			}else{
				options = {
					url: "https://setup.icloud.com/setup/ws/1/login",
					json: {
						"apple_id": findmyphone.apple_id,
						"password": findmyphone.password,
						"extended_login": true
					}
				};

				if (findmyphone.hasOwnProperty("trustToken") && findmyphone.trustToken != null) {
					options.json.trustTokens = [findmyphone.trustToken]
				}

				if (findmyphone.hasOwnProperty("trustTokens") && findmyphone.trustTokens != null) {
					options.json.trustTokens = findmyphone.trustTokens
				}
			}

			findmyphone.iRequest.post(options, function(error, response, body) {
				
				if (!response || response.statusCode != 200) {
					return callback("Login Error");
				}

				if (replaceOnLogin === undefined) {
					if ( typeof(body) === "string"){
						body = JSON.parse(body)
					}

					findmyphone.onLogin(body, function(err, resp, body) {
						return callback(err, resp, body);
					});
				}else{
					return callback(error, response, body);
				}
			});
		}
	},
	checkSession: function(callback, replaceOnLogin) {
		var options = {
			url: "https://setup.icloud.com/setup/ws/1/validate",
		};
		
		findmyphone.iRequest.post(options, function(error, response, body) {
			
			if (body && typeof(body) === "string"){
				body = JSON.parse(body)
			}
			
			if (body.hasOwnProperty("trustTokens")){
				findmyphone.trustTokens = body.trustTokens;
			}
			findmyphone.idmsaLoginUrl = body.configBag.urls.accountLoginUI;

			if(findmyphone.idmsaLoginUrl != null){
				var url = findmyphone.idmsaLoginUrl.split('?');
				var qstr = url[1];

				var query = {};
				var a = (qstr[0] === '?' ? qstr.substr(1) : qstr).split('&');
				for (var i = 0; i < a.length; i++) {
					var b = a[i].split('=');
					query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
				}

				findmyphone.idmsaWidgetKey = query.widgetKey;
			}

			findmyphone.loginUrl = body.configBag.urls.accountLogin;
			

			if (!response || response.statusCode != 200) {
				return callback("Could not refresh session");
			}

			if (replaceOnLogin === undefined) {
				if ( typeof(body) === "string"){
					body = JSON.parse(body)
				}

				findmyphone.onLogin(body, function(err, resp, body) {
					return callback(err, resp, body);
				});
			}else{
				return callback(error, response, body);
			}
		});
	},
	onLogin: function(body, callback) {
		console.log(body);
		if (body.hasOwnProperty("webservices") && body.webservices.hasOwnProperty("findme")) {
			findmyphone.base_path = body.webservices.findme.url; //.replace(":443", "");

			options = {
				url: findmyphone.base_path + "/fmipservice/client/web/initClient",
				json: {
					"clientContext": {
						"appName": "iCloud Find (Web)",
						"appVersion": "2.0",
						"timezone": "US/Pacific",
						"inactiveTime": 3571,
						"apiVersion": "3.0",
						"fmly": true
					}
				}
			};

			findmyphone.iRequest.post(options, callback);
		} else {
			return callback("cannot parse webservice findme url");
		}
	},
	refreshDevice: function(deviceId, callback) {
		var options = {
			url: findmyphone.base_path + "/fmipservice/client/web/refreshClient",
			json: {
				"clientContext": {
					"appName": "iCloud Find (Web)",
					"appVersion": "2.0",
					"timezone": "US/Pacific",
					"inactiveTime": 60,
					"apiVersion": "3.0",
					"selectedDevice": deviceId,
					"shouldLocate":true,
					"fmly": true
				}
			}
		};

		var fnc = function(error, response, body) {

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
		}

		if (findmyphone.iRequest === undefined) {
			findmyphone.init(function(error, response, body) {
				if (!response || response.statusCode != 200) {
					return callback(error);
				}

				if ( typeof(body) === "string"){
					body = JSON.parse(body)
				}
				
				if (body.hasOwnProperty("webservices") && body.webservices.hasOwnProperty("findme")) {
					findmyphone.base_path = body.webservices.findme.url;

					options.url = findmyphone.base_path + "/fmipservice/client/web/refreshClient",
					findmyphone.iRequest.post(options, fnc);
				} else {
					return callback("cannot parse webservice findme url");
				}
			}, "true");
		}else{
			findmyphone.iRequest.post(options, fnc);
		}
	},
	getDevices: function(callback) {

		findmyphone.init(function(error, response, body) {

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

		var googleUrl = "https://maps.googleapis.com/maps/api/geocode/json" +
			"?latlng=%d,%d&sensor=true";

		if (process.env.Google_Maps_API_Key) {
			googleUrl += "&key=" + process.env.Google_Maps_API_Key
		}

		googleUrl =
			util.format(googleUrl,
				device.location.latitude, device.location.longitude);

		var req = {
			url: googleUrl,
			json: true
		};

		request(req, function(err, response, json) {
			if (!err && response.statusCode == 200) {
				if (Array.isArray(json.results) &&
					json.results.length > 0 &&
					json.results[0].hasOwnProperty("formatted_address")) {

					return callback(err, json.results[0].formatted_address);
				}
			}
			return callback(err);
		});
	},
	getDistanceOfDevice: function(device, myLatitude, myLongitude, callback) {
		if (device.location) {

			var googleUrl = "https://maps.googleapis.com/maps/api/distancematrix/json" +
				"?origins=%d,%d&destinations=%d,%d&mode=driving&sensor=false";

			if (process.env.Google_Maps_API_Key) {
				googleUrl += "&key=" + process.env.Google_Maps_API_Key
			}   
					
			googleUrl =
				util.format(googleUrl, myLatitude, myLongitude,
					device.location.latitude, device.location.longitude);

			var req = {
				url: googleUrl,
				json: true
			};

			request(req, function(err, response, json) {
				if (!err && response.statusCode == 200) {
					if (json && json.rows && json.rows.length > 0) {
						return callback(err, json.rows[0].elements[0]);
					}
					return callback(err);
				}
			});

		} else {
			callback("No location found for this device");
		}
	}
};

// legacy
var find_my_iphone = function(apple_id, password, device_name, callback) {

	findmyphone.apple_id = apple_id;
	findmyphone.password = password;

	findmyphone.getDevices(function(error, devices) {
		if (error) {
			throw error;
		}

		var device;
		if (devices.length > 0) {
			if (device_name) {
				devices.forEach(function(d) {
					if (device_name) {
						if (device_name == d.name && d.lostModeCapable) {
							device = d;
						}
					} else {
						if (!device && d.lostModeCapable) {
							device = d;
						}
					}
				});
			}
		}

		if (device) {
			findmyphone.alertDevice(device.id, function(err) {
				if (err) {
					throw err;
				}
				if (callback) {
					callback(err);
				}
			});
		} else {
			throw "Device [" + device_name + "] not found";
		}
	});
};


find_my_iphone.findmyphone = findmyphone;
module.exports = find_my_iphone;
