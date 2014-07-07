"use strict";

var pupLog = {};

pupLog.com = {};

pupLog.com.Data = function(name)
{
	this.name = name;
	var d = this._lsLoad();
};

pupLog.com.Data.prototype = {
	_LS_ID:		'pupLogData',

	d:		null,
	name:		null,
	
	_init: function()
	{
		this.d = {
			doge: {
				"name": this.name,
				"alerts": {
					"pee": [1.5, 2.5],
					"poo": [3, 5],
					"eat": [7, 9]
				}
			},
			log: {
				"pee": [],
				"poo": [],
				"eat": []
			}
		}		
	},
	
	_lsLoad: function(newName)
	{
		var d = localStorage.getItem(this._LS_ID);

		if (d) {
			this.d = JSON.parse(d);
		}
		else {
			this._init(newName);
			this._lsWrite();
		}
console.log('LOAD', this.d);
	},
	
	_lsWrite: function()
	{
		localStorage.setItem(this._LS_ID, JSON.stringify(this.d));
	},
	
	
	getName: function()
	{
		return this.d ? this.d.doge.name : null;
	},
	
	// returns in seconds
	getLastEntryElapsed: function(type)
	{
		var		eA, t, now = (new Date()).getTime();

		if (!this.d) throw 'data uninitialized';
		if (!(eA = this.d.log[type])) throw 'type not found: ' + type;
		
		// find last valid entry
		for (var i = eA.length-1; i >= 0; i--) {
			// ignore invalid/future dates
			t = parseInt(eA[i], 10);
			if (t == NaN || t > now) continue;
			
			return Math.floor((now - t)/1000);
		}
		
		return null;
	},
	
	logEntry: function(type, dateObj)
	{
		var 		t, $dfr = new $.Deferred();

		if (!this.d) {
			$dfr.reject('data uninitialized');
			return;
		}
		
		if (!(t = this.d.log[type])) {
			$dfr.reject('type not found: ' + type);
			return;
		}
		
		t.push(dateObj.getTime());
		t.sort();
		
		this._lsWrite();
		$dfr.resolve();
		
		return $dfr.promise();
	},
	
	reset: function()
	{
		var $dfr = new $.Deferred();
		
		this._init();
		this._lsWrite();
		
		$dfr.resolve();

		return $dfr.promise();
	}
};


pupLog.App = function()
{
	this.init();
};

pupLog.App.prototype = {
	_T_REFRESH:	60 * 1000,	// 60 second refresh
	TYPES:		{"pee": "piddle", "poo": "doodoo", "eat": "nomnom"},

	data: 		null,
	curType:	null,
	
	interval:	null,
	
	$pane:		null,
	
	
	
	init: function()
	{
		this.data = new pupLog.com.Data('Bumper');
		
		// cache selectors
		this.$pane = $('#dogePane');

		this._bindEvt();
		this.refresh();
	},
	
	_bindEvt: function()
	{
		$(document)
			.onC('click', 'button', this._buttonCb, this);
	},
	
	_buttonCb: function(e)
	{
		var $t = $(e.currentTarget);

		switch ($t.data('act')) {
		case 'add':
			var type = $t.parents('li').data('type');
			this._logEntryPrompt(type);
			break;
		case 'reset':
			this.reset();
			break;
		case 'logEntryPrompt':
			var $modal = $t.parents('.logEntryPrompt');
			var date = $modal.find('input[name=datetime]').val();
			
			this._logEntryAdd(this.curType, date)
				.done($.proxy(function() {
					$modal.modal('hide');
					this.curType = null;
					this.refresh();
				}, this));
			break;
		}
	},
	
	_mapType: function(type)
	{
		return this.TYPES[type];
	},
	
	_elapsedHtml: function(tA)
	{
		var str = '';
		
		if (!(tA[0] + tA[1] + tA[2]))
			return '<span class="now">just now!</span>';

		if (tA[0]) str += '<span class="day">' + tA[0] + '</span>';
		if (tA[1] || tA[0]) str += '<span class="hr">' + tA[1] + '</span>';
		if (tA[2] || tA[1] || tA[0]) str += '<span class="min">' + tA[2] + '</span>';
		
		return str;
	},
	
	_lastEntry: function(type)
	{
		var		sec, min, hr, day;

		sec = this.data.getLastEntryElapsed(type);
		if (!sec) return null;
		
		min = Math.floor(sec / 60);
		hr = Math.floor(min / 60);
		day = Math.floor(hr / 24);
		
		min = min % 60;
		hr = hr % 24;

console.log(type, day, hr, min);
		return [day, hr, min];
	},
	
	_refreshLoop: function()
	{
		if (this.interval) {
			window.clearInterval(this.interval);
			this.interval = null;
		}
		
		this.interval = window.setInterval($.proxy(this._render, this), this._T_REFRESH);
	},
	
	_logEntryPrompt: function(type)
	{
		this.curType = type;

		var $modal = $('#logEntryPrompt');

		// HACK: adjust for TZ, lop off milliseconds/Z
		var t = pupLog.utl.dateToLocalJSON()
		$modal.find('input[name=datetime]').val(t)
				
		$modal.find('h4').html('When did ' + this.data.getName() + ' ' + this._mapType(type) + '?');

		$modal.modal();
	},
	
	_logEntryAdd: function(type, date)
	{
		var $dfr = new $.Deferred();
		
		if (!date) {
			alert('plz2enter a date/time');
			$dfr.reject();
		}
		else {
			var t = pupLog.utl.localJSONtoDate(date);
			this.data.logEntry(type, t)
				.done(function() {
					$dfr.resolve();
				})
				.fail($.proxy(function(err) {
					alert(err);
				}, this));
		}
		
		return $dfr.promise();
	},
	
	_render: function()
	{
		var t, str;
		
		for (var k in this.TYPES) {
			t = this._lastEntry(k)
			str = t ? this._elapsedHtml(t) : '';
			this.$pane.find('.' + k + ' span').html(str);
		}
	},
	
	refresh: function()
	{
		this._render();
		this._refreshLoop();
	},
	
	reset: function()
	{
		if (prompt('Are you REALLY SURE you want to reset all data?\nType "arf" to confirm!') != 'arf')
			return;

		this.data.reset()
			.done($.proxy(function() {
				this.refresh();
			}, this));
	}
};

