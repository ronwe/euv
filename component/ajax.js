var $ = window.$	
function doFetch(method , opt , cbk){
	var post_data = opt.data

	if (!('processData' in opt)) opt.processData = true 

	return $.ajax({
		'type': method 
		,'url' : opt.url
		,'data' : post_data
		,'processData' : opt.processData
		,'dataType' : opt.dataType || 'json'
		,'success' : function(data){
			cbk(null ,data)
		}
		,'error' : function(xhr, errorType, error){
			cbk(error)
		}
		
	})

}
exports.read = function(opt , cbk){
	return doFetch('GET' , opt ,cbk)
}
exports.write = function(opt , cbk){
	return doFetch('POST' , opt ,cbk)
}
