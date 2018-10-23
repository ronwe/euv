var Ajax = require('app/api-access')
	,Cookie = require('core/cookie')
	,Debug = require('core/debug')
	,Controller = require('app/player_control')
	,AudioPlayer = require('component/audio')
	,PlayLog = require('app/playlog')
	,timer = null
	,contentPermission = UserInfo.contentPermission
	,favorPrograms = UserInfo.favorPrograms;

var RenderLib 
	,PlayerControl = {}
	,type = true;
var _global_tmp_can = {};
var _error_count = 0;
var tpl_footer = `
				<div class="playerControl" frag="footerBar">
					<p class="songName"><?= this.name || '--' ?></p>
					<div frag="playerBar">
						<p class="btn"><span  id="play-songs" class="<?= this.state === 'play'? 'playBtn':'pauseBtn'?>"></span><span class="nextBtn"></span></p>
						<div class="playProgress" frag="slider_played" >
							<input class="progress_slider" style="width: <?= (this.current/this.duration)*100?>%;" />
							<input type="range" min=0 max=<?= this.duration?> value="<?= this.current?>" class="time_slider"/>
						</div>
						<div class="voiceP" frag="voiceFrag">
							<span class="voiceTime">
								<span frag="time_left" class="time_left"><?= formatTime(this.current)?></span>
								/
								<span class="time_right"><?= formatTime(this.duration)?></span>
							</span>
							<span class="voiceBtn <?= this._volumMute == true ? 'soundOff' : 'soundOn'?>"></span>
							<div class="voiceBack">
								<p class="hasWidth" style="width:<?= this.volValue?>px"></p>
								<div class="box" style="left:<?= this.volValue?>px"></div>
								<input type="range" class="voiceRange volum_slider" value="<?= this.volValue == undefined ? '50' : this.volValue?>" style="display:none">
							</div>
						</div>
					</div>
				</div>
				`;
var tpl_song = `
				<ul class="playerSongList" frag="song_list">
						<? 
						var song_playing = this.song_id;
						song_list.forEach(function(song) { 
						?>
						<li data-songid="<?= song.song_id?>" data-program_id="<?= song.program_id?>">
							<div>
								<p class="playSongName">
									<i><?= song.song_name?></i>
									<span><?= formatTime(song.duration)?></span>
								</p>
								<p class="playCreatorName"><?= song.artists_name?></p>
							</div>
							<? if (song.song_id === song_playing) {?><span class="playing"></span><? } ?>
						</li>
						<? })?>
				</ul>
				`;

var tpl_songInfo = `
				<div class="playerImage">
					<? if (this.program.picsrc) {?>
						<img src="<?= this.program.picsrc ?>"  class="programImage">
					<?}?>
					</div>
					<p class="generList"><?= this.program.genre?></p>
					<p class="songName"><?= this.program.program_name?></p>
					<div class="stylistInfo">
						<img src="<?= this.program.dj_picsrs?>" onerror="this.src='/image/20180709101838.png'" >
					<div>
						<p class="stylistCh">音乐设计师</p>
						<p class="creatorName"><?= this.program.uname?></p>
					</div>
				</div>
				`;
var tpl_player = `
	<?
	function formatTime(secs){
		secs = secs | 0;
		if (!secs) return '00:00';
		var mint = Math.floor(secs/60)
			,secd = secs % 60;
		if (secd < 10) {secd = '0' + secd}
		if (mint < 10) {mint = '0' + mint}
		return mint + ':' + secd	
	}
	this.current = this.current || 0;
	this.program = this.program || {};
	var song_list = this.program.list || [];
	var favorPrograms = this.favorPrograms
	?>

			<div class="playContent">
				<div class="playBack playBackAnimate " style="background-image:url(<?= this.program.picsrc?>);">
					<div class="playShade"></div>
				</div>
				<div class="playInfo" frag="program">
					<div class="playerInfoLeft">
						${tpl_songInfo}
					</div>
					<div class="playerInfoRight">
						<p class="handleP">
							<?if(this.contentPermission == true){?>
								<span class="collectBtn" data-programid="<?= this.program.program_id?>" data-number ="<?= song_list.length?>" data-name="<?= this.program.program_name?>" frag="collectStatuFrag">
									<?= this.favorPrograms.indexOf(this.program.program_id) == -1 ? '收藏' : '已收藏'?>
								</span>
							<?}?>
							<span class="sharetBtn" data-programid="<?=this.program.program_id?>" data-key="<?= this.program.shareid?>">分享</span>
							<span class="songLength"><?= song_list.length?>首 单曲</span>
						</p>
						<div class="playerScroll">
							<div class="scaleSrcoll">
								<div class="hidScroll">
									${tpl_song}
								</div>
							</div>
						</div>
					</div>
				</div>
				<footer>
					${tpl_footer}
				</footer>
			</div>
	 	`;


