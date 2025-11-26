var valuesContainer = local.parameters;
var propsContainer;
var detectTrigger = local.parameters.addTrigger("Detect Props", "Detect props");
var clearTrigger = local.parameters.addTrigger("Clear Props", "Clear props");
var networkToggle = local.parameters.setup.detectOnAllNetworks;
var lastUpdateTimePing = 0;
var updateRatePing = 1;
var lastUpdateTimeClear = 0;
var updateRateClear = 0.3;
var remotePort = 9000;
var props = [];

function init() {
	clearProps();
	detectProps();

	setReadonly();
	collapseContainers();
	script.setUpdateRate(10);
}

function update() {
	var time = util.getTime();
	
	if(time > lastUpdateTimePing + updateRatePing) {
		lastUpdateTimePing = time;
		ping();
	}

	if(time > lastUpdateTimeClear+updateRateClear) {
		lastUpdateTimeClear = time;
		clearShortPressButtons();
	}
}

function moduleParameterChanged(param) {
	if (param.is(local.outActivity)) return;
	
	if (param.is(detectTrigger)) {
		detectProps();
	} else if (param.is(clearTrigger)) {
		clearProps();
	} else if (param.is(networkToggle)) {
		updateReadOnlyNetwork();
	} else if (param.name == "restart") { 
		var index = getIndexFromContainer(param);
		restart(index);
	} else if (param.name == "sleep") {
		var index = getIndexFromContainer(param);
		sleep(index);
	} else if (param.name == "enableIMU") {
		var index = parseInt(param.getParent().getParent().getParent().name);
		var enable = param.get();
		imuEnable(enable, index);
	}  else if (param.name == "findProp") {
		var index = getIndexFromContainer(param);
		findProp(index);
	} else if (param.name == "calibrate") {
		var index = getIndexFromContainer(param);
		imuCalibrate(index);
	}
}

function moduleValueChanged(param) {
}

function oscEvent(address, args) {
	if (address == "/wassup") {
		// script.log("OSC Message received "+address+", "+args.length+" arguments");
		var prop = {
			"initialIp": args[0],
			"mac": args[1],
			"type": args[2],
			"name": args[3],
			"version": args[4]
		};

		var exists = propExists(prop.mac);
		
		if (!exists) {
			props.push(prop);
			createPropContainer(prop);
		}
		
	} else if (address == "/imu/orientation") {
		var mac = args[0];
		var x = args[1];
		var y = args[2];
		var z = args[3];
		
		prop = getPropFromMac(mac);
		if (prop.xParameter != undefined) prop.xParameter.set(x);
		if (prop.yParameter != undefined) prop.yParameter.set(y);
		if (prop.zParameter != undefined) prop.zParameter.set(z);
		
	} else if (address == "/battery/level") {
		var mac = args[0];
		var level = args[1];
		
		prop = getPropFromMac(mac);
		if (prop.batteryParameter != undefined) prop.batteryParameter.set(level);
		
	} else if (address == "/buttons/shortPress") {
		var mac = args[0];
		prop = getPropFromMac(mac);

		prop.buttonShortPress.set(true);
		// script.log("button press");
	}
}

function detectProps() {
	yo();
}

function clearProps() {
	props = [];
	clearPropsContainer();
}

function clearPropsContainer() {
	valuesContainer.removeContainer("Props");
	propsContainer = valuesContainer.addContainer("Props", "List of props");
}

