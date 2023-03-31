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
			"name": args[2]
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

	var buttonC = sensorsC.addContainer("Button", "Button");
	buttonC.setCollapsed(true);
	var shortPress = buttonC.addBoolParameter("Short Press", "Short Press", false);
	prop.buttonShortPress = shortPress;
	shortPress.setAttribute("readonly",true);
}



//////////////////
// Command
//////////////////

function setColor(color, propIndex) {
	var oscAddress = "/rgb/fill";

	if (propIndex == "") {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);
		}
	} else {
		var ip = getPropIP(propIndex);
		if (ip) {
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

function setPoint(color, position, size, propIndex) {
	var oscAddress = "/rgb/point";
	
	if (propIndex == "") {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2], position, size);
		}
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2], position, size);
	}
}

function restart(propIndex) {
	sendMsg(propIndex, "/root/restart");
}

function sleep(propIndex) {
	sendMsg(propIndex, "/root/sleep");
}

function setRGBBrightness(brightness, propIndex) {
	sendMsgWithValue(propIndex, "/rgb/brightness", brightness);
}

function setIRBrightness(brightness, propIndex) {
	sendMsgWithValue(propIndex, "/ir/brightness", brightness);
}

function playerLoad(name, propIndex) {
	sendMsgWithValue(propIndex, "/player/load", name);
}

function playerPlay(time, propIndex) {
	sendMsgWithValue(propIndex, "/player/play", time);
}

function playerPlayAndIr(time, irBrightness, propIndex) {
	sendMsgWithValue(propIndex, "/player/play", time);
	setIRBrightness(irBrightness, propIndex);
}

function playerPause(propIndex) {
	sendMsg(propIndex, "/player/pause");
}

function playerResume(propIndex) {
	sendMsg(propIndex, "/player/resume");
}

function playerStop(propIndex) {
	sendMsg(propIndex, "/player/stop");
}

function playerSeek(time, propIndex) {
	sendMsgWithValue(propIndex, "/player/seek", time);
}

function playerId(enable, propIndex) {
	sendMsgWithValue(propIndex, "/player/id", enable);
}

function playerDelete(name, propIndex) {
	sendMsgWithValue(propIndex, "/player/delete", name);
}

function imuEnable(enable, propIndex)  {
	script.log("IMU enable: " + propIndex);

	sendMsgWithValue(propIndex, "/imu/enabled", enable);
	sendMsgWithValue(propIndex, "/imu/sendLevel", 1);

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

function imuUpdateRate(fps, propIndex) {
	sendMsgWithValue(propIndex, "/imu/updateRate", fps);
}

function imuCalibrate(propIndex) {
	sendMsgWithValue(propIndex, "/imu/calibrate", 1);
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
	sendMsg("", "/ping");
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

function sendMsg(propIndex, oscAddress) {
	if (propIndex == "") {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress);
		}
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress);	
	}
}

function sendMsgWithValue(propIndex, oscAddress, value) {
	if (propIndex == "") {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip.get();
			local.sendTo(ip, remotePort, oscAddress, value);
		}
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress, value);	
	}
}

var swapArrayElements = function(arr, indexA, indexB) {
	var temp = arr[indexA];
	arr[indexA] = arr[indexB];
	arr[indexB] = temp;
};