var assignmentName = ""
var _playing 
	,_last_src
	,_volume_set
	,_volumFrag = 1
	,backId = ''
	,frags = ''
	,_state_playing = false
	,_volumMute = false;

function restoreInst(_store_play){
	_playing = _store_play
	bindControls(_playing)
}
function createInst(src ,opt){
	if (_last_src === src && !opt.force) return false
	_last_src = src
	opt = opt || {}
	if (opt.global) {
		if (_playing) {
			///safari下出现屏闪
			_playing.src(src)
			return _playing
		}else{
			var  _inst = AudioPlayer.get(src)
		} 
	}else{
		var  _inst = AudioPlayer.get(src)
	}
	_playing = _inst
	_state_playing = false
	
	_inst.on('paused' , function(){
		_state_playing = false 
	}).on('playing' , function(){
		if (undefined !== _volume_set){
			_inst.volume(_volume_set)
		}
		_state_playing = true
		RenderLib.UI.update({
			'state' : 'play',
			'playing':true
		},'playerBar');
	})
	///}).on('progress' , function(evt){
	/// loaded chrome没有
	///}).on('timeupdate' ,onTimeUp)
	/*
	// 跨域无法获得数据
	_inst.visualize({fftSize : 2048}, function(data){
		console.log(src,data)
	})
	*/
	bindControls(_inst)
	return _inst 
}

function bindControls(_inst){
	PlayerControl.current = function(val){
		_inst.current(val)
	}
	PlayerControl.volume = function(val){
		_volume_set = val
		_volumMute = false
		_inst.volume(val)
	}
	PlayerControl.pause = function(){
		_inst.pause()
		PlayLog.record(_SongPlaying, 5)
	}
	PlayerControl.play = function(){
		_inst.play()
		PlayLog.record(_SongPlaying, 3)
	}
	PlayerControl.mute = function(bool){
		_volumMute = bool 
		_inst.muted(bool)
	}

	var _note_others = [
	] 

	PlayerControl.toggle = function(){
		var _ret = !_state_playing;
		if (_state_playing){
			_inst.pause()
			_note_others.forEach(function(other){
				RenderLib.Sys.kall(other,'pause',"")
			})
			PlayLog.record(_SongPlaying, 5)
		}else{
			_inst.play()
			PlayLog.record(_SongPlaying, 3)
			_note_others.forEach(function(other){
				RenderLib.Sys.kall(other,'playing',"")
			})
		}
		RenderLib.UI.update({state: _ret?'play':'pause',playing:_ret} ,'playerBar')
		return _ret
	}
}
/*记录当前播放单曲的信息*/
function storePlayingSongInfo(song_info){
	_SongPlaying = song_info
}
/*
* 更新播放器UI*/
function updatePlayerState(song_info , fragment){
	RenderLib.UI.update({
		song_id:song_info.song_id,
		name : song_info.name,
		duration : song_info.duration,
		//assignment : assignmentName,
		//_volumFrag:_volumFrag,
		//backId:backId,
		//frags:frags,
		contentPermission:contentPermission
		,favorPrograms:favorPrograms
	},fragment);
	///console.log(song_info)
}


//上一首需要记录
var _SongStack = {}
	,_SONGSTACKMAX = 100
	,_PlayNowRecord = {}
	,_WatcherGather  = {} //防止组件多次加载绑定多次事件
	,_SongPlaying
	,err_next_timer //错误自动下一首定时器

function resetSongStack(){
	_SongStack = {
		history:[],
		cursor:-1	
	}
}

//记录正在播放的单曲，节目专辑
function recordPlaying(tag , id){
	if (false === tag) {
		_PlayNowRecord = {}
		return
	}
	_PlayNowRecord[tag] = id;
	//通知观察者们
	for (var k in _WatcherGather){
		if ( _WatcherGather[k]){
			_WatcherGather[k](_PlayNowRecord);
			
		}
	}
	
}

