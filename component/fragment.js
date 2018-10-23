var $ = window.$
var Etic = require('core/etic')
    ,Router = require('component/router')

var URI_MATCH_HASH = {}
    ,URI_BASE
	,ON_URL_NOTMATCH
var Actived = {}
    ,RegedEvents = {}

var HighDimension = {}
var _link_tmp  = document.createElement('a')
function getAbsURI(relative_url,no_base){
    if (relative_url.slice(0,1) === '/') return relative_url
    if (URI_BASE && !no_base){
        _link_tmp.href = URI_BASE + relative_url
    }else{
        _link_tmp.href = relative_url
    }
    var ret = _link_tmp.pathname + _link_tmp.search + _link_tmp.hash
    if (ret.slice(0,1) !== '/') ret = '/' + ret
    return ret
}
function Store(id,container ,root_dom , root_css ,inst){
    if (!id) return false
    var _scroll = root_dom.scrollTop()
    var _piece = document.createDocumentFragment()
    _piece.appendChild(root_dom.get(0))

    if (root_css){
        var _piece2 = document.createDocumentFragment()
        _piece2.appendChild(root_css)
    }
    //暂时只做了一个组件的异次元 多个得改数组
    HighDimension[id] = {
        inst : inst,
        container : container ,
        scrollpx :	_scroll ,
        dom:_piece,
        css : _piece2
    }
}
function ReStore(obj ,cbk){
    //console.log(obj)
    $(obj.container).empty().append(obj.dom)
    if (obj.css){
        var cssnum = document.styleSheets.length
        var ti = setInterval(function() {
            if (document.styleSheets.length > cssnum) {
                // needs more work when you load a bunch of CSS files quickly
                // e.g. loop from cssnum to the new length, looking
                // for the document.styleSheets[n].href === url
                // ...

                // FF changes the length prematurely :()
                clearInterval(ti)
                resetScroll()
            }
        }, 10)
        $('head').append(obj.css)
    }else{
        resetScroll()
    }
    function resetScroll(){
        if (obj.scrollpx){
            ///console.log(obj.scrollpx , $(obj.container).children().eq(0))
            window.setTimeout(function(){
                $(obj.container).children().eq(0).scrollTop(obj.scrollpx)
            },30)
        }
    }
    cbk(obj.container , obj.inst)
}
function getEventNS(widget_name){
    return 'Widget://' + widget_name + '#'
}
/*
 * 加载组件
 * @param 组件名
 * @param 属性 */
var StaticHost = booter.option('serverHost')
if (StaticHost) StaticHost= StaticHost[0].replace('/~','')

