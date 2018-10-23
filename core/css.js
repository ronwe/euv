var prefix = (function () {
	var styles = window.getComputedStyle(document.documentElement, ''),
	pre = (Array.prototype.slice
			.call(styles)
			.join('') 
			.match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
		  )[1],
	dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
	return {
		dom: dom,
		lowercase: pre,
		css: '-' + pre + '-',
		js: pre[0].toUpperCase() + pre.substr(1)
	}
})()

var need_prefix_attr = ['transform' ,'transition','animation','flex','transition-property', 'transition-duration', 'transition-timing-function'
, 'transition-delay','animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay']
/*
* 给需要加前缀的属性包裹前缀
*/
exports.addStylePrefix = function(styles){
	var ret = {}
	var js = prefix.css
	if (!js ) return styles 
	
	for (var key in styles){
		if ( need_prefix_attr.indexOf(key) >= 0 ){
			ret[js + key] = styles[key]
		}else{
			ret[key] = styles[key]
		}
	}
	return ret
}

exports.prefix = prefix