resetSongStack()
function songPlay(song , next ,opt ){
	opt = opt || {}
	next = next || function(){util.resport('播完了',song)}
	//TODO 广告需求 
	if (!song || !song.path) return next() 

	updatePlayerState(song, opt.alone && 'footerBar')
	storePlayingSongInfo(song)	

	
	var _audio = createInst(song.path ,{global: opt.alone? false : true})
	if (!_audio) return next()

	if (!opt.no_mark ){
		// console.log(song,null);
		_SongStack.history.push(song)
		//只记录100个需要清理 
		if (-1 == _SongStack.cursor && _SONGSTACKMAX  && _SongStack.history.length> _SONGSTACKMAX){
			_SongStack.history.splice(0, _SongStack.history.length - _SONGSTACKMAX)	
		}
	}

    err_next_timer && window.clearTimeout(err_next_timer)

	_audio.on('ready' , function(){
		// RenderLib.UI.update({playStatus:false},'playBar');
		_audio.play();
		_audio.on('end' , function(){
			_error_count = 0
			PlayLog.record(song, 5)
			playNext()
		})
		PlayLog.record(song, 0)
	}).on('error' ,function(err){
		var s = ''
		switch(err.code) {
			case MediaError.MEDIA_ERR_ABORTED:
				break;
			case MediaError.MEDIA_ERR_NETWORK:
				s+= "A network error occurred while fetching the audio.";
				break;
			case MediaError.MEDIA_ERR_DECODE:
				s+= "An error occurred while decoding the audio.";
				break;
			case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
				//s+= "The audio is missing or is in a format not supported by your browser.";
				break;
			default:
				s += "An unknown error occurred.";
				break;
		}
		if (s)  {
			_error_count++ 
			//err_next_timer && window.clearTimeout(err_next_timer)
			if (_error_count > 5){
				//错误大于5次 等10秒
				err_next_timer = window.setTimeout(function(){
					_error_count = 0
					playNext()
				},10000)
			}else{
				err_next_timer = window.setTimeout(function(){
					playNext()
				},Math.ceil(Math.random() *3) * 1000)
			}
		}
	})

	function playPrev(){
		var cursor = _SongStack.cursor
		// console.log(_SongStack.cursor);
		if (0 > cursor ) cursor = _SongStack.history.length - 1
		cursor--	
		if (cursor < 0) {
			// console.log('no-prev')
			RenderLib.UI.update({'noprev' :true} , 'back-btn' ,'replace')
			//前面没有了
			cursor = 0
			return false
		}
		

		_SongStack.cursor = cursor;
		songPlay(_SongStack.history[cursor],playNext ,{no_mark:true})
	}

	function playNext(){
		if (_SongStack.cursor > -1){
			_SongStack.cursor++
			var _song = _SongStack.history[_SongStack.cursor]
			if (!_song) {
				_SongStack.cursor = -1
				next()
			}else{
				songPlay(_song,playNext,{no_mark:true})
			}
		}else {
			next()
		}
	}
	PlayerControl.next = playNext 
	PlayerControl.prev = playPrev
	PlayerControl.stop = function(){
		PlayLog.record(song, 5)
		_audio.pause()
	}

	//dom 滚动
	if (!opt.alone && $('.playing').length){
		$('.playing')[0].scrollIntoView({
			behavior: "smooth", // or "auto" or "instant"
			block: "center" // or "center" "start" "end"
		});
	}
}

function getDataFromNet(api ,get, post ,cbk , opt){
	opt = opt || {}
	Ajax.read({
		'url' : api 
		,'cached': undefined === opt.cached ? 0 : opt.cached
		,'query' : get 
		,'data' : post
	},cbk)
}
var ProgramInfoCache = {}
	,SongInfoCache = {}
	,ORIGIN = 4  //flac 支持貌似有问题 暂时不用5（高码流） 
	,SIGNALTYPE = 1