function createPropContainer(prop) {
	var index = props.length - 1;
	var container = propsContainer.addContainer(index, prop.initialIp);
	container.setCollapsed(false);

	prop.container = container;
	var batteryParameter = container.addFloatParameter("Battery Level", "Battery Level", 0, 0, 1);
	batteryParameter.setAttribute("readonly", true);
	prop.batteryParameter = batteryParameter;
	
	var controlsC = container.addContainer("Controls", "Controls");
	controlsC.setCollapsed(true);
	var ipParameter = controlsC.addStringParameter("IP Address", "IP Address", prop.initialIp);
	prop.ip = ipParameter;
	var typeParameter = controlsC.addStringParameter("Device Type", "Device Type", prop.type);
	typeParameter.setAttribute("readonly", true);

	controlsC.addTrigger("Find Prop", "Find Prop");
	controlsC.addTrigger("Restart", "Restart");
	controlsC.addTrigger("Sleep", "Sleep");
	
	var sensorsC = container.addContainer("Sensors", "Sensors");
	sensorsC.setCollapsed(true);
	var imuC = sensorsC.addContainer("IMU", "IMU");
	imuC.setCollapsed(true);
	var enableImu = imuC.addBoolParameter("Enable IMU", "Enable IMU", false);
	prop.enableImuParameter = enableImu;

	var x = imuC.addFloatParameter("X", "X orientation", 0, -180, 180);
	prop.xParameter = x;
	x.setAttribute("readonly",true);
	
	var y = imuC.addFloatParameter("Y", "Y orientation", 0, -90, 90);
	prop.yParameter = y;
	y.setAttribute("readonly",true);
	
	var z = imuC.addFloatParameter("Z", "Z orientation", 0, -180, 180);
	prop.zParameter = z;
	z.setAttribute("readonly",true);

	imuC.addTrigger("Calibrate", "Calibrate yaw");

	var buttonC = sensorsC.addContainer("Button", "Button");
	buttonC.setCollapsed(true);
	var shortPress = buttonC.addBoolParameter("Short Press", "Short Press", false);
	prop.buttonShortPress = shortPress;
	shortPress.setAttribute("readonly",true);
}



//////////////////
// Command
//////////////////

function setColor(color, propIndex, propType, network, bridgeForward) {
	sendMsg("/rgb/fill", propIndex, propType, network, bridgeForward, color);
}

function findProp(propIndex) {
	if (propIndex != "") {
		setColor([1,1,1], propIndex);
		util.delayThreadMS(200);
		setColor([0,0,0], propIndex);
	} 
}

function setPoint(color, position, size, propIndex, propType, network, bridgeForward) {
	var values = [color[0], color[1], color[2], position, size];
	sendMsg("/rgb/point", propIndex, propType, network, bridgeForward, values);
}

function espnowEnable(enable, propIndex, propType, network, bridgeForward) {
	sendMsg("/comm/espnow/enabled", propIndex, propType, network, bridgeForward, [enable]); 
}

function saveSettings(propIndex, propType, network, bridgeForward) {
	sendMsg("/settings/saveSettings", propIndex, propType, network, bridgeForward);
}

function restart(propIndex, propType, network, bridgeForward) {
	sendMsg("/root/restart", propIndex, propType, network, bridgeForward);
}

function sleep(propIndex, propType, network, bridgeForward) {
	sendMsg("/root/sleep", propIndex, propType, network, bridgeForward);
}

function setRGBBrightness(brightness, propIndex, propType, network, bridgeForward) {
	sendMsg("/rgb/brightness", propIndex, propType, network, bridgeForward, [brightness]);
}

function setIRBrightness(brightness, propIndex, propType, network, bridgeForward) {
	sendMsg("/ir/brightness", propIndex, propType, network, bridgeForward, [brightness]);
}

function setRGBTemperature(r, g, b, propIndex, propType, network, bridgeForward) {
	var values = [r, g, b];
	sendMsg("/rgb/temperature", propIndex, propType, network, bridgeForward, values);
}

function streamLayerEnable(enabled, propIndex, propType, network, bridgeForward) {
	sendMsg("/streamLayer/enabled", propIndex, propType, network, bridgeForward, [enabled]);
}

function playerLayerEnable(enabled, propIndex, propType, network, bridgeForward) {
	sendMsg("/playbackLayer/enabled", propIndex, propType, network, bridgeForward, [enabled]);
}

function playerLoad(name, propIndex, propType, network, bridgeForward) {
	sendMsg("/player/load", propIndex, propType, network, bridgeForward, [name]);
}

