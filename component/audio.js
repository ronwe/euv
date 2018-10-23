var _h5_audio_supported = !!window.Audio

var _global_volumn
	,_global_mute
	,_idcount = 0
function getAudio(src){
	if (!src) return false
	var _isplaying = false
	var inst = AudioWorker(src)

	//https://msdn.microsoft.com/en-us/library/windows/desktop/dd564085(v=vs.85).aspx
	// playState 2:paused ,3:playing ,6 ready ,8 end,10:unplay ;9 6 8

	//inst.readyState 4: ready,inst.paused,inst.ended
	var _evt_reg = {}
	function triggerEvent(name){
		if (!name) return
		if (!_evt_reg[name]) return
		_evt_reg[name]()
		if ('paused' == name || 'end' == name || 'playing' == name){
			_isplaying =  'playing' == name
		}
	}
	var id = _idcount++
	var opChain = {
		id : function(){
			return id
		},
		src : function(url){
			if (!_h5_audio_supported || !inst) return false 
			if (!url) return inst.src
			inst.src = url
		},
		current : function(time){
			if (!_h5_audio_supported || !inst) return false 

			if (undefined === time){
				return inst.currentTime
			}else {
				time = time | 0
				inst.currentTime = time
			} 
		},
		play : function(){
			if (!inst) return
			_h5_audio_supported ? inst.play() : inst.controls.play()
		},	
		pause: function(){
			if (!inst) return
			_h5_audio_supported ? inst.pause() : inst.controls.pause()
		},
		volume: function(val){
			if (!inst) return
			if (!_h5_audio_supported) return false
			// IE得用dom读写 不想弄
			if (undefined === val) {
				return inst.volume
			}
			inst.volume = _global_volumn = val
		},
		muted : function(bool){
			if (!inst) return
			if (!_h5_audio_supported) return false
			if (undefined === bool) bool = true
			inst.muted = _global_mute = bool
		},
		info : function(){
			if (!_h5_audio_supported) return false 
			return {
				duration : inst.duration,
				currentTime : inst.currentTime,
				buffered : inst.buffered
			}
		},
		on : function(name, fn){
			
			if (['error','loadeddata','progress' , 'timeupdate'].indexOf(name) > -1){
				if (!_h5_audio_supported || !inst) return
				if ('error' == name){
					var user_fn = fn
					fn = function(){
						user_fn(this.error)
					}
				}
				inst.addEventListener(name ,fn)
			}else{
				//pause playing ended
				_evt_reg[name] = fn
			}
			return this
		},
		visualize : function (opt,cbk){
			if (!_h5_audio_supported || !inst) return this
			opt = opt || {}
			try{
				///https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
				/// https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteTimeDomainData
				inst.crossOrigin = "anonymous"
				inst.crossOrigin = "www.lavaradio.com"
				var ctx = new (window.AudioContext || window.webkitAudioContext)() 
				var audioSrc = ctx.createMediaElementSource(inst)
				var analyser = ctx.createAnalyser()
				if (opt.fftSize) analyser.fftSize = opt.fftSize 
				// we have to connect the MediaElementSource with the analyser 
				audioSrc.connect(analyser)
				analyser.connect(ctx.destination)
				// we could configure the analyser: e.g. analyser.fftSize (for further infos read the spec)
				var frequencyData = new Uint8Array(analyser.frequencyBinCount)

				function renderFrame() {
					if (!inst) return
					if (_isplaying) {
						///analyser.getByteTimeDomainData(frequencyData)
						analyser.getByteFrequencyData(frequencyData)
						cbk(frequencyData)
					}
					requestAnimationFrame(renderFrame)
				}
				///audio.start()
				renderFrame()	
			}catch(err){
				console.log(err)
			}
			return this
		},
		remove: function(){
			opChain.pause()
			if (!inst) return
			if (!_h5_audio_supported) {
				var _wrapper = inst.parentNode
				_wrapper.parentNode.removeChild(_wrapper)
			}else { 
				inst.src = '' 
				inst = null
			}
		}
	}

	if (inst.playState && inst.attachEvent){ 
		inst.attachEvent("PlayStateChange", function(){
			var evt_name = {
				8 : 'end',
				2 : 'paused',
				3 : 'playing',
				6 : 'ready'
			}[inst.playState]
			triggerEvent(evt_name)
		})
	}else if (inst.addEventListener){
		inst.addEventListener('ended' ,function(){
			triggerEvent('end')
		})
		inst.addEventListener('playing' ,function(){
			triggerEvent('playing')
		})
		inst.addEventListener('pause' ,function(){
			triggerEvent('paused')
		})
		inst.addEventListener('canplay' ,function(){
			triggerEvent('ready')
		})
	}
	if (undefined !== _global_volumn){
		opChain.volume(_global_volumn)
	}
	if (undefined != _global_mute){
		opChain.muted(_global_mute)
	}
	return opChain
}
function AudioWorker(src){
	//src = 'http://audio2.lavaradio.com/internet_fetch_extend/n_422/422697/28018002.mp3'
	//src ='http://audio3.lavaradio.com/radio/lava-ld-3.mp3'
	if (_h5_audio_supported){
		return new  Audio(src)
	}else{
		//https://stackoverflow.com/questions/11953656/start-pause-audio-in-an-embed-tag-ie8
		//	document.body.innerHTML += '<embed id="audiotagII" src="'+src+'" autostart="false" loop="false" width=200 height=100></embed>'
		var _embed_wrap = document.createElement('div') 
		_embed_wrap.style.display = 'none'
		 _embed_wrap.innerHTML = '<object classid="clsid:6BF52A52-394A-11d3-B153-00C04F79FAA6" >'+ 
								'<param name="URL" value="'+src+'" />'+
								'<param name="uiMode" value="invisible" />'+
								'<param name="autoStart" value="false" />'+
								'<param name="volume" value="100" />'+
								'<param name="playCount" value="1" /> <!-- (Int32) 2^31-1==2147483647 - maximum allowed count (for 1 second length audio is equals to 68+ years) -->'+
							'</object>' 
		//_embed_wrap.innerHTML = '<embed src="'+src+'" oncanplay="alert(555);"  autostart="false" loop="false" width=0 height=0></embed>'
		document.body.appendChild(_embed_wrap)
		var _embed = _embed_wrap.getElementsByTagName('object')[0]
		return _embed
	}
}

exports.get = getAudio
