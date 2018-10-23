var Rules  = [] 
	,_OnNoFound
	,_ActivedRuleNo = -1 
//兼容判断
var ApiSupport = !!(window.history && history.pushState)

function parseUrl(url){
	url = url.split('#')
	var _hash = url[1]
	url = url[0].split('?')
	var _search = url[1]
	var _url= url[0] 
	return {
		path : _url || ''
		,search : _search || ''
		,hash : _hash || ''
	}
}
function parseSearch(search){
	var query = {}
	if (!search) return query

	search.split('&').forEach(function(field){
		field = field.split('=')	
		query[decodeURIComponent(field[0])] = decodeURIComponent(field[1])
	})	
	return query

}
/*
 * 匹配query*/
function matchRuleQuery(rules , _now_search){
	rules = parseSearch(rules)
	_now_search = parseSearch(_now_search)
		
	var matched = {}
	for (var key in rules){
		var val = rules[key]
		var part  = val.match(/^\:(\w+)$/)	
		if (part){
			matched[part[1]] =  _now_search[key]
		}else{
			if (val !== _now_search[key]) return false
		}
		
	}
	return matched
}
/*
 * url /a/   , /a/:id , ^/a/ , /a?q=1 , /a?q=:q */
function matchRule( rule , _now_url , _now_search,_now_hash){

	var i = 0 
		,id_arr = []
	if (rule.indexOf('#') > 0){
		rule = rule.split('#')
		if (rule[1] !== _now_hash) return false
		rule = rule[0]
	}
	if (!rule) return {} 

	if (rule.indexOf('?') >0) {
		rule = rule.split('?')
		var query_matched = matchRuleQuery(rule[1], _now_search)
		if (false === query_matched) return false
		rule = rule[0]
	}
	if (!rule) return {} 

	rule = rule.replace(/\:(\w+)/g ,function(all , key){
		id_arr[i] = key
		i++
		return '(.*)'
	}).replace(/\//g,'\\\/')

	rule = new RegExp(rule,'')
	var matched = _now_url.match(rule)
	if (!matched) return false
	matched = util.toArray(matched , 1)

	var ret = query_matched || {}
	matched.forEach(function(val , i){
		var key = id_arr[i]
		ret[key] = val
	})
	return ret 
}

function findMatchedRule( _now_url, _now_search , _now_hash){
	for(var i = Rules.length-1 ;i>=0 ; i--){
		var matched = matchRule( Rules[i].url,  _now_url, _now_search , _now_hash)
		if (matched){
			return {
				ruleNO : i,
				params  : matched 
			}
		}
	}
	return false 

}

function tryMatch(){
	var loc = window.location
	if (ApiSupport){
		var _url = loc.href.split(loc.host)[1]
	}else{
		var _url = decodeURIComponent(loc.hash.slice(1))
	}

	var _url = parseUrl(_url)
	_now_url = _url.path
	_now_search = _url.search
	_now_hash = _url.hash

	var matched = findMatchedRule( _now_url, _now_search , _now_hash) 
	if (false !== matched){
		activeRule(matched.ruleNO,matched.params)
		if (ApiSupport){
			history.replaceState(matched,null , null)
		}
		return true
	}
	_ActivedRuleNo = -1

	if (_OnNoFound) _OnNoFound()
	return false
} 

function activeRule(no , params){
	_ActivedRuleNo = no 
	var _id = _crumb_stack[_crumb_stack.length-1]
	Rules[no].hook.setup(params,{stone:_id})
}
function unActiveNow(){
	if (Rules[_ActivedRuleNo] && Rules[_ActivedRuleNo].hook.unSetup){
		Rules[_ActivedRuleNo].hook.unSetup()
	}
	_ActivedRuleNo = -1
}
var _no_hash_event = false
var __hashEventReset = util.throttle(function(){
	_no_hash_event = false 
},8)
function __innerNaviMark(){
	_no_hash_event = true
	__hashEventReset()
}

var _crumb_stack = []

if (ApiSupport){
	window.addEventListener('popstate', function(evt) {
		_crumb_stack.pop()
		var state = evt.state
		unActiveNow()
		if (!state){
			tryMatch()	
		}else{
			activeRule(state.ruleNO , state.params)
		}
	})
}else{
	window.addEventListener('hashchange', function(evt) {
		console.log('_no_hash_event' , _no_hash_event)
		if (_no_hash_event) return
		unActiveNow()
		tryMatch()	
	})
}
var _auto_resolve = util.throttle(tryMatch ,10)
/*
 * @param url  :id 
 * @param 调用**/
exports.reg = function(url, hook  ){
	if (util.detectType(hook,'Function')){
		hook = {
			setup : hook
		}
	}
	if (!hook.setup) return false
	Rules.push({url: url,hook:hook}) 
	_auto_resolve()
}

//判断是否还在本页面
//unset掉之前的 加载新的
//window.history.pushState
/*
 * opt {force : 未匹配时跳转走,nostate:  不更改url}*/
exports.naviTo = function(url ,opt){
	_crumb_stack.push(0)
	if (!url) return false
	opt = opt || {}

	var url_source = url
	url = parseUrl(url)
	var _new_hash = url.hash
	var _new_search = url.search
	var _new_url= url.path || window.location.pathname
	
	//TODO 指定参数时 切换时原元素不要销毁销毁 or 虚拟多个view？
	unActiveNow()

	var matched = findMatchedRule( _new_url, _new_search , _new_hash) 
	/// if (matched === _ActivedRuleNo) return false //参数可能变了 	
	if (!matched){
		if (opt.force) return  window.location.href = url
		return false
	}

	activeRule(matched.ruleNO,matched.params)
	if (!ApiSupport){
		//hashchange会再次触发 
		__innerNaviMark()	
	}

	if (!opt.nostate){
		if ( ApiSupport ){
			window.history.pushState(matched,null,url_source)		
		}else{
			window.location.hash = encodeURIComponent(url_source)
		}
	}
	
}
exports.naviBack = function(){
	history.back()
}
exports.naviForward = function(){
	history.forward()
}

exports._stone = function(){
	if (!ApiSupport) return false
	var id = util.uuid()
	_crumb_stack.splice(-1,1,id)
	return id

}

exports.resolve = tryMatch
exports.notFound = function(fn){
	_OnNoFound = fn
}
exports.useHash = function(p){
	if (undefined === p ) p = false
	ApiSupport = p 
}