function playerPlaySync(name, time, propIndex, propType, network, bridgeForward) {
	sendMsg("/player/playSync", propIndex, propType, network, bridgeForward, [name, time]);
}

function playerPlay(time, propIndex, propType, network, bridgeForward) {
	sendMsg("/player/play", propIndex, propType, network, bridgeForward, [time]);
}

function playerPause(propIndex, propType, network, bridgeForward) {
	sendMsg("/player/pause", propIndex, propType, network, bridgeForward);
}

function playerResume(propIndex, propType, network, bridgeForward) {
	sendMsg("/player/resume", propIndex, propType, network, bridgeForward);
}

function playerStop(propIndex, propType, network, bridgeForward) {
	sendMsg("/player/stop", propIndex, propType, network, bridgeForward);
}

function playerSeek(time, propIndex, propType, network, bridgeForward) {
	sendMsg("/player/seek", propIndex, propType, network, bridgeForward, [time]);
}

function playerId(enable, propIndex, propType, network, bridgeForward) {
	sendMsg("/player/id", propIndex, propType, network, bridgeForward, [enable]);
}

function playerDeleteV1(name, propIndex, propType, network, bridgeForward) {
	sendMsg("/player/delete", propIndex, propType, network, bridgeForward, [name]);
}

function filesDelete(folder, propIndex, propType, network, bridgeForward) {
	sendMsg("/files/delete", propIndex, propType, network, bridgeForward, [folder]);
}

function imuEnable(enable, propIndex, propType, network, bridgeForward)  {
	sendMsg("/imu/enabled", enable, propIndex, propType, network, bridgeForward, [enable]);
	sendMsg("/imu/sendLevel", 1, propIndex, propType, network, bridgeForward, [1]);

	if (propIndex != "") {
		var prop = props[parseInt(propIndex)];
		prop.enableImuParameter.set(enable);
	} else {
		for (var i = 0; i < props.length; i++) {
			var prop = props[i];
			prop.enableImuParameter.set(enable);
		}
	}	
}

function imuUpdateRate(fps, propIndex, propType, network, bridgeForward) {
	sendMsg("/imu/updateRate", propIndex, propType, network, bridgeForward, [fps]);
}

function imuCalibrate(propIndex, propType, network, bridgeForward) {
	sendMsg("/imu/calibrate", propIndex, propType, network, bridgeForward, [1]);
}

function batteryShow(enabled, propIndex, propType, network, bridgeForward) {
	sendMsg("/battery/show", propIndex, propType, network, bridgeForward, [enabled]);
}

function genericCommand(oscAddress, value, propIndex, propType, network, bridgeForward) {
	send(oscAddress, propIndex, propType, network, bridgeForward, [value]);
}

function yo() {
	var ips;

	if (networkToggle.get()) {
		ips = util.getIPs();
	} else {
		ips = [local.parameters.setup.detectOnThisNetworkOnly.get()];
	}
	
	for (var i = 0; i < ips.length; i++) {
		var ip = ips[i];
		var broadcastIP = getBroadcastIP(ip);
		// script.log("Broadcast IP: " + broadcastIP);

		local.sendTo(broadcastIP, remotePort, "/yo", ip);
	}
}

function ping() {
	sendMsg("/ping", "", "");
}

function logProps() {
	script.log("Logging Props");

	for (var i = 0; i < props.length; i++) {
		var cur = props[i];
		script.log("Prop " + i + ": " + cur.ip.get() + ", " + cur.mac + ", " + cur.name);
	}
}




///////////////////////
// Helper
///////////////////////

function setReadonly() {
	local.parameters.oscInput.localPort.setAttribute("readonly", true);
	var oscOutput = local.parameters.oscOutputs.oscOutput;
	
	if (oscOutput) {
		oscOutput.local.setAttribute("readonly", true);
		oscOutput.remoteHost.setAttribute("readonly", true);
		oscOutput.remotePort.setAttribute("readonly", true);
	}

	updateReadOnlyNetwork();
}