// ######################

/**
 * jquery [on|off] wrappers for context support
 * Author: PhotoShelter Inc. (www.photoshelter.com)
 */
$.fn.onC = function () {
	var args = [].slice.call(arguments, 0, arguments.length-2);
	var cb = arguments[arguments.length-2];
	var scope = arguments[arguments.length-1];

	args[args.length] = function() {
		return cb.apply(scope, arguments);
	};

	return this.on.apply(this, args);
};

$.fn.offC = function () {
	var args = [].slice.call(arguments, 0, arguments.length-2);
	var cb = arguments[arguments.length-2];
	var scope = arguments[arguments.length-1];

	args[args.length] = function() {
		return cb.apply(scope, arguments);
	};

	return this.off.apply(this, args);
};

$.fn.oneC = function() {
	var args = [].slice.call(arguments, 0, arguments.length-2);
	var cb = arguments[arguments.length-2];
	var scope = arguments[arguments.length-1];

	args[args.length] = function() {
		return cb.apply(scope, arguments);
	};

	return this.one.apply(this, args);
};

pupLog.utl = {
	/**
	 * Simple templating borrowed from Underscore.js
	 * Author: Peter Balderston, PhotoShelter Inc. (www.photoshelter.com)
	 * @param str	Template string to parse
	 * @param data
	 * 		(optional) data to evaluate with the template immediately.
	 *		Nice for single-use templates, but should be avoided otherwise
	 * @return
	 * 		A "compiled" template in the form of a new function that takes
	 * 		one argument (a data object) and returns a string of that data
	 *      parsed into the template.
	 * @throws
	 * 		Any number of javascript errors if data or function
	 *      references required by the template do not exist.
	 */
	tpl: function(str, data) {
		var c  = pupLog.utl._tplSettings;
		var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
			'with(obj||{}){__p.push(\'' +
			str.replace(/\\/g, '\\\\')
			.replace(/'/g, "\\'")
			.replace(c.escape, function(match, code) {
				return "',pupLog.utl.tplescape(" + code.replace(/\\'/g, "'") + "),'";
			})
			.replace(c.interpolate, function(match, code) {
				return "'," + code.replace(/\\'/g, "'") + ",'";
			})
			.replace(c.evaluate || null, function(match, code) {
				return "');" + code.replace(/\\'/g, "'")
			.replace(/[\r\n\t]/g, ' ') + "__p.push('";
			})
			.replace(/\r/g, '\\r')
			.replace(/\n/g, '\\n')
			.replace(/\t/g, '\\t')
			+ "');}return __p.join('');";

	    	var func = new Function('obj', tmpl);
	    	return data ? func(data) : func;
  	},

	tplescape: function(string) {
	    return (''+string).replace(/&(?!\w+;|#\d+;|#x[\da-f]+;)/gi, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;').replace(/\//g,'&#x2F;');
	},

	_tplSettings: {
	    evaluate    : /<%([\s\S]+?)%>/g,
	    interpolate : /<%=([\s\S]+?)%>/g,
	    escape      : /<%-([\s\S]+?)%>/g
	},
	
	dateToLocalJSON: function(t)
	{
		if (typeof t == 'undefined') t = new Date();

		// HACK: adjust for TZ, truncate milliseconds/Z
		t.setHours(t.getHours() - t.getTimezoneOffset() / 60);
		t = t.toJSON();
		return t.substr(0, t.length-5);
	},
	
	localJSONtoDate: function(str)
	{
		// HACK: adjust for TZ, pad milliseconds/Z
		var t = new Date(str);
		t.setHours(t.getHours() + t.getTimezoneOffset() / 60);
		return t;
	}
}
