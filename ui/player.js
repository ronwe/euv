var $ = window.$
var Fragment = require('component/fragment');
function init(){
	Fragment
	.base('/player/')
	.lay({
		'#main' :'widget/player_main'
	});
}	

exports.init = init 