function loadWidget(widget_name,widget_prop){
    if (!widget_name)  return false
    var tpl_transformer
        ,root_container
        ,root_data = {}
        ,root_dom = $('<div class="' + widget_name.replace(/\//g,'-')+ '"></div>')
        ,root_css
        ,root_events_reg = []
        ,root_data_watcher = []
    var _INST_MARK_TOSTORE = false
        ,_notify_unload

    booter.asyncLoad( widget_name , function(){
        _notify_unload = this.destroy
		var init_style_timer
        if (this.CssLink) {
			root_dom.addClass('widget_init')
            var import_link = this.CssLink
            if (util.isArray(import_link)) import_link = import_link.join(',')

            import_link = StaticHost + import_link+ '?v=' + booter.option('Version')
			var init_style_removed = false
            root_css =  window.loadCSS(import_link,function(link){
				init_style_removed = true
				init_style_timer && window.clearTimeout(init_style_timer)
				root_dom.removeClass('widget_init')
			})
			//link的onload事件支持非常不好
			init_style_timer = window.setTimeout(function(){
				if (init_style_removed) return
				root_dom.removeClass('widget_init')
			},400)
        }
        if (this.WigHanlder){
            //注册事件
            var _event_ns = getEventNS(widget_name)
            for(var key in this.WigHanlder){
                var _event_full_name = _event_ns + key
                emitter.on(_event_full_name ,this.WigHanlder[key])
                root_events_reg.push(_event_full_name )
                RegedEvents[_event_full_name] = true
            }
        }

        function getLeafData(root , levels){
            var _t = root
            for(var i = 0 ; i < levels.length; i++){
                var _l = levels[i]
                if (!(_l in _t)) return
                _t = _t[_l]
            }
            return _t
        }

        /*
         * 监测数据变化 如果触发将新旧值发给观察者*/
        function handleDataWatchers(new_data){
            if (!root_data_watcher.length) return

            root_data_watcher.forEach(function(rule){
                var field = rule.field
                    ,val = rule.value
                    ,cbk = rule.cbk
                var _new_val = getLeafData(new_data , field)
                if (undefined === val){
                    cbk(null ,_new_val)
                }else if (val === _new_val){
                    var _old_val = getLeafData(root_data , field)
                    cbk(_old_val,_new_val)
                }
            })
        }
        /*
         * 获得模版**/
        function  bindTpl(str){
            tpl_transformer = Etic.compileStr(str , {debug:true})
        }

        /*
         * 数据片段
         * dom 片段id
         * 更新方法 默认替换html  ； replace|append|prepend|html
                    replace 会替换节点包括节点容器内容
         * */
        function updateData(data ,segid ,replace){
            if (!root_dom) return false
            //merge data to root_data
            //得到新html
            //如果有segid 用新html对应的片段处理

            handleDataWatchers(data)
            $.extend(root_data , data)

            var new_html = tpl_transformer(root_data)

            var seg_node = root_dom

            //append后不能对整个容器update 此时数据是不全的
            if ('append' != replace && 'prepend' != replace && 'replace' != replace) replace = 'html'

            // segid 可能逗号分割
            if (segid) {
                new_html = $('<div>'+ new_html + '</div>')
                segid = segid.split(',')
                var return_node = []
                segid.forEach(function(frag_id) {
                    frag_id = frag_id.trim()
                    if (!frag_id) return
                    var _node_seg  = root_dom.find('[frag="' + frag_id + '"]')
                    var _new_node = new_html.find('[frag="' + frag_id + '"]')
                    if ('replace' === replace){
                        var _replace_html = _new_node[0].outerHTML
                        replace = 'replaceWith'
                    }else{
                        var _replace_html = _new_node.html()
                    }
                    _node_seg[replace](_replace_html)
                    return_node.push(_node_seg)
                })
                return return_node
            }else {
                if ('replace' === replace) replace = 'html'
                root_dom[replace](new_html)
                return root_dom
            }
        }

        function resetData(data){
            root_data =  {}
            updateData(data)
        }
        function hideDom(state){
            if (!root_dom) return false
            if (true === state) root_dom.hide()
            else if (false === state) root_dom.show()
            else root_dom.toggle()
        }

        /*
         * 绑定事件 事件都委托到root_dom上
         * */
        function attachEventListener(type , selector , data ,fn){
            if (!root_dom) return false
            root_dom.on(type ,selector ,data, fn)
            return OP_CHAIN.EleMent
        }
        function detachEventListener(type , selector , fn){
            root_dom.off(type ,selector ,fn)
            return OP_CHAIN.EleMent
        }
        function attachOnceEventListener(type , selector , data ,fn){
            root_dom.one(type ,selector ,data, fn)
            return OP_CHAIN.EleMent
        }

        var OP_CHAIN = {
            UI : {
                alone : function(str,data){
                    return Etic.compileStr(str , {debug:true})(data)
                },
                bindTpl : bindTpl,
                update : updateData,
                reset : resetData,
                hide: hideDom
            },
            EleMent : {
                click : function(selector , data ,fn){
                    return attachEventListener('click',selector , data ,fn)
                },
                once : attachOnceEventListener,
                on : attachEventListener,
                off : detachEventListener
            },
            Root :{
                watch : function(field , field_val , fn){
                    if (!field || !fn) return false
                    root_data_watcher.push({field: field.split('.') ,value: field_val , cbk:fn})
                },
                info : function(){
                    return {
                        scrollTop : root_dom.scrollTop()
                    }
                }
            },
            Sys:{
                goTo : function(new_url , opt){
                    //  如果是:开始 则到注册match中找
                    opt = opt || {}
                    if (opt.__store) {
                        _INST_MARK_TOSTORE = Router._stone()
                        delete opt.__store
                    }
                    if (':' === new_url.slice(0,1)){
                        new_url = URI_MATCH_HASH[new_url.slice(1)]
                        new_url = new_url.replace(/\:(\w+)/g,function(all, param){
                            if (opt[param]) {
                                var t = opt[param]
                                delete opt[param]
                                return t
                            }
                            return param
                        })
                        var query_plus = {}
                        for (var param in opt){
                            if ('__' == param.slice(0,2) ) continue
                            query_plus[param] = opt[param]
                        }
                        query_plus = util.build_query(query_plus)
                        if (query_plus){
                            new_url += (new_url.indexOf('?') ? '&' : '?'  ) + query_plus
                        }
                    }else {
                        if (undefined === opt.relative) opt.relative = true
                        if (opt.relative){
                            new_url = getAbsURI(new_url,true)
                        }
                    }

                    Router.naviTo(new_url)
                },
                kall :  communicateWidget,
                goBack : Router.naviBack
            }
        }
        if (this.init){
            this.init(OP_CHAIN ,widget_prop)
        }else{
            console.error (widget_name + ' init not regist')
        }
    })

    //销毁
    //移除css
    //删除注册事件
    //
    function destroy(){
        _notify_unload && _notify_unload(!_INST_MARK_TOSTORE)
        //扔到异次元空间
        if (_INST_MARK_TOSTORE){
            Store(_INST_MARK_TOSTORE ,root_container ,root_dom , root_css , _OP)
            delete Actived[root_container]
            return
        }
        root_events_reg.forEach(function(evt_name){
            emitter.removeListener(evt_name)
            delete RegedEvents[evt_name]
        })
        root_events_reg.length = 0

        root_data_watcher.length = 0

        if (!root_dom) return false
        _notify_unload = null

        root_dom.remove()
        root_dom = null

        root_data = null
        tpl_transformer = null
        if (root_css){
            $(root_css).remove()
            root_css = null
        }
        delete Actived[root_container]
        root_container = null
    }

    function fillTo(container){
        if (!root_dom) return false
        //判断如果容器已挂载控件则禁止
        if (Actived[container]) return false

        Actived[container] = true /*{

			destroy : destroy
		} */
        $(container).empty().append(root_dom)
        root_container = container
        return this
    }

    var _OP = {
        fill : fillTo,
        destroy : destroy
    }
    return _OP
}
/*
 * 发送事件通知给其它组件*/
function communicateWidget(widget_name , evt_name,val0,val1,val2,val3,val4,val5,val6,val7 ){
    if (!evt_name){
        return communicateWidget.bind(null,widget_name)
    }
    if (undefined === val0){
        return communicateWidget.bind(null,widget_name,evt_name)
    }
    var _key = getEventNS(widget_name) + evt_name
    //判断是否已注册
    if (!RegedEvents[_key]) return false

    emitter.emit(_key , val0,val1,val2,val3,val4,val5,val6,val7 )
    return true
}


/*
 * 判断容器是否已填充**/
exports.occupy = function(container){
    return !!Actived[container]
}


function fillAllContainer(fills , params , literal_cbk){
    for (var container in fills){
        var widget_reg = fills[container]
        if (util.detectType(widget_reg,'String')) {
            widget_reg = {'name' : widget_reg  }
            fills[container] = widget_reg
        }else if (util.detectType(widget_reg,"Boolean")){
            //控制容器显示隐藏
            ///console.log('widget_reg',container,widget_reg)
            $(container)[widget_reg? 'show' :'hide']()
            literal_cbk && literal_cbk(container , {destroy:function(){
                $(container).toggle()
            }})
            return
        }
        widget_reg.prop = widget_reg.prop || {}
        widget_reg.prop._params =  params
        inst = loadWidget(  widget_reg.name ,widget_reg.prop).fill(container)
        literal_cbk && literal_cbk(container , inst)
    }
}

var _DefaultFills
_Default_widgets = {}
/*
 * 销毁要被覆盖的默认组件
 * 还原默认组件*/
function resetDefaultWidget(router_wiglist , params){
    var _fills = {}
        ,_has_new = false
    for (var key in _DefaultFills){
        if (router_wiglist.indexOf(key) == -1){
            //新建或还原
            if (_Default_widgets[key]) {

            }else{
                _fills[key] = _DefaultFills[key]
                _has_new = true
            }
        }else if (_Default_widgets[key]) {
            _Default_widgets[key].destroy()
            delete _Default_widgets[key]
        }
    }

    if (false === _has_new) return
    fillAllContainer(_fills,params || null ,function(container,inst){
        _Default_widgets[container] = inst
    })
}
/*
 * 默认布局*/
exports.lay = function(fills){
    _DefaultFills = fills
    this.match('',{})
    return this
}

exports.base = function(uri_path){
    URI_BASE = uri_path
    return this
}


/** 未匹配到的时候执行*/
Router.notFound( function(){
	if (ON_URL_NOTMATCH){
		if (false === ON_URL_NOTMATCH()) return
	}
    resetDefaultWidget([])
})
/*
*取url的path的最后部分*/
function getIDFromUri(uri){
    if (!uri) return
    var part = uri.split('?')[0].split('/').pop()
    if (part.slice(0,1) == ':') return
    return part
}
/*
 * @param url
 * @param {容器id : {name: 组件名,prop:参数}}*/
exports.match = function(uri , fills , id){
    uri = getAbsURI(uri)
    id = id || getIDFromUri(uri)
    if (id){
        URI_MATCH_HASH[id] = uri
    }
    var widget_insts = []
        ,wiget_container = Object.keys(fills)
    Router.reg(uri , {
        'setup' : function(params , opt){
            opt = opt || {}
            ///console.log('opt.stone' ,opt.stone , HighDimension)
            var _fills = $.extend({},fills)
            if (opt.stone && HighDimension[opt.stone]){
                var _store_obj = HighDimension[opt.stone]

                //暂时只支持单个组件恢复
                wiget_container.push(_store_obj.container)
                delete _fills[_store_obj.container]
                delete HighDimension[opt.stone]
            }

            resetDefaultWidget(wiget_container , params)
            function onFill(container ,inst){
                if (inst) widget_insts.push(inst)
            }

            fillAllContainer(_fills, params ,onFill)
            if (_store_obj) {
                ReStore(_store_obj ,onFill)
            }
        },
        'unSetup' : function(){
            widget_insts.forEach(function(inst){
                inst.destroy()
            })
            widget_insts.length = 0
            ///console.log('widget_insts' ,widget_insts)
        }
    })
    return this
}

/*
 * 自定义匹配失败事件*/
exports.notFound = function(fn){
	ON_URL_NOTMATCH = fn
}
/*
 * 尝试调用组件注册方法 未加载的组件不会被调用**/
exports.kall = communicateWidget
/*
 * 加载组件*/
exports.load = loadWidget
