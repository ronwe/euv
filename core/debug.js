/// https://raw.githubusercontent.com/visionmedia/debug/master/src/browser.js

/**
 * Colors.
 */

var COLORS = [
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
]


var _ColorArr = {}
	,_Enabled = true
if (!window.console) _Enabled = false

function stringHash(str){
	str = str.toString()
	if (str.length == 0) return 0
	var hash = 0, i, chr

	for (i = 0; i < str.length; i++) {
		chr   = str.charCodeAt(i)
		hash += chr
	}
	hash %= COLORS.length
	return hash
}
function createInst(ns){
	this.ns = ns
	this.color = _ColorArr[ns] = _ColorArr[ns] || COLORS[ns,stringHash(ns)]
	this.start = 0
}
function printLog(tag , args){
	if (!_Enabled) return false
	//http://www.cnblogs.com/Wayou/p/chrome_dev_tool_style_console.html
	var ns_style = 'color: ' + this.color + ';'
		,native_log = 'log'
	if ('error' == tag){
		ns_style += 'font-weight:bold;'
		,native_log = 'error'
	}
	if (!this.start) this.start = +new Date
	var _time = +new Date - this.start
	if (_time > 1000) {
		_time = _time /1000 + 's'
	}else{
		_time += 'ms'
	}
	args = ['%c ' + this.ns + ' [' + _time + ']', ns_style].concat(args)
	console[native_log].apply(console , args);

}
createInst.prototype.log = function(){
	printLog.call(this,'normal' ,util.toArray(arguments))	
}
createInst.prototype.error = function(){
	printLog.call(this,'error' , util.toArray(arguments))	
}

function initNS(ns){
	var inst = new createInst(ns)
	return inst
}

exports.console = initNS

exports.Switch = function(bool){
	if ('on' == bool) bool = true
	else if ('off' == bool) bool = false
	_Enabled = bool
}
