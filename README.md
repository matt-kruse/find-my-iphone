# find-my-iphone

A Node module to trigger the "Find My iPhone" feature from iCloud, to play a sound on the phone

# Installation

```bash
	npm install find-my-iphone
```

# Summary

This module exports a single function, which can be called to play a sound from the phone.

It works by pretending to be a browser and actually logging into the iCloud service.

# Usage

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

# API

```javascript
find(email,password[,label[,callback]])
```

 * email (required): The email address you use to login to iCloud
 * password (required): Your iCloud password
 * label (optional): The label of the phone you want to alert (iCloud accounts may have multiple devices). The label can be found under "All Devices" in the Find My iPhone app. If there are multiple phones with the same label, the last one matching will be alerted. You should rename devices to be unique.
 * callback (optional): A function to execute when the phone has been alerted

 