function updateReadOnlyNetwork() {
	local.parameters.setup.detectOnThisNetworkOnly.setAttribute("readonly", networkToggle.get());
}

function collapseContainers() {
	local.parameters.oscInput.setCollapsed(true);
	local.parameters.oscOutputs.setCollapsed(true);
	local.scripts.bento_osc.setCollapsed(true);
}

function getIndexFromContainer(param) {
	parentName = param.getParent().getParent().name;
	return parseInt(parentName);
}

function getBroadcastIP (ip) {
	digits = ip.split(".");
	return digits[0] + "." + digits[1] + "." + digits[2] + ".255";
}

function getPropIP(index) {
	index = parseInt(index);
	return props[index].ip.get();
}

function getProp(index) {
	index = parseInt(index);
	return props[index];
}

function getPropFromMac (mac) {
	for (var i = 0; i < props.length; i++) {
		var cur = props[i];
		
		if (cur.mac == mac) return cur;
	}
	
	return null;
}

function propExists(mac) {
	return (getPropFromMac(mac) ==  null) ? false : true;
}

function clearShortPressButtons() {
	for (var i = 0; i < props.length; i++) {
		var cur = props[i];
		cur.buttonShortPress.set(false);
	}
}

function getPropsToSend(propIndex, propType, network) {
	var propsToSend = [];

	if (propIndex != "") { // send to specific prop with index provided
		var prop = getProp(propIndex);
		if (prop) propsToSend.push(prop);
	} else if (propType != "") { // send to specific prop type
		for (var i = 0; i < props.length; i++) {
			var prop = props[i];

			if (prop.type == propType) {
				propsToSend.push(prop);
			}
		}
	} else if (network != undefined && network != "") { // send to props from specific network adapter (matching first 4 IP segments)
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var ip = p.ip.get();
			var ipP = ip.split(".");
			var networkP = network.split(".");

			if (ipP[0] == networkP[0] && ipP[1] == networkP[1] && ipP[2] == networkP[2]) {
				propsToSend.push(p);
			}
		}
	} else { // send to all props
		for (var i = 0; i < props.length; i++) {
			var prop = props[i];
			propsToSend.push(prop);
		}
	}
	
	return propsToSend;
}

function getRealOscAddress(oscAddress, prop, bridgeForward) {
	var bridgeForwardPrefix = "/dev/-1";

	if (prop.version == undefined || prop.version == "") { // assume it's a bentoflow firmware prop
		var address = oscAddressVersioning[oscAddress].bentoflow;

		if (bridgeForward) {
			return bridgeForwardPrefix + address;
		} else {
			return address;
		}
	} else { // assume it's a blip firmware prop
		var address = oscAddressVersioning[oscAddress].blip;

		if (bridgeForward) {
			return bridgeForwardPrefix + address
		} else {
			return address;
		}
	}
}

function sendMsg(oscAddress, propIndex, propType, network, bridgeForward, values) {
	var propsToSend = getPropsToSend(propIndex, propType, network);

	for (var i=0; i < propsToSend.length; i++) {
		var prop = propsToSend[i];
		var ip = prop.ip.get();
		var realOscAddress = getRealOscAddress(oscAddress, prop, bridgeForward);

		if (ip && realOscAddress != undefined && realOscAddress != "") {
			if (values == undefined) {
				local.sendTo(ip, remotePort, realOscAddress);	
			} else {
				if (values.length == 1) {
					local.sendTo(ip, remotePort, realOscAddress, values[0]);	
				} else if (values.length == 2) {
					local.sendTo(ip, remotePort, realOscAddress, values[0], values[1]);
				} else if (values.length == 3) {
					local.sendTo(ip, remotePort, realOscAddress, values[0], values[1], values[2]);
				} else if (values.length == 4) {
					local.sendTo(ip, remotePort, realOscAddress, values[0], values[1], values[2], values[3]);
				} else if (values.length == 5) {
					local.sendTo(ip, remotePort, realOscAddress, values[0], values[1], values[2], values[3], values[4]);
				} else if (values.length == 6) {
					local.sendTo(ip, remotePort, realOscAddress, values[0], values[1], values[2], values[3], values[4], values[5]);
				}
			}
		}
	}
}

