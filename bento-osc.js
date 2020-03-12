var valuesContainer = local.values;
var propsContainer;
var localIPParameter = local.parameters.localIP;
var localIP = localIPParameter.get();
var broadcastIPParameter = local.parameters.broadcastIP;
var broadcastIP = local.parameters.broadcastIP.get();
var detectTrigger = local.parameters.addTrigger("Detect Props", "Detect props");
var clearTrigger = local.parameters.addTrigger("Clear Props", "Clear props");
var lastUpdateTime = 0;
var updateRate = 1;
var remotePort = 9000;
var props = [];

function init() {
	propsContainer = valuesContainer.addContainer("Props", "List of props");
	initLocalIPEnum();
	setReadonly();
	collapseContainers();
	script.setUpdateRate(10);
}

function update() {
	var time = util.getTime();
	
	if(time > lastUpdateTime+updateRate) {
		lastUpdateTime = time;
		ping();
	}
}

function moduleParameterChanged(param) {
	if (param.is(local.outActivity)) return;
	
	if (param.is(localIPParameter)) {
		if (localIPParameter.get() != "") {
			localIP = localIPParameter.get();
			broadcastIPParameter.set(getBroadcastIP(localIP));
		}
	} else if (param.is(broadcastIPParameter)) {
		if (broadcastIPParameter.get() != "") {
			broadcastIP = broadcastIPParameter.get();
			var oscOutput = local.getChild("Parameters").oscOutputs.oscOutput.remoteHost;
			if (oscOutput) oscOutput.set(broadcastIP);
		}
	} else if (param.is(detectTrigger)) {
		detectProps();
	} else if (param.is(clearTrigger)) {
		clearProps();
	} else if (param.is(local.getChild("Parameters").oscOutputs.oscOutput.remotePort)) {
		remotePort = local.getChild("Parameters").oscOutputs.oscOutput.remotePort.get();
	}
}

function moduleValueChanged(param) {
	if (param.name == "restart") { 
		var index = getIndexFromContainer(param);
		restart(index);
	} else if (param.name == "sleep") {
		var index = getIndexFromContainer(param);
		sleep(index);
	}
}

function getIndexFromContainer(param) {
	parentName = param.getParent().name;
	var p = parentName.split("_");
	var index = p[0];
	
	return index;
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
	
	var imuC = container.addContainer("IMU", "IMU");
	
	var x = imuC.addFloatParameter("X", "X orientation", 0, -180, 180);
	prop.xParameter = x;
	x.setAttribute("readonly",true);
	
	var y = imuC.addFloatParameter("Y", "Y orientation", 0, -90, 90);
	prop.yParameter = y;
	y.setAttribute("readonly",true);
	
	var z = imuC.addFloatParameter("Z", "Z orientation", 0, -180, 180);
	prop.zParameter = z;
	z.setAttribute("readonly",true);
	
	var batteryParamter = container.addFloatParameter("Battery Level", "Battery Level", 0, 0, 1);
	batteryParamter.setAttribute("readonly", true);
	prop.batteryParameter = batteryParamter;
}

function logProps() {
	for (var i = 0; i < props.length; i++) {
		var cur = props[i];
		script.log("Prop " + i + ": " + cur.ip + ", " + cur.mac + ", " + cur.name);
	}
}




//////////////////
// Command
//////////////////

function setColor(color, propIndex) {
	var oscAddress = "/rgb/fill";
	
	if (propIndex == "") {
		local.send(oscAddress, color[0], color[1], color[2]);
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress, color[0], color[1], color[2]);	
	}
}

function setPoint(color, position, size, propIndex) {
	var oscAddress = "/rgb/point";
	
	if (propIndex == "") {
		local.send(oscAddress, color[0], color[1], color[2], position, size);
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
}

function imuUpdateRate(fps, propIndex) {
	sendMsgWithValue(propIndex, "/imu/updateRate", fps);
}

function yo() {
	local.send("/yo", localIP);
}

function ping() {
	local.send("/ping");
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

function initLocalIPEnum () {
	var ips = util.getIPs();
	localIP = localIPParameter.get();
	
	localIPParameter.removeOptions();
	
	for (var i = 0; i < ips.length; i++) {
		localIPParameter.addOption(ips[i], ips[i]);
	}
	
	var selected = (localIP != "Local IP" && localIP != undefined) ? localIP : ips[1];
	localIPParameter.set(selected);
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

function sendMsg(propIndex, oscAddress) {
	if (propIndex == "") {
		local.send(oscAddress);
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress);	
	}
}

function sendMsgWithValue(propIndex, oscAddress, value) {
	if (propIndex == "") {
		local.send(oscAddress, value);
	} else {
		var ip = getPropIP(propIndex);
		local.sendTo(ip, remotePort, oscAddress, value);	
	}
}