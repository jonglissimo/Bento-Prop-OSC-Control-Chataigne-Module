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
		script.log("OSC Message received "+address+", "+args.length+" arguments");
		var prop = {
			"initialIp": args[0],
			"mac": args[1],
			"type": args[2]
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
		script.log("button press");
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

function setColor(color, propIndex, propType, network) {
	var oscAddress = "/rgb/fill";

	if (propIndex != "") {
		var ip = getPropIP(propIndex);
		if (ip) {
			local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);	
		}
	} else if (propType != "") {
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var type = p.type;

			if (type == propType) {
				var ip = props[i].ip.get();
				local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);
			}
		}
	} else if (network != undefined && network != "") {
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var ip = p.ip.get();
			var ipP = ip.split(".");
			var networkP = network.split(".");

			if (ipP[0] == networkP[0] && ipP[1] == networkP[1] && ipP[2] == networkP[2]) {
				var ip = props[i].ip.get();
				local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);
			}
		}
	} else {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);
		}
	}
}

function findProp(propIndex) {
	if (propIndex != "") {
		setColor([1,1,1], propIndex);
		util.delayThreadMS(200);
		setColor([0,0,0], propIndex);
	} 
}

function setPoint(color, position, size, propIndex, propType) {
	var oscAddress = "/rgb/point";
	
	if (propIndex != "") {
		var ip = getPropIP(propIndex);
		if (ip) {
			local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2], position, size);	
		}
	} else if (propType != "") {
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var type = p.type;

			if (type == propType) {
				var ip = props[i].ip.get();
				local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2], position, size);
			}
		}
	} else {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2], position, size);
		}
	}
}

function restart(propIndex, propType) {
	sendMsg("/root/restart", propIndex, propType);
}

function sleep(propIndex, propType) {
	sendMsg("/root/sleep", propIndex, propType);
}

function setRGBBrightness(brightness, propIndex, propType) {
	sendMsgWithValue("/rgb/brightness", brightness, propIndex, propType);
}

function setIRBrightness(brightness, propIndex, propType) {
	sendMsgWithValue("/ir/brightness", brightness, propIndex, propType);
}

function setRGBTemperature(r, g, b, propIndex, propType) {
	var oscAddress = "/rgb/temperature";

	if (propIndex != "") {
		var ip = getPropIP(propIndex);
		if (ip) {
			local.sendTo(ip, remotePort, oscAddress, r, g, b);	
		}
	} else if (propType != "") {
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var type = p.type;

			if (type == propType) {
				var ip = props[i].ip.get();
				local.sendTo(ip, remotePort, oscAddress, r, g, b);	
			}
		}
	} else {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress, r, g, b);	
		}
	}
}

function playerLoad(name, propIndex, propType, network) {
	sendMsgWithValue("/player/load", name, propIndex, propType, network);
}

function playerPlay(time, propIndex, propType, network) {
	sendMsgWithValue("/player/play", time, propIndex, propType, network);
}

function playerPlayAndIr(time, irBrightness, propIndex, propType) {
	sendMsgWithValue("/player/play", time, propIndex, propType);
	setIRBrightness(irBrightness, propIndex, propType);
}

function playerPause(propIndex, propType) {
	sendMsg("/player/pause", propIndex, propType);
}

function playerResume(propIndex, propType) {
	sendMsg("/player/resume", propIndex, propType);
}

function playerStop(propIndex, propType) {
	sendMsg("/player/stop", propIndex, propType);
}

function playerSeek(time, propIndex, propType) {
	sendMsgWithValue("/player/seek", time, propIndex, propType);
}

function playerId(enable, propIndex, propType, network) {
	sendMsgWithValue("/player/id", enable, propIndex, propType, network);
}

function playerDelete(name, propIndex, propType) {
	sendMsgWithValue("/player/delete", name, propIndex, propType);
}

function imuEnable(enable, propIndex, propType)  {
	script.log("IMU enable: " + propIndex);

	sendMsgWithValue("/imu/enabled", enable, propIndex, propType);
	sendMsgWithValue("/imu/sendLevel", 1, propIndex, propType);

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

function imuUpdateRate(fps, propIndex, propType) {
	sendMsgWithValue("/imu/updateRate", fps, propIndex, propType);
}

function imuCalibrate(propIndex, propType) {
	sendMsgWithValue("/imu/calibrate", 1, propIndex, propType);
}

function genericCommand(oscAddress, value, propIndex, propType) {
	sendMsgWithValue(oscAddress, value, propIndex, propType);
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
		script.log("Broadcast IP: " + broadcastIP);

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

function sendMsg(oscAddress, propIndex, propType) {
	if (propIndex != "") {
		var ip = getPropIP(propIndex);
		if (ip) {
			local.sendTo(ip, remotePort, oscAddress);	
		}
	} else if (propType != "") {
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var type = p.type;

			if (type == propType) {
				var ip = props[i].ip.get();
				local.sendTo(ip, remotePort, oscAddress);
			}
		}
	} else {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress);
		}
	}	
}

function sendMsgWithValue(oscAddress, value, propIndex, propType, network) {
	if (propIndex != undefined && propIndex != "") {
		var ip = getPropIP(propIndex);
		if (ip) {
			local.sendTo(ip, remotePort, oscAddress, value);	
		}
	} else if (propType != undefined && propType != "") {
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var type = p.type;

			if (type == propType) {
				var ip = props[i].ip.get();
				local.sendTo(ip, remotePort, oscAddress, value);
			}
		}
	} else if (network != undefined && network != "") {
		for (var i = 0; i < props.length; i++) {
			var p = props[i];
			var ip = p.ip.get();
			var ipP = ip.split(".");
			var networkP = network.split(".");

			if (ipP[0] == networkP[0] && ipP[1] == networkP[1] && ipP[2] == networkP[2]) {
				var ip = props[i].ip.get();
				local.sendTo(ip, remotePort, oscAddress, value);
			}
		}
	} else {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress, value);
		}
	}	
}

var swapArrayElements = function(arr, indexA, indexB) {
	var temp = arr[indexA];
	arr[indexA] = arr[indexB];
	arr[indexB] = temp;
};