var swapArrayElements = function(arr, indexA, indexB) {
	var temp = arr[indexA];
	arr[indexA] = arr[indexB];
	arr[indexB] = temp;
};

var oscAddressVersioning = {
	"/ping": {
		"bentoflow": "/ping",
		"blip": "/ping"
	},
	"/yo": {
		"bentoflow": "/yo",
		"blip": "/yo"
	}, 
	"/root/restart": {
		"bentoflow": "/root/restart",
		"blip": "/root/restart"
	},
	"/root/sleep": {
		"bentoflow": "/root/sleep",
		"blip": "/root/shutdown"
	},
	"/player/load": {
		"bentoflow": "/player/load",
		"blip": "/leds/strip1/playbackLayer/load"
	},
	"/player/play": {
		"bentoflow": "/player/play",
		"blip": "/leds/strip1/playbackLayer/play"
	},
	"/player/pause": {
		"bentoflow": "/player/pause",
		"blip": "/leds/strip1/playbackLayer/pause"
	},
	"/player/resume": {
		"bentoflow": "/player/resume",
		"blip": "/leds/strip1/playbackLayer/resume"
	},
	"/player/playSync": {
		"bentoflow": "",
		"blip": "/leds/strip1/playbackLayer/playSync"
	},
	"/player/stop": {
		"bentoflow": "/player/stop",
		"blip": "/leds/strip1/playbackLayer/stop"
	},
	"/player/seek": {
		"bentoflow": "/player/seek",
		"blip": "/leds/strip1/playbackLayer/seek"
	},
	"/player/id": {
		"bentoflow": "/player/id",
		"blip": "/leds/strip1/playbackLayer/idMode"
	},
	"/playbackLayer/enabled": {
		"bentoflow": "",
		"blip": "/leds/strip1/playbackLayer/enabled"
	},
	"/streamLayer/enabled": {
		"bentoflow": "",
		"blip": "/leds/strip1/streamLayer/enabled"
	},
	"/player/delete": {
		"bentoflow": "/player/delete",
		"blip": "/files/deleteFolder"
	},
	"/files/delete": {
		"bentoflow": "",
		"blip": "/files/deleteFolder"
	},
	"/rgb/fill": {
		"bentoflow": "/rgb/fill",
		"blip": ""
	},
	"/rgb/point": {
		"bentoflow": "/rgb/point",
		"blip": ""
	},
	"/rgb/brightness": {
		"bentoflow": "/rgb/brightness",
		"blip": "/leds/strip1/brightness"
	},
	"/rgb/temperature": {
		"bentoflow": "/rgb/temperature",
		"blip": ""
	},
	"/ir/brightness": {
		"bentoflow": "/ir/brightness",
		"blip": "/ir/value"
	},
	"/imu/enabled": {
		"bentoflow": "/imu/enabled",
		"blip": "/motion/enabled"
	},
	"/imu/sendLevel": {
		"bentoflow": "/imu/sendLevel",
		"blip": "/motion/sendLevel"
	},
	"/imu/updateRate": {
		"bentoflow": "/imu/updateRate",
		"blip": "/motion/orientationSendRate"
	},
	"/imu/calibrate": {
		"bentoflow": "/imu/calibrate",
		"blip": ""
	},
	"/battery/show": {
		"bentoflow": "",
		"blip": "/leds/strip1/systemLayer/showBattery"
	},
	"/comm/espnow/enabled": {
		"bentoflow": "",
		"blip": "/comm/espnow/enabled"
	},
	"/settings/saveSettings": {
		"bentoflow": "",
		"blip": "/settings/saveSettings"
	}
};