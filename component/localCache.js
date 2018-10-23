try{
var Storage = window.localStorage
var LZString = window.LZString
}catch(err){}
/*
 **/
function setItem(key,val,ttl){
	if (!Storage) return false
	var expire = '0000000000'
	if (ttl) expire = parseInt(+new Date/1000 + ttl )
	var saved = val
	if (util.detectType(saved,'Object')  ||  util.isArray(saved)){
		saved = JSON.stringify(saved)
	}else{
		saved = saved.toString()
	}
	if (LZString){
		saved = LZString.compress(saved)
	}
	saved = expire + '' + saved
	try{	
		Storage.setItem(key , saved)
	}catch(err){
		Storage.clear()
	}
}

function getItem(key){
	if (!Storage) return false
	var saved = Storage.getItem(key)
	if (!saved ) return false

	var expire = parseInt(saved.slice(0,10)) 
	///console.log(expire ,+new Date > expire*1000)
	if (expire && +new Date > expire*1000) {
		Storage.removeItem(key)
		return false
	}
	try{
		saved = saved.slice(10)
		if (LZString){
			saved = LZString.decompress(saved)
		}
		var _first_letter = saved.slice(0,1)
		if ('{' == _first_letter || '[' == _first_letter){
			saved = JSON.parse(saved)
		}
	}catch(e){
		Storage.removeItem(key)
		return false
	
	}
	return saved
}

function removeItem(key){
	if (!Storage) return false
	Storage.removeItem(key)
}
exports.set = setItem
exports.get = getItem
exports.remove = removeItem
