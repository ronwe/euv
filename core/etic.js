var cache = {}
var sn = '_ret_'  

function transStr2JS(tpl){
	var con = 'function htmlEncode(str){'+
		'if (!str) {return str === 0 ? 0: ""}  ;' +
		'return str.toString().replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g,"&quot;").replace(/\'/g, "&#039;")' +
		'};var ' + sn + ' ="" ;'
	function tLine(str ){
		return str.replace(/[\r\t\n]/g, " ").replace(/'/g , "\\'")
	}

	while (true){
		var sPos = tpl.indexOf('<?')
		if (-1 == sPos) break
		var ePos = tpl.indexOf('?>' , sPos + 2)

		var part1 = tpl.slice(0,sPos)
			, f = tpl.slice(sPos + 2 , ePos)
			,tpl = tpl.slice(ePos + 2)
		var op = f.charAt(0)
		if (part1.length) con += ";" + sn + " += '" + tLine(part1) + "';"
		switch (op){
			case '=' :
				f = f.slice(1)
				if ('=' === f.charAt(0)){
					f = f.slice(1)
					con += ";" + sn + " += " + f + ";"
				}else{
					con += ";" + sn + " += htmlEncode(" + f + ");"
				}
				break
			case '#' :
				f = f.slice(1).trim()
				con += ";" + sn +  " += etic2('" + f + "')(this);"
				break
			default:
				con += f 

		}

	}

	tpl.length  && (con += ";" + sn + " += '" + tLine(tpl) + "';")
	con += 'return ' + sn
	return con

} 

function debugTpl(con ,data){
	var ifrm = document.createElement('iframe')
	ifrm.style.display = 'none'
	document.body.appendChild(ifrm)
	ifrm = ifrm.contentWindow || ifrm.contentDocument.document || ifrm.contentDocument
	ifrm.document.open()
	ifrm.document.write('<script>\n(function(){debugger;')
	ifrm.document.write(con.replace(/\;/g,';\n'))
	ifrm.document.write('\n}).call(' + JSON.stringify(data || {}) + ')</script>')
	ifrm.document.close()
}
function compileStr(str ,opt){
	opt = opt || {}
	var debug = opt.debug 
	var con = transStr2JS(str)
	try{
        var t = new Function("" , con)
        return function (data){ 
			if (!debug) return t.call(data)

			try{ return t.call(data) } 
			catch(err){
				console.log(err)
				debugTpl(con ,data)
			}
		}
	}catch(e){
        console && console.log(e , str )
		if (debug) debugTpl(con) 
	}
}

function etic(tplId , data){
    if (!tplId) return
    var tplNode  = document.getElementById(tplId)
    if (!tplNode) return

    function  cbk(){
        return data ? cache[tplId](data) : cache[tplId]
    }

    if (cache[tplId]) return cbk()

    var tpl = tplNode.innerHTML

	if ('text/template-x' == tplNode.getAttribute('type')) {
		var con = tpl	
	}else {
		var con = transStr2JS(tpl)
	}
    try{
        var t = new Function("" , con)
        cache[tplId] = function (data){ return t.call(data)}
        return cbk()
    }catch(e){
        console && console.log(e , tpl)
    }

}

exports.compileStr = compileStr 
exports.compileTpl = etic 
window.etic2 = etic
 
