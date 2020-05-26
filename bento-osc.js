var valuesContainer = local.values;
var propsContainer;
var detectTrigger = local.parameters.addTrigger("Detect Props", "Detect props");
var clearTrigger = local.parameters.addTrigger("Clear Props", "Clear props");
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
	} 
}

function moduleValueChanged(param) {
	if (param.name == "restart") { 
		var index = getIndexFromContainer(param);
		restart(index);
	} else if (param.name == "sleep") {
		var index = getIndexFromContainer(param);
		sleep(index);
	} else if (param.name == "enableIMU") {
		var index = getIndexFromContainer(param);
		var enable = param.get();
		imuEnable(enable, index);
	}
}

function oscEvent(address, args) {
	
	if (address == "/wassup") {
		script.log("OSC Message received "+address+", "+args.length+" arguments");
		var prop = {
			"ip": args[0],
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
	valuesContainer.removeContainer("Props");
	propsContainer = valuesContainer.addContainer("Props", "List of props");
}

function createPropContainer(prop) {
	var index = props.length - 1;
	var container = propsContainer.addContainer(index + " - " + prop.ip, prop.ip);
	container.setCollapsed(true);

	prop.container = container;
	container.addTrigger("Restart", "Restart");
	container.addTrigger("Sleep", "Sleep");
	
	var batteryParameter = container.addFloatParameter("Battery Level", "Battery Level", 0, 0, 1);
	batteryParameter.setAttribute("readonly", true);
	prop.batteryParameter = batteryParameter;

	var imuC = container.addContainer("IMU", "IMU");
	
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

	var buttonC = container.addContainer("Button", "Button");
	var shortPress = buttonC.addBoolParameter("Short Press", "Short Press", false);
	prop.buttonShortPress = shortPress;
	shortPress.setAttribute("readonly",true);
}



//////////////////
// Command
//////////////////

function setColor(color, propIndex) {
	var oscAddress = "/rgb/fill";
	// var propIndexType = typeof propIndex;
	// var propIndexInt = parseInt(propIndex);
	// var propIndexLength = propIndex.length;

	// script.log("prop Index: " + propIndex + ", type: " + propIndexType + ", Int value: " + propIndexInt + ", length: " + propIndexLength);

	if (propIndex == "") {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip;
			local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);
		}
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);	
	}
}

function setPoint(color, position, size, propIndex) {
	var oscAddress = "/rgb/point";
	
	if (propIndex == "") {
		for (var i = 0; i < props.length; i++) {
			var ip = props[i].ip;
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
	sendMsgWithValue(propIndex, "/imu/enabled", enable);

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

function yo() {
	var ips = util.getIPs();
	
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
		script.log("Prop " + i + ": " + cur.ip + ", " + cur.mac + ", " + cur.name);
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
}

function collapseContainers() {
	local.parameters.oscInput.setCollapsed(true);
	local.parameters.oscOutputs.setCollapsed(true);
	local.scripts.bento_osc.setCollapsed(true);
}

function getIndexFromContainer(param) {
	parentName = param.getParent().name;
	var p = parentName.split("_");
	var index = p[0];
	
	return index;
}

function getBroadcastIP (ip) {
	digits = ip.split(".");
	return digits[0] + "." + digits[1] + "." + digits[2] + ".255";
}

function getPropIP(index) {
	index = parseInt(index);
	return props[index].ip;
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
			var ip = props[i].ip;
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
			var ip = props[i].ip;
			local.sendTo(ip, remotePort, oscAddress, value);
		}
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress, value);	
	}
}
