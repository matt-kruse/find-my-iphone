# find-my-iphone

A Node module to interact with iCloud to do the following:

1. Get the latitude / longitude of an iCloud device
2. Send find my phone alerts
3. Get the distance of a found device.
4. Get the approximate address of a device.
5. Get the approximate driving time to a device.


# Installation

```bash
	npm install find-my-iphone
```

# Summary

This module can alert the find my phone webservice, this also works with family sharing, so you can track family members on the fly. It works by pretending to be a browser and actually logging into the iCloud service.

# Example

Here's a basic example using all the methods

```javascript

	var icloud = require("find-my-iphone").findmyphone;

	icloud.apple_id = "steve@jobs.com";
	icloud.password = "oneMoreThing"; 

	icloud.getDevices(function(error, devices) {
		var device;

		if (error) {
			throw error;
		}
		//pick a device with location and findMyPhone enabled
		devices.forEach(function(d) {
			if (device == undefined && d.location && d.lostModeCapable) {
				device = d;
			}
		});

		if (device) {

			//gets the distance of the device from my location
			var myLatitude = 38.8977;
			var myLongitude = -77.0366;

			icloud.getDistanceOfDevice(device, myLatitude, myLongitude, function(err, result) {
				console.log("Distance: " + result.distance.text);
				console.log("Driving time: " + result.duration.text);
			});

			icloud.alertDevice(device.id, function(err) {
				console.log("Beep Beep!");
			});

			icloud.getLocationOfDevice(device, function(err, location) {
				console.log(location);
			});
		}
	});

```

# Legacy API

```javascript
var find = require('find-my-iphone');

// Alert the first (or only) device on the account
find('user@icloud.com', 'password');

// Alert a specific device
find('user@icloud.com', 'password', 'iPhone 6');

// Callback when successful
find('user@icloud.com', 'password', 'iPhone 6',function() {
	console.log("Done!");
});
```
```javascript
find(email,password[,label[,callback]])
```


 * email (required): The email address you use to login to iCloud
 * password (required): Your iCloud password
 * label (optional): The label of the phone you want to alert (iCloud accounts may have multiple devices). The label can be found under "All Devices" in the Find My iPhone app. If there are multiple phones with the same label, the last one matching will be alerted. You should rename devices to be unique.
 * callback (optional): A function to execute when the phone has been alerted
 
# Tests

`apple_id=someone@gmail.com apple_password=somePassword mocha test`



 
