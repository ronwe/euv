/*
 * query to string**/
exports.queryString = util.build_query

/*
 * 跳转 以后扩展加载方式*/
exports.jumpTo = function(url ,opt){
	opt = opt || {}
	if (opt.replace){
		window.location.replace(url)
	}else{
		window.location.href = url
	}
}

/*
 * @param string url
 * @return object**/
exports.parse = function(url){
	url = url || window.location

	var link
	link = document.createElement('A')
	link.href = url
	var search = {}
	if (link.search){
		link.search.slice(1).split('&').forEach(function(field){
			field = field.split('=')	
			search[decodeURIComponent(field[0])] = decodeURIComponent(field[1])
		})	
	}
	return {
		hash : link.hash
		,host : link.host
		,hostname : link.hostname
		,href : link.href 
		,origin : link.origin
		,pathname : link.pathname
		,port : link.port
		,protocol : link.protocol
		,search :  link.search
		,query : search
	}


}

