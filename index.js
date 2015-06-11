var toughCookie = require('tough-cookie');
var request = require('request');

var handle_error = function(res) {
	if (!res||res.statusCode!=200) {
		throw res.statusMessage;
	}
}
var find_my_iphone = function(apple_id,password,device_name,callback) {
	var iRequest = request.defaults({jar: true,headers:{"Origin":"https://www.icloud.com"}});
	iRequest.post({"url":'https://setup.icloud.com/setup/ws/1/login', json: {'apple_id':apple_id,'password':password}},
		function(error,response,body) {
			handle_error(response);
			var url = body.webservices.findme.url;
			iRequest.post({"url":url+"/fmipservice/client/web/initClient",json:{}},
				function(error,response,body) {
					handle_error(response);
					var devices = {}, device, id;
					// If no device is passed, take the first one
					if (!device_name && body.content.length>0) {
						console.log(body.content[0]);
						id = body.content[0].id;
					}
					else {
						// Retrieve each device on the account
						body.content.forEach(function(device) {
							if (device.name==device_name) {
								id = device.id;
							}
						});
					}
					if (id) {
						iRequest.post({"url":url+"/fmipservice/client/web/playSound",json:{"subject":"Find My iPhone Alert","device":id}},
							function(error,response,body) {
								handle_error(response);
								if (callback) {
									callback();
								}
							}
						);
					}
					else {
						throw "Device ["+device_name+"] not found";
					}
				}
			);
		}
	);
};
module.exports = find_my_iphone;
