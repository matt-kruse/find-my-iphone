# Summary

This is a fork of the work created by Matt Kruse: https://github.com/matt-kruse/find-my-iphone
I just added some convenience methods, so I can use this for more than just alerts.
Since I use family sharing, I can use this to locate my wife and kids on the fly.

# this fork

1. Get the latitude / longitude of a device
2. Send find my phone alerts
3. Get the distance of a found device.
4. Get the approximate address of a device.

# Installation

```bash
	npm install git+https://git@github.com/jlippold/find-my-phone.git
```

# Run Tests

`apple_id=someone@gmail.com apple_password=somePassword mocha test`

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
			var myLatitude = 51.525;
			var myLongitude = 7.4575;

			icloud.getDistanceOfDevice(device, myLatitude, myLongitude, function(err, miles) {
				console.log(device.name + " is " + miles + " miles away!");
			});

			icloud.alertDevice(device.id, function(err) {
				console.log("Beep Beep!");
			});

			icloud.getLocationOfDevice(device, function(err, location) {

				var msg = [location.streetNumber,
					location.streetName,
					"in",
					location.city,
					location.state
				].join(" ");

				console.log(msg);
			});
		}
	});

```

 