/*
ORIGIN = 5 
if (navigator.platform.indexOf('Win') !== -1 || navigator.userAgent.indexOf('Chrome') == -1 ) {
	ORIGIN = 4
}
*/
var FetchLib = {
	channel : function(id ,attr , cbk){
		getDataFromNet('/client/Industry/brandPlay' , {_id:id}, {channel_id:id} ,function(err , ids){
			var result = [];
			ids.forEach(function(item){
				result.push({program_id :item})
			});
			cbk(null, result ,util.extend({channel_id : id},attr))
		})
	},
	favor : function(id ,attr , cbk){
		getDataFromNet('/client/GetAudioContent/getCollectionContent' , {_id:id}, {dir_id:id} ,function(err , ids){
			var result = []
			ids.list.forEach(function(item){
				result.push({program_id :item.program_id})
			});
			result = shuffle(result);
			cbk(null, result ,util.extend({dir_id : id},attr))
		})
	},
	scene : function(id ,attr , cbk){
		getDataFromNet('/client/Industry/scenarioPlay' , {_id:id}, {scene_id:id} ,function(err , ids){
			var result = []
			ids.forEach(function(id){
				result.push({program_id : id})
			});
			result = shuffle(result);
			cbk(null, result ,util.extend({scene_id :id},attr))
		})
		//TODO 获取行业节目id列表	
	},
	stylist:function(id ,attr , cbk){
		getDataFromNet('/AchieveAudioContent/getDjDetail' , {_id:id}, {uid:id} ,function(err , ids){
			var result = []
			ids.list.forEach(function(item){
				result.push({program_id : item.program_id})
			});
			result = shuffle(result);
			cbk(null, result ,util.extend({uid  :id},attr))
		})
	},	
	industry : function(id ,attr , cbk){
		getDataFromNet('/client/Industry/IndustryPlay' , {_id:id}, {industry_id:id} ,function(err , ids){
			var result = []
			ids.forEach(function(id){
				result.push({program_id : id})
			});
			result = shuffle(result);
			cbk(null, result ,util.extend({industry_id : id},attr))
		})
		//TODO 获取行业节目id列表	
	},
	programs : function(ids , attr ,cbk){
		var result = []
		ids.forEach(function(id){
			result.push({program_id : id})
		})
		cbk(null, result ,{programs : ids})
	},
	program : function(id , attr ,cbk){
		///console.log('program attr',attr)
		var attr_param = attr || {}
		function handleRet(result){
			var attr = {
				program_desc : result.program_desc,
				program_name : result.program_name,
				program_id:id
			}
			;['channel_id','dir_id', 'scene_id', 'uid', 'industry_id','frm'].forEach(function(id_name){
				if (id_name in attr_param) attr[id_name] = attr_param[id_name]
			})
			if (result.picsrc && result.picsrc.indexOf('!') === -1 && (/\/\/img\d+\.lavaradio\.com\//.test(result.picsrc) )){
				result.picsrc += '!medium2'
			}
			//Update UI
			RenderLib.UI.update({
				program : result
				,favorPrograms:favorPrograms
			},'program');

			document.title = result.program_name
			assignmentName = attr.program_name
			backId = attr.program_id
			frags = 'program'
			//选链及乱序
			
			getDataFromNet('/SelectUrl/getUrlProgram' , {_id:id}, {program_id: id,signaltype:SIGNALTYPE,origin:ORIGIN} ,function(err , result2){
				if (err) return cbk(err)
				var _song_info = {};
				result.list.forEach(function(sng){
					_song_info[sng.tsid] = sng
				});

				result2.forEach(function(sng){
					if (!sng.TSID) return
					var _info = _song_info[sng.TSID] || {}
					util.extend(sng ,{
						artist_id : _info.artist_id,
						artists_name : _info.artists_name,
						salbum_id : _info.salbum_id,
						salbums_name : _info.salbums_name,
						song_id : _info.song_id,
						status : _info.status,
						copyright_status : _info.copyright_status,
					})
					SongInfoCache[sng.TSID] = sng
				});
				result2 = shuffle(result2);
				cbk(null, result2 ,attr);
			})
		}
		if (ProgramInfoCache[id]) {
			//比如节目列表页 已经取过信息了 把节目详情传过来
			handleRet(ProgramInfoCache[id])
			return
		}
		getDataFromNet('/client/GetAudioContent/getProgramDetail' , {_id : id}, {program_id:id} ,function(err , result){
			if (err) {
				console.error('program info',err)
				return cbk(err)
			}
			//单曲返回图片后就不用取
			ProgramInfoCache[id] = result
			handleRet(result)
		})
	},
	song : function(id, attr , cbk){
		attr = attr || {}
		var tsid = attr.TSID || attr.tsid || id
		if (!tsid)  {
			var song_id = attr.song_id
			if (!song_id) return cbk('no song_id or tsid')
		}
		RenderLib.UI.update({song_id : song_id ||id} ,"song_list")
		function songExtCallBack(err , result){
			if (err) return cbk(err)
			///RenderLib.UI.update({song_id : result.song_id} ,"song_list")
			cbk(null , result, attr)
		}
		// attr.picsrc 节目封面
		
		///选链有时效 极端情况下应该删除缓存
		if (SongInfoCache[tsid] && SongInfoCache[tsid].expireTime &&  SongInfoCache[tsid].expireTime < (+new Date / 1000 ) ){
			delete SongInfoCache[tsid]
		}
		if (SongInfoCache[tsid]){
			songExtCallBack(null,SongInfoCache[tsid])
			return
		}
		var param = {signaltype:SIGNALTYPE,origin:ORIGIN}

		if (tsid) param.tsid = tsid
		else param.song_id = song_id;
		//如果是直接播放单曲 则单独调选链

		getDataFromNet('/SelectUrl/getUrl' , {_id: song_id || tsid}, param  ,function(err , result){
			//这个选链不能cache
			if (err) return songExtCallBack(err)
			songExtCallBack(null, result)
		},{cached : 0})
	}
} 

function playRack(levels ,attr ,opt ){
   

	
	attr = attr || {}
	opt = opt || {}
	var onEnd = opt.onEnd
	var tag = levels.shift()
	onEnd = onEnd || function(err){ console.log(tag + ' 播完了')}

	if (!tag) return false
	if (!FetchLib[tag]){
		return false
	}
	recordPlaying(tag , ('song' === tag  && (attr.song_id || attr.TSID )) ||  opt.id);
	//console.log('att',tag ,attr,opt)
	FetchLib[tag](opt.id , attr ,function(err , list , attr2){
		if (err) {
			err_next_timer && window.clearTimeout(err_next_timer)
			err_next_timer = window.setTimeout(function(){
				onEnd(err)
			},Math.ceil(Math.random() *3) * 1000)
			return 
		}
		if ('song' == tag){
			if (list && attr){
				;['prefetch','dir_id', 'scene_id', 'uid', 'industry_id','channel_id','program_id','song_id','frm'].forEach(function(col){
					if (col in attr) list[col] = attr[col]
				})
			}

			songPlay(list , onEnd ,{alone : opt.alone})
			return
		}
		var sub_id_col = {
			channel: 'program_id' ,
			industry : 'program_id',
			scene : 'program_id',
			favor : 'program_id',
			stylist:'program_id',
			program: 'song_id' ,
			programs : 'program_id'}[tag]
		
		function literalFn(err){
			var first = list.shift()
			if (!first) {
				return  onEnd()
			}
			var id = first[sub_id_col]
			if (!id) {
				return onEnd('sub id ' + sub_id_col + ' blank ')
			}
			if ('song' == levels[0]){
				//预读取下
				var prefetch = list[0] && list[0]
			}
			playRack(levels.slice() , util.extend({prefetch:prefetch},attr2,first) ,{id: id,onEnd:literalFn})
		};

		literalFn();
	})
	
}

function initPlayRest(){
	recordPlaying(false)
	resetSongStack()
	controlAct('reset')
	RenderLib.UI.update({volValue: _volume_set*100,_volumMute:_volumMute},'playerBar')

}

function initAttr(attr ,opt){
	attr = attr || null
	if (typeof opt  === 'object' ){
		attr = attr || {}
		;['frm','industry_id'].forEach(function(name){
			if (opt[name]) {
				attr[name] = opt[name]
				delete opt[name]
			}
		})
	}
	return attr
}

function playProgram(id , opt){
	initPlayRest()
	opt = opt || {}

	var attr = null;
	['industry_id','scene_id','dir_id','channel_id','uid'].every(function(type){
		if (type in opt){
			attr = {}
			attr[type] = opt[type] 
			return false
		}
		return true
	});
	opt.id = id
	opt.onEnd = opt.onEnd || rePlayBind('program' , id ,opt)
	playRack([ 'program','song'] ,attr, opt)
}

function playPrograms(ids , opt){
	initPlayRest()

	opt = opt || {}
	opt.id = ids
	opt.onEnd = opt.onEnd || rePlayBind('programs' , ids ,opt)
	playRack(['programs', 'program','song'] ,null, opt)
}

function playIndustry(id ,opt){
	initPlayRest()
	opt = opt || {}
	opt.id = id
	opt.onEnd = opt.onEnd || rePlayBind('industry' , id ,opt)
	var attr = initAttr(null,opt) 
	playRack(['industry', 'program','song'] ,attr, opt)
}

function playChannel(id , opt){
	initPlayRest()
	opt = opt || {}
	opt.id = id
	opt.onEnd = opt.onEnd || rePlayBind('channel' , id ,opt)
	var attr = initAttr(null,opt) 
	playRack(['channel', 'program','song'] ,attr, opt)
}

function playStylist(id , opt){
	initPlayRest()
	opt = opt || {}
	opt.id = id
	opt.onEnd = opt.onEnd || rePlayBind('stylist' , id ,opt)
	var attr = initAttr(null,opt) 
	playRack(['stylist', 'program','song'] ,attr, opt)
}
function playScene(id ,opt){
	initPlayRest()

	opt = opt || {}
	opt.id = id
	opt.onEnd = opt.onEnd || rePlayBind('scene' , id ,opt)
	var attr = initAttr(null,opt) 
	playRack(['scene', 'program','song'] ,attr, opt)
}

function playFavor(id,opt){
	initPlayRest()
	opt = opt || {}
	opt.id = id
	opt.onEnd = opt.onEnd || rePlayBind('favor' , id ,opt)
	var attr = initAttr(null,opt) 
	playRack(['favor', 'program','song'] ,attr, opt)
}

//单曲不是集合 需要单独的播放单元
function playSong(id,attr){
	resetSongStack()	
	controlAct('pause')
	var  opt = {}
		,attr = attr || {}

	if (id){
		attr.song_id = id
	}
	opt.alone = true
	/*
	var _global_player = _playing
		,_store_song_info = _SongPlaying
	*/
	if (!_global_tmp_can.player){
		_global_tmp_can.player = _playing
		_global_tmp_can.song_info = _SongPlaying
	}
	opt.onEnd = attr.onEnd || function(){
		_playing.remove()
		var _store_song_info = _global_tmp_can.song_info
			,_global_player = _global_tmp_can.player
		_global_tmp_can = {}

		if (!_store_song_info){
			//以防万一
			window.location.reload()
			return
		}

		updatePlayerState(_store_song_info)
		storePlayingSongInfo(_store_song_info)
		RenderLib.UI.update({song_id : _SongPlaying.song_id} ,"song_list")
		restoreInst(_global_player)

		_global_player.play()
		controlAct('current' , 1e6)
	}
	playRack([ 'song'] ,attr, opt)
}

function rePlayBind(tag , id ,opt){
	//最少播放10秒后才能replay
	var bind_time = +new Date + 1e4
	function rePlayBinded(err){
		if (err) {
			RenderLib.Sys.kall('widget/window','alert','服务异常，换个听吧' )
			return 
		}
		var time_diff =  bind_time  - +new Date
		if (time_diff > 0) {
			window.setTimeout(function(){
				rePlayBinded()
			}, time_diff)
			return 
		}
		if (!PlayerControl.stop) return
		PlayerControl.stop()

		opt = opt || {}
		// console.log(tag + ' [' +id +'] is end ,replay all')
		var fn = {
				'channel': playChannel
				,'industry': playIndustry
				,'scene':playScene 
				,'favor':playFavor
				,'stylist':playStylist
				,'program' : playProgram
				,'programs' : playPrograms
				,'song' : playSong
				}[tag] 	
		delete opt.onEnd
		fn(id,opt)
	}
	return rePlayBinded
}

/*	
 *	var prefetchDom = $('<link rel="prefetch" href="'+url+'" />').appendTo('body')
*/

var _prefetching 
if ('Audio' in window){
    var _prefetchDom = new Audio
	_prefetchDom.autoplay = false
}
var PREFETCHTIME = 30 
//提前30秒开始缓存 ,0 不预加载
//expireTime 如果要过期了 需要重新选链,一首歌以15分钟计算
function preLoadAsset(sng){
	if (!sng) return
	var src = sng.path

    if ( _prefetching == src) return
	_prefetching = src
	if (sng.expireTime &&  sng.expireTime <= (+new Date/1000 + 900) ){
		delete SongInfoCache[sng.TSID] 
		var param = {tsid : sng.TSID, signaltype : SIGNALTYPE, origin :ORIGIN }
		getDataFromNet('/SelectUrl/getUrl' , {_id: sng.TSID}, param  ,function(err , result){
			_prefetching = null
			if (err || !result) return
			sng.expireTime = result.expireTime
			sng.path = result.path
			sng.fresh = (sng.fresh || 0) + 1

			SongInfoCache[sng.TSID] = result 
		})

		return
	}

	
    if (!_prefetchDom ) return

    _prefetchDom.src = src

   
    window.setTimeout(function(){
		_prefetching = null
        _prefetchDom.pause()
		_prefetchDom.src = ''
    } ,PREFETCHTIME * 1000)
}
function controlAct(act,a,b){
    if (!PlayerControl[act]) return
    return PlayerControl[act](a,b)
}


var WigHanlder = {}
WigHanlder.playChannel =  playChannel
WigHanlder.playProgram = playProgram
WigHanlder.playStylist = playStylist
WigHanlder.pause = function(){
	RenderLib.UI.update({state:'pause',playing:false} ,'playerBar')
	controlAct('pause')
}
WigHanlder.resume = function(){
	controlAct('play')
}
WigHanlder.mute = function(){
	controlAct('mute')
};

WigHanlder.typeChange = function(typeTure){
	type = typeTure;
	type == true ? $('.playerScroll').css('overflow-y','auto') : $('.playerScroll').css('overflow-y','hidden');
};

function doPlayerAct(act ,param, cbk){
	if ('live' == act){
		cbk && cbk(null , _state_playing)
		return 
	}
	if ('die' == act){
		cbk && cbk(null , _state_playing)
		window.close()
		return	
	}
	if ('toggle' == act || 'pause' == act || 'play' == act){
		act == 'pause' ? RenderLib.UI.update({'state' :'pause','playing':false},'playerBar') :  RenderLib.UI.update({'state' :'play','playing':true},'playerBar');
		var _last_state = _state_playing;
		controlAct(act)
		cbk && cbk(null,_last_state)
	}else{
		cbk && cbk('not support')
	}
}

var __last_cmd 
function doPlayerCmd(prop){
	if (!prop) return
	//每次点击全部播放时是再次循环的
	// if (__last_cmd == JSON.stringify(prop)) {
	// 	return
	// };
	__last_cmd = JSON.stringify(prop)
	//TODO 指令重复时取消
	if (prop.id){
		var name = {
			'program' : 'program_id'
			,'programs' : 'program_ids'
			,'industry' : 'industry_id'
			,'scene' : 'scene_id'
			,'favorite' : 'favorite_id'
			,'channel':'channel_id'
			,'stylist':'stylist_id'
		}[prop.type]
		if (name) prop[name] = prop.id
	}
	if (prop.program_id){
		playProgram(prop.program_id ,prop)
	}else if (prop.program_ids){
		playPrograms(prop.program_ids)
	}else if (prop.scene_id){
		playScene(prop.scene_id ,{frm:'other_scene',industry_id : prop.industry_id} )
	}else if (prop.industry_id){
		playIndustry(prop.industry_id ,{frm:'other_industry'})
	}else if (prop.favorite_id != undefined){
		playFavor(prop.favorite_id,{frm:'other_folder'})
	}else if(prop.channel_id){
		playChannel(prop.channel_id,{frm: prop.frm || 'other_brand'})
	}else if(prop.stylist_id){
		playStylist(prop.stylist_id,{frm:'other_artist'})
	}
} 

//随打乱一个数组
function shuffle(a){
	var len = a.length;
    for(var i=0;i<len;i++){
    	var end = len - 1 ;
        var index = (Math.random()*(end + 1)) >> 0;
      	var t = a[end];
       	a[end] = a[index];
        a[index] = t;
    }
    return a;
};

function init(Fragment,param){
	//TODO read from localStrorage
	RenderLib = Fragment
    Fragment.UI.bindTpl(tpl_player)
	var flag  = true;
	$(document).on('keyup', function(evt){
		if (32 == evt.keyCode ){
			type == true ? controlAct('toggle') : '';
		}
	})

	Fragment.EleMent.click('.nextBtn' , util.throttle(function(){
		controlAct('next')
	},300));

	//单独播放某一个歌曲
    Fragment.EleMent.click('.playerSongList li',function(){
		if(flag == true){
			flag = false
			var wanna_play_song = $(this).data("songid")
				,wanna_play_song_program = $(this).data("program_id")
			if (!wanna_play_song) return
			if (!_SongPlaying  || _SongPlaying.song_id != wanna_play_song){
				playSong(wanna_play_song ,{program_id:wanna_play_song_program})	
			};
			setTimeout(function(){
				flag = true;
			},1000);
		};
	});

	Fragment.EleMent.click('.prevBtn' , util.throttle(function(){
		controlAct('prev')
	},300));

	
	Fragment.EleMent.click('#play-songs' , function(){
		var _is_playing = controlAct('toggle');
		RenderLib.UI.update({
			'state' : _is_playing?'play': 'pause',
			'playing':_is_playing?true:false
		},'playerBar')
	}).on('change','.time_slider' , function(){
		//手动切换播放进程
		var current = this.value
		RenderLib.UI.update({
			current : current
		},'slider_played')
		controlAct('current' , current)
	}).on('change','.volum_slider' , function(){
		RenderLib.UI.update({volValue:this.value,_volumMute:false},'playerBar');
		controlAct('mute' ,false)
		controlAct('volume' ,this.value/100)
	}).on('click','.voiceBtn',function(){
		_volumMute = !_volumMute
		RenderLib.UI.update({_volumMute:_volumMute},'voiceFrag')
		controlAct('mute' ,_volumMute)
	})
	/*更新播放时长*/
	function upPlayedTime(){
		
		if (_playing && _state_playing) {
			var current = _playing.current()
			if (PREFETCHTIME && _SongPlaying &&  _SongPlaying.prefetch && (_SongPlaying.duration - current) < PREFETCHTIME){ 
				preLoadAsset(_SongPlaying.prefetch)
			}
			RenderLib.UI.update({
				current : current
			},'time_played , slider_played , time_left')
		}
		window.setTimeout(upPlayedTime , 1000)
	}	

	upPlayedTime();
    Fragment.UI.update({_volumFrag:_volumFrag,contentPermission:contentPermission,favorPrograms:favorPrograms});
	PlayerControl.reset = function(){
		controlAct('stop')
		RenderLib.UI.reset({})

	}
	Controller.shouldPlay(function(err , data){
		if (err){
			return console.error(err)
		};
		/// Uncaught (in promise) DOMException: play() failed because the user didn't interact with the document first
		doPlayerCmd(data)

	},doPlayerAct)

	//滑动改变音量
	Fragment.EleMent.on('mousedown','.box',function(evt){
		var boxL = $(this)[0].offsetLeft
		var e = evt || window.event //兼容性
		var mouseX = e.clientX //鼠标按下的位置
		window.onmousemove= function(ev){
			var e = ev || window.event;
			var moveL = e.clientX - mouseX;
			var newL = boxL + moveL;
			// 判断最大值和最小值
			if(newL < 0) {
				newL = 0;
			};
			if(newL >= 130) {
				newL = 130;
			};
			RenderLib.UI.update({volValue:newL,_volumMute:false},'playerBar')
			controlAct('mute' ,false);
			controlAct('volume' ,newL/130);
		};

		window.onmouseup = function() {
			window.onmousemove = false ;
			return false
		};
		return false
	});

	//改变音量
	Fragment.EleMent.click('.voiceBack' , function(ev){
		RenderLib.UI.update({volValue:ev.offsetX,_volumMute:false},'playerBar')
		controlAct('mute' ,false);
		controlAct('volume' ,ev.offsetX/130);
	});

	//收藏该节目
	Fragment.EleMent.click('.collectBtn' , function(){
		if(Cookie.get('token').length > 12){
			var programId = $(this).data('programid');
			var programNumber = $(this).data('number');
			var programName = $(this).data('name')
			var programImage = $('.programImage').attr('src');
				type = false;
				$('.playerScroll').css('overflow','hidden')
				Fragment.Sys.kall('widget/component/addCollect','alert',programId,programImage,programName,programNumber);
		}else{
			Fragment.Sys.kall('widget/component/alert','alert',2,'无效账户，请确认是否已登录');
		}
		
	});

	//分享该节目
	Fragment.EleMent.click('.sharetBtn' , function(){
		var program_key = $(this).data('key');
			type = false;
			$('.playerScroll').css('overflow','hidden')
			Fragment.Sys.kall('widget/component/share','alert',program_key);
	});
};

WigHanlder.refresh = function(){
	favorPrograms = UserInfo.favorPrograms;
	RenderLib.UI.update({favorPrograms:favorPrograms},'collectStatuFrag');
};

exports.CssLink = '/~less/component/player.less';	
exports.WigHanlder = WigHanlder;
exports.init = init;

