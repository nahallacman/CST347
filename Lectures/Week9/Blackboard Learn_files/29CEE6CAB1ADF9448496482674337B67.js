/*  Prototype JavaScript framework, version 1.7
 *  (c) 2005-2010 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {

  Version: '1.7',

  Browser: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile/.test(ua)
    }
  })(),

  BrowserFeatures: {
    XPath: !!document.evaluate,

    SelectorsAPI: !!document.querySelector,

    ElementExtensions: (function() {
      var constructor = window.Element || window.HTMLElement;
      return !!(constructor && constructor.prototype);
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined')
        return true;

      var div = document.createElement('div'),
          form = document.createElement('form'),
          isSupported = false;

      if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
        isSupported = true;
      }

      div = form = null;

      return isSupported;
    })()
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },

  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


var Abstract = { };


var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

/* Based on Alex Arnell's inheritance implementation. */

var Class = (function() {

  var IS_DONTENUM_BUGGY = (function(){
    for (var p in { toString: 1 }) {
      if (p === 'toString') return false;
    }
    return true;
  })();

  function subclass() {};
  function create() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0, length = properties.length; i < length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;
    return klass;
  }

  function addMethods(source) {
    var ancestor   = this.superclass && this.superclass.prototype,
        properties = Object.keys(source);

    if (IS_DONTENUM_BUGGY) {
      if (source.toString != Object.prototype.toString)
        properties.push("toString");
      if (source.valueOf != Object.prototype.valueOf)
        properties.push("valueOf");
    }

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames()[0] == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }

  return {
    create: create,
    Methods: {
      addMethods: addMethods
    }
  };
})();
(function() {

  var _toString = Object.prototype.toString,
      NULL_TYPE = 'Null',
      UNDEFINED_TYPE = 'Undefined',
      BOOLEAN_TYPE = 'Boolean',
      NUMBER_TYPE = 'Number',
      STRING_TYPE = 'String',
      OBJECT_TYPE = 'Object',
      FUNCTION_CLASS = '[object Function]',
      BOOLEAN_CLASS = '[object Boolean]',
      NUMBER_CLASS = '[object Number]',
      STRING_CLASS = '[object String]',
      ARRAY_CLASS = '[object Array]',
      DATE_CLASS = '[object Date]',
      NATIVE_JSON_STRINGIFY_SUPPORT = window.JSON &&
        typeof JSON.stringify === 'function' &&
        JSON.stringify(0) === '0' &&
        typeof JSON.stringify(Prototype.K) === 'undefined';

  function Type(o) {
    switch(o) {
      case null: return NULL_TYPE;
      case (void 0): return UNDEFINED_TYPE;
    }
    var type = typeof o;
    switch(type) {
      case 'boolean': return BOOLEAN_TYPE;
      case 'number':  return NUMBER_TYPE;
      case 'string':  return STRING_TYPE;
    }
    return OBJECT_TYPE;
  }

  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }

  function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  }

  function toJSON(value) {
    return Str('', { '': value }, []);
  }

  function Str(key, holder, stack) {
    var value = holder[key],
        type = typeof value;

    if (Type(value) === OBJECT_TYPE && typeof value.toJSON === 'function') {
      value = value.toJSON(key);
    }

    var _class = _toString.call(value);

    switch (_class) {
      case NUMBER_CLASS:
      case BOOLEAN_CLASS:
      case STRING_CLASS:
        value = value.valueOf();
    }

    switch (value) {
      case null: return 'null';
      case true: return 'true';
      case false: return 'false';
    }

    type = typeof value;
    switch (type) {
      case 'string':
        return value.inspect(true);
      case 'number':
        return isFinite(value) ? String(value) : 'null';
      case 'object':

        for (var i = 0, length = stack.length; i < length; i++) {
          if (stack[i] === value) { throw new TypeError(); }
        }
        stack.push(value);

        var partial = [];
        if (_class === ARRAY_CLASS) {
          for (var i = 0, length = value.length; i < length; i++) {
            var str = Str(i, value, stack);
            partial.push(typeof str === 'undefined' ? 'null' : str);
          }
          partial = '[' + partial.join(',') + ']';
        } else {
          var keys = Object.keys(value);
          for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i], str = Str(key, value, stack);
            if (typeof str !== "undefined") {
               partial.push(key.inspect(true)+ ':' + str);
             }
          }
          partial = '{' + partial.join(',') + '}';
        }
        stack.pop();
        return partial;
    }
  }

  function stringify(object) {
    return JSON.stringify(object);
  }

  function toQueryString(object) {
    return $H(object).toQueryString();
  }

  function toHTML(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  }

  function keys(object) {
    if (Type(object) !== OBJECT_TYPE) { throw new TypeError(); }
    var results = [];
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        results.push(property);
      }
    }
    return results;
  }

  function values(object) {
    var results = [];
    for (var property in object)
      results.push(object[property]);
    return results;
  }

  function clone(object) {
    return extend({ }, object);
  }

  function isElement(object) {
    return !!(object && object.nodeType == 1);
  }

  function isArray(object) {
    return _toString.call(object) === ARRAY_CLASS;
  }

  var hasNativeIsArray = (typeof Array.isArray == 'function')
    && Array.isArray([]) && !Array.isArray({});

  if (hasNativeIsArray) {
    isArray = Array.isArray;
  }

  function isHash(object) {
    return object instanceof Hash;
  }

  function isFunction(object) {
    return _toString.call(object) === FUNCTION_CLASS;
  }

  function isString(object) {
    return _toString.call(object) === STRING_CLASS;
  }

  function isNumber(object) {
    return _toString.call(object) === NUMBER_CLASS;
  }

  function isDate(object) {
    return _toString.call(object) === DATE_CLASS;
  }

  function isUndefined(object) {
    return typeof object === "undefined";
  }

  extend(Object, {
    extend:        extend,
    inspect:       inspect,
    toJSON:        NATIVE_JSON_STRINGIFY_SUPPORT ? stringify : toJSON,
    toJSONEx:      toJSON,  // Leaving this in here to assist in debugging odd stringify issues in IE if we see them again in other contexts.
    toQueryString: toQueryString,
    toHTML:        toHTML,
    keys:          Object.keys || keys,
    values:        values,
    clone:         clone,
    isElement:     isElement,
    isArray:       isArray,
    isHash:        isHash,
    isFunction:    isFunction,
    isString:      isString,
    isNumber:      isNumber,
    isDate:        isDate,
    isUndefined:   isUndefined
  });
})();
Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  function argumentNames() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }

  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = slice.call(arguments, 1);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(context, a);
    }
  }

  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a);
    }
  }

  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(this, a);
    }
  }

  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  }

  function defer() {
    var args = update([0.01], arguments);
    return this.delay.apply(this, args);
  }

  function wrap(wrapper) {
    var __method = this;
    return function() {
      var a = update([__method.bind(this)], arguments);
      return wrapper.apply(this, a);
    }
  }

  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      var a = update([this], arguments);
      return __method.apply(null, a);
    };
  }

  return {
    argumentNames:       argumentNames,
    bind:                bind,
    bindAsEventListener: bindAsEventListener,
    curry:               curry,
    delay:               delay,
    defer:               defer,
    wrap:                wrap,
    methodize:           methodize
  }
})());



(function(proto) {


  function toISOString() {
    return this.getUTCFullYear() + '-' +
      (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
      this.getUTCDate().toPaddedString(2) + 'T' +
      this.getUTCHours().toPaddedString(2) + ':' +
      this.getUTCMinutes().toPaddedString(2) + ':' +
      this.getUTCSeconds().toPaddedString(2) + 'Z';
  }


  function toJSON() {
    return this.toISOString();
  }

  if (!proto.toISOString) proto.toISOString = toISOString;
  if (!proto.toJSON) proto.toJSON = toJSON;

})(Date.prototype);


RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};
var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
        this.currentlyExecuting = false;
      } catch(e) {
        this.currentlyExecuting = false;
        throw e;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, (function() {
  var NATIVE_JSON_PARSE_SUPPORT = window.JSON &&
    typeof JSON.parse === 'function' &&
    JSON.parse('{"test": true}').test;

  function prepareReplacement(replacement) {
    if (Object.isFunction(replacement)) return replacement;
    var template = new Template(replacement);
    return function(match) { return template.evaluate(match) };
  }

  function gsub(pattern, replacement) {
    var result = '', source = this, match;
    replacement = prepareReplacement(replacement);

    if (Object.isString(pattern))
      pattern = RegExp.escape(pattern);

    if (!(pattern.length || pattern.source)) {
      replacement = replacement('');
      return replacement + source.split('').join(replacement) + replacement;
    }

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  }

  function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  }

  function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  }

  function truncate(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  }

  function strip() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function stripTags() {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  }

  function stripScripts() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  }

  function extractScripts() {
	    // NOTE: The original code here extracted scripts with a regex - that worked well-enough except it included scripts inside
	    // comments.  An attempt was made to remove comments via a regex but (a) that caused chrome to churn 100% cpu and effectively crash sometimes
	    // and (b) extract html comments via a regex is not actually possible to do 100% safely.
	    // Instead, let the browser do the work for us- create an element out of this html but DO NOT ADD IT to the dom so it is never actually rendered.
	    // Then just find all the scripts in that element.  If any were inside comments then they will already be properly excluded.
	    var temp = document.createElement('div');
	    temp.innerHTML = this;
	    var scripts = temp.getElementsByTagName('script');
	    if (scripts.length > 0)
	    {
	      var rawScripts = [];
	      for (var i=0;i<scripts.length;i++)
	      {
	        rawScripts[i] = scripts[i].innerHTML;
	      }
	      return rawScripts;
	    }
	    return [];
  }

  function evalScripts() {
    return this.extractScripts().map(function(script) { return eval(script) });
  }

  function escapeHTML() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function unescapeHTML() {
    return this.stripTags().replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }


  function toQueryParams(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift()),
            value = pair.length > 1 ? pair.join('=') : pair[0];

        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  }

  function toArray() {
    return this.split('');
  }

  function succ() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  }

  function times(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  }

  function camelize() {
    return this.replace(/-+(.)?/g, function(match, chr) {
      return chr ? chr.toUpperCase() : '';
    });
  }

  function capitalize() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  }

  function underscore() {
    return this.replace(/::/g, '/')
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
               .replace(/-/g, '_')
               .toLowerCase();
  }

  function dasherize() {
    return this.replace(/_/g, '-');
  }

  function inspect(useDoubleQuotes) {
    var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
      if (character in String.specialChar) {
        return String.specialChar[character];
      }
      return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  }

  function unfilterJSON(filter) {
    return this.replace(filter || Prototype.JSONFilter, '$1');
  }

  function isJSON() {
    var str = this;
    if (str.blank()) return false;
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
    return (/^[\],:{}\s]*$/).test(str);
  }

  function evalJSON(sanitize) {
    var json = this.unfilterJSON(),
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    if (cx.test(json)) {
      json = json.replace(cx, function (a) {
        return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      });
    }
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  }

  function parseJSON() {
    var json = this.unfilterJSON();
    return JSON.parse(json);
  }

  function include(pattern) {
    return this.indexOf(pattern) > -1;
  }

  function startsWith(pattern) {
    return this.lastIndexOf(pattern, 0) === 0;
  }

  function endsWith(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.indexOf(pattern, d) === d;
  }

  function empty() {
    return this == '';
  }

  function blank() {
    return /^\s*$/.test(this);
  }

  function interpolate(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }

  return {
    gsub:           gsub,
    sub:            sub,
    scan:           scan,
    truncate:       truncate,
    strip:          String.prototype.trim || strip,
    stripTags:      stripTags,
    stripScripts:   stripScripts,
    extractScripts: extractScripts,
    evalScripts:    evalScripts,
    escapeHTML:     escapeHTML,
    unescapeHTML:   unescapeHTML,
    toQueryParams:  toQueryParams,
    parseQuery:     toQueryParams,
    toArray:        toArray,
    succ:           succ,
    times:          times,
    camelize:       camelize,
    capitalize:     capitalize,
    underscore:     underscore,
    dasherize:      dasherize,
    inspect:        inspect,
    unfilterJSON:   unfilterJSON,
    isJSON:         isJSON,
    evalJSON:       NATIVE_JSON_PARSE_SUPPORT ? parseJSON : evalJSON,
    include:        include,
    startsWith:     startsWith,
    endsWith:       endsWith,
    empty:          empty,
    blank:          blank,
    interpolate:    interpolate
  };
})());

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return (match[1] + '');

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3],
          pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = (function() {
  function each(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  }

  function eachSlice(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  }

  function all(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw $break;
    });
    return result;
  }

  function any(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw $break;
    });
    return result;
  }

  function collect(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function detect(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  }

  function findAll(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function grep(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(RegExp.escape(filter));

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function include(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  }

  function inGroupsOf(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  }

  function inject(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  }

  function invoke(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  }

  function max(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  }

  function min(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  }

  function partition(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  }

  function pluck(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  }

  function reject(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function sortBy(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  }

  function toArray() {
    return this.map();
  }

  function zip() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  }

  function size() {
    return this.toArray().length;
  }

  function inspect() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }









  return {
    each:       each,
    eachSlice:  eachSlice,
    all:        all,
    every:      all,
    any:        any,
    some:       any,
    collect:    collect,
    map:        collect,
    detect:     detect,
    findAll:    findAll,
    select:     findAll,
    filter:     findAll,
    grep:       grep,
    include:    include,
    member:     include,
    inGroupsOf: inGroupsOf,
    inject:     inject,
    invoke:     invoke,
    max:        max,
    min:        min,
    partition:  partition,
    pluck:      pluck,
    reject:     reject,
    sortBy:     sortBy,
    toArray:    toArray,
    entries:    toArray,
    zip:        zip,
    size:       size,
    inspect:    inspect,
    find:       detect
  };
})();

function $A(iterable) {
  if (!iterable) return [];
  if ('toArray' in Object(iterable)) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}


function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

Array.from = $A;


(function() {
  var arrayProto = Array.prototype,
      slice = arrayProto.slice,
      _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

  function each(iterator, context) {
    for (var i = 0, length = this.length >>> 0; i < length; i++) {
      if (i in this) iterator.call(context, this[i], i, this);
    }
  }
  if (!_each) _each = each;

  function clear() {
    this.length = 0;
    return this;
  }

  function first() {
    return this[0];
  }

  function last() {
    return this[this.length - 1];
  }

  function compact() {
    return this.select(function(value) {
      return value != null;
    });
  }

  function flatten() {
    return this.inject([], function(array, value) {
      if (Object.isArray(value))
        return array.concat(value.flatten());
      array.push(value);
      return array;
    });
  }

  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) {
      return !values.include(value);
    });
  }

  function reverse(inline) {
    return (inline === false ? this.toArray() : this)._reverse();
  }

  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  }

  function intersect(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  }


  function clone() {
    return slice.call(this, 0);
  }

  function size() {
    return this.length;
  }

  function inspect() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  }

  function indexOf(item, i) {
    i || (i = 0);
    var length = this.length;
    if (i < 0) i = length + i;
    for (; i < length; i++)
      if (this[i] === item) return i;
    return -1;
  }

  function lastIndexOf(item, i) {
    i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
    var n = this.slice(0, i).reverse().indexOf(item);
    return (n < 0) ? n : i - n - 1;
  }

  function concat() {
    var array = slice.call(this, 0), item;
    for (var i = 0, length = arguments.length; i < length; i++) {
      item = arguments[i];
      if (Object.isArray(item) && !('callee' in item)) {
        for (var j = 0, arrayLength = item.length; j < arrayLength; j++)
          array.push(item[j]);
      } else {
        array.push(item);
      }
    }
    return array;
  }

  Object.extend(arrayProto, Enumerable);

  if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

  Object.extend(arrayProto, {
    _each:     _each,
    clear:     clear,
    first:     first,
    last:      last,
    compact:   compact,
    flatten:   flatten,
    without:   without,
    reverse:   reverse,
    uniq:      uniq,
    intersect: intersect,
    clone:     clone,
    toArray:   clone,
    size:      size,
    inspect:   inspect
  });

  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1;
  })(1,2)

  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;

  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf;
})();
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {
  function initialize(object) {
    this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
  }


  function _each(iterator) {
    for (var key in this._object) {
      var value = this._object[key], pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  }

  function set(key, value) {
    return this._object[key] = value;
  }

  function get(key) {
    if (this._object[key] !== Object.prototype[key])
      return this._object[key];
  }

  function unset(key) {
    var value = this._object[key];
    delete this._object[key];
    return value;
  }

  function toObject() {
    return Object.clone(this._object);
  }



  function keys() {
    return this.pluck('key');
  }

  function values() {
    return this.pluck('value');
  }

  function index(value) {
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;
  }

  function merge(object) {
    return this.clone().update(object);
  }

  function update(object) {
    return new Hash(object).inject(this, function(result, pair) {
      result.set(pair.key, pair.value);
      return result;
    });
  }

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  function toQueryString() {
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;

      if (values && typeof values == 'object') {
        if (Object.isArray(values)) {
          var queryValues = [];
          for (var i = 0, len = values.length, value; i < len; i++) {
            value = values[i];
            queryValues.push(toQueryPair(key, value));
          }
          return results.concat(queryValues);
        }
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&');
  }

  function inspect() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  }

  function clone() {
    return new Hash(this);
  }

  return {
    initialize:             initialize,
    _each:                  _each,
    set:                    set,
    get:                    get,
    unset:                  unset,
    toObject:               toObject,
    toTemplateReplacements: toObject,
    keys:                   keys,
    values:                 values,
    index:                  index,
    merge:                  merge,
    update:                 update,
    toQueryString:          toQueryString,
    inspect:                inspect,
    toJSON:                 toObject,
    clone:                  clone
  };
})());

Hash.from = $H;
Object.extend(Number.prototype, (function() {
  function toColorPart() {
    return this.toPaddedString(2, 16);
  }

  function succ() {
    return this + 1;
  }

  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }

  function toPaddedString(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  }

  function abs() {
    return Math.abs(this);
  }

  function round() {
    return Math.round(this);
  }

  function ceil() {
    return Math.ceil(this);
  }

  function floor() {
    return Math.floor(this);
  }

  return {
    toColorPart:    toColorPart,
    succ:           succ,
    times:          times,
    toPaddedString: toPaddedString,
    abs:            abs,
    round:          round,
    ceil:           ceil,
    floor:          floor
  };
})());

function $R(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  }

  function _each(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  }

  function include(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());



var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  },

  hasResponder: function( callback ) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        return true;
      }
    });
    return false;
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isHash(this.options.parameters))
        this.options.parameters = this.options.parameters.toObject();
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.isString(this.options.parameters) ?
          this.options.parameters :
          Object.toQueryString(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      params += (params ? '&' : '') + "_method=" + this.method;
      this.method = 'post';
    }

    if (params && this.method === 'get') {
      this.url += (this.url.include('?') ? '&' : '?') + params;
    }

    this.parameters = params.toQueryParams();

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300) || status == 304;
  },

  getStatus: function() {
    try {
      if (this.transport.status === 1223) return 204;
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState];
    // quite a high number of Interactive events can be generated on some browsers
    // triggering a memory issue in FF3 when building the response object. So if there is no
    // registered listener, quick return
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=453709
    if ( state == 'Interactive' )
    {
      if ( this.notListeningToInteractive )
      {
        if ( this.notListeningToInteractive.value ) return;
      }
      else
      {
        this.notListeningToInteractive = new Object();
        this.notListeningToInteractive.value = ( !this.options['onInteractive'] && !Ajax.Responders.hasResponder( state ) );
        if ( this.notListeningToInteractive.value ) return;
      }
    }
    var response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null; }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];








Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if ((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if (readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,

  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});

function $s(element) {
  if (Object.isString(element)) {
    return document.getElementById(element);
  }
  return element;
}

function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}



(function(global) {
  function shouldUseCache(tagName, attributes) {
    if (tagName === 'select') return false;
    if ('type' in attributes) return false;
    return true;
  }

  var HAS_EXTENDED_CREATE_ELEMENT_SYNTAX = (function(){
    try {
      var el = document.createElement('<input name="x">');
      return el.tagName.toLowerCase() === 'input' && el.name === 'x';
    }
    catch(err) {
      return false;
    }
  })();

  var element = global.Element;

  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;

    if (HAS_EXTENDED_CREATE_ELEMENT_SYNTAX && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }

    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));

    var node = shouldUseCache(tagName, attributes) ?
     cache[tagName].cloneNode(false) : document.createElement(tagName);

    return Element.writeAttribute(node, attributes);
  };

  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;

})(this);

Element.idCounter = 1;
Element.cache = { };

Element._purgeElement = function(element) {
  var uid = element._prototypeUID;
  if (uid) {
    Element.stopObserving(element);
    element._prototypeUID = void 0;
    delete Element.Storage[uid];
  }
}

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  // only extend the element if it is a string - otherwise we don't need to extend the element
  remove: function(element) {
    if (Object.isString(element)) {
      element = $(element);
    }
    if (element.parentNode) {
        element.parentNode.removeChild(element);
    }
    return element;
  },

  update: (function(){

    var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
      var el = document.createElement("select"),
          isBuggy = true;
      el.innerHTML = "<option value=\"test\">test</option>";
      if (el.options && el.options[0]) {
        isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
      }
      el = null;
      return isBuggy;
    })();

    var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
      try {
        var el = document.createElement("table");
        if (el && el.tBodies) {
          el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
          var isBuggy = typeof el.tBodies[0] == "undefined";
          el = null;
          return isBuggy;
        }
      } catch (e) {
        return true;
      }
    })();

    var LINK_ELEMENT_INNERHTML_BUGGY = (function() {
      try {
        var el = document.createElement('div');
        el.innerHTML = "<link>";
        var isBuggy = (el.childNodes.length === 0);
        el = null;
        return isBuggy;
      } catch(e) {
        return true;
      }
    })();

    var ANY_INNERHTML_BUGGY = SELECT_ELEMENT_INNERHTML_BUGGY ||
     TABLE_ELEMENT_INNERHTML_BUGGY || LINK_ELEMENT_INNERHTML_BUGGY;

    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
      var s = document.createElement("script"),
          isBuggy = false;
      try {
        s.appendChild(document.createTextNode(""));
        isBuggy = !s.firstChild ||
          s.firstChild && s.firstChild.nodeType !== 3;
      } catch (e) {
        isBuggy = true;
      }
      s = null;
      return isBuggy;
    })();


    function update(element, content) {
      element = $(element);
      var purgeElement = Element._purgeElement;

      var descendants = element.getElementsByTagName('*'),
       i = descendants.length;
      while (i--) purgeElement(descendants[i]);

      if (content && content.toElement)
        content = content.toElement();

      if (Object.isElement(content))
        return element.update().insert(content);

      content = Object.toHTML(content);

      var tagName = element.tagName.toUpperCase();

      if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
        element.text = content;
        return element;
      }

      if (ANY_INNERHTML_BUGGY) {
        if (tagName in Element._insertionTranslations.tags) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          Element._getContentFromAnonymousElement(tagName, content.stripScripts())
            .each(function(node) {
              element.appendChild(node)
            });
        } else if (LINK_ELEMENT_INNERHTML_BUGGY && Object.isString(content) && content.indexOf('<link') > -1) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          var nodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts(), true);
          nodes.each(function(node) { element.appendChild(node) });
        }
        else {
          element.innerHTML = content.stripScripts();
        }
      }
      else {
        element.innerHTML = content.stripScripts();
      }

      content.evalScripts.bind(content).defer();
      return element;
    }

    return update;
  })(),

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());

      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(),
          attribute = pair.last(),
          value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property, maximumLength) {
    element = $(element);
    maximumLength = maximumLength || -1;
    var elements = [];

    while (element = element[property]) {
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
      if (elements.length == maximumLength)
        break;
    }

    return elements;
  },

  // Collect items without extending them all:
  rawRecursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1) {
          elements.push(element);
      }
    return elements;
  },

  ancestors: function(element) {
    return Element.recursivelyCollect(element, 'parentNode');
  },

  descendants: function(element) {
    return Element.select(element, "*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    var results = [], child = $(element).firstChild;
    while (child) {
      if (child.nodeType === 1) {
        results.push(Element.extend(child));
      }
      child = child.nextSibling;
    }
    return results;
  },

  // Find the immediate descendents of the given element without extending them all
  rawImmediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).rawNextSiblings());
    return [];
  },

  previousSiblings: function(element, maximumLength) {
    return Element.recursivelyCollect(element, 'previousSibling');
  },

  nextSiblings: function(element) {
    return Element.recursivelyCollect(element, 'nextSibling');
  },

  // Find the next siblings without actually extending them all
  rawNextSiblings: function(element) {
    return $(element).rawRecursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return Element.previousSiblings(element).reverse()
      .concat(Element.nextSiblings(element));
  },

  match: function(element, selector) {
    element = $(element);
    if (Object.isString(selector))
      return Prototype.Selector.match(element, selector);
    return selector.match(element);
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = Element.ancestors(element);
    return Object.isNumber(expression) ? ancestors[expression] :
      Prototype.Selector.find(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return Element.firstDescendant(element);
    return Object.isNumber(expression) ? Element.descendants(element)[expression] :
      Element.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.previousSiblings(), expression, index);
    } else {
      return element.recursivelyCollect("previousSibling", index + 1)[index];
    }
  },

  next: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.nextSiblings(), expression, index);
    } else {
      var maximumLength = Object.isNumber(index) ? index + 1 : 1;
      return element.recursivelyCollect("nextSibling", index + 1)[index];
    }
  },


  select: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element);
  },

  adjacent: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element.parentNode).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = Element.readAttribute(element, 'id');
    if (id) return id;
    do { id = 'anonymous_element_' + Element.idCounter++ } while ($(id));
    Element.writeAttribute(element, 'id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return Element.getDimensions(element).height;
  },

  getWidth: function(element) {
    return Element.getDimensions(element).width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!Element.hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return Element[Element.hasClassName(element, className) ?
      'removeClassName' : 'addClassName'](element, className);
  },

  cleanWhitespace: function(element) {
    element = $s(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = Element.cumulativeOffset(element);
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  makePositioned: function(element) {
    element = $s(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    source = $(source);
    var p = Element.viewportOffset(source), delta = [0, 0], parent = null;

    element = $(element);

    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = Element.getOffsetParent(element);
      delta = Element.viewportOffset(parent);
    }

    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,

  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'height': case 'width':
          if (!Element.visible(element)) return null;

          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = (function(){

    var classProp = 'className',
        forProp = 'for',
        el = document.createElement('div');

    el.setAttribute(classProp, 'x');

    if (el.className !== 'x') {
      el.setAttribute('class', 'x');
      if (el.className === 'x') {
        classProp = 'class';
      }
    }
    el = null;

    el = document.createElement('label');
    el.setAttribute(forProp, 'x');
    if (el.htmlFor !== 'x') {
      el.setAttribute('htmlFor', 'x');
      if (el.htmlFor === 'x') {
        forProp = 'htmlFor';
      }
    }
    el = null;

    return {
      read: {
        names: {
          'class':      classProp,
          'className':  classProp,
          'for':        forProp,
          'htmlFor':    forProp
        },
        values: {
          _getAttr: function(element, attribute) {
            return element.getAttribute(attribute);
          },
          _getAttr2: function(element, attribute) {
            return element.getAttribute(attribute, 2);
          },
          _getAttrNode: function(element, attribute) {
            var node = element.getAttributeNode(attribute);
            return node ? node.value : "";
          },
          _getEv: (function(){

            var el = document.createElement('div'), f;
            el.onclick = Prototype.emptyFunction;
            var value = el.getAttribute('onclick');

            if (String(value).indexOf('{') > -1) {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                attribute = attribute.toString();
                attribute = attribute.split('{')[1];
                attribute = attribute.split('}')[0];
                return attribute.strip();
              };
            }
            else if (value === '') {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                return attribute.strip();
              };
            }
            el = null;
            return f;
          })(),
          _flag: function(element, attribute) {
            return $(element).hasAttribute(attribute) ? attribute : null;
          },
          style: function(element) {
            return element.style.cssText.toLowerCase();
          },
          title: function(element) {
            return element.title;
          }
        }
      }
    }
  })();

  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr2,
      src:         v._getAttr2,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);

  if (Prototype.BrowserFeatures.ElementExtensions) {
    (function() {
      function _descendants(element) {
        var nodes = element.getElementsByTagName('*'), results = [];
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName !== "!") // Filter out comment nodes.
            results.push(node);
        return results;
      }

      Element.Methods.down = function(element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return element.firstDescendant();
        return Object.isNumber(expression) ? _descendants(element)[expression] :
          Element.select(element, expression)[index || 0];
      }
    })();
  }

}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if (element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };
}

if ('outerHTML' in document.documentElement) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next(),
          fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html, force) {
  var div = new Element('div'),
      t = Element._insertionTranslations.tags[tagName];

  var workaround = false;
  if (t) workaround = true;
  else if (force) {
    workaround = true;
    t = ['', '', 0];
  }

  if (workaround) {
    div.innerHTML = '&nbsp;' + t[0] + html + t[1];
    div.removeChild(div.firstChild);
    for (var i = t[2]; i--; ) {
      div = div.firstChild;
    }
  }
  else {
    div.innerHTML = html;
  }
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  var tags = Element._insertionTranslations.tags;
  Object.extend(tags, {
    THEAD: tags.TBODY,
    TFOOT: tags.TBODY,
    TH:    tags.TD
  });
})();

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

(function(div) {

  if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
    window.HTMLElement = { };
    window.HTMLElement.prototype = div['__proto__'];
    Prototype.BrowserFeatures.ElementExtensions = true;
  }

  div = null;

})(document.createElement('div'));

Element.extend = (function() {

  function checkDeficiency(tagName) {
    if (typeof window.Element != 'undefined') {
      var proto = window.Element.prototype;
      if (proto) {
        var id = '_' + (Math.random()+'').slice(2),
            el = document.createElement(tagName);
        proto[id] = 'x';
        var isBuggy = (el[id] !== 'x');
        delete proto[id];
        el = null;
        return isBuggy;
      }
    }
    return false;
  }

  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }

  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
    if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
      return function(element) {
        if (element && typeof element._extendedByPrototype == 'undefined') {
          var t = element.tagName;
          if (t && (/^(?:object|applet|embed)$/i.test(t))) {
            extendElementWith(element, Element.Methods);
            extendElementWith(element, Element.Methods.Simulated);
            extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
          }
        }
        return element;
      }
    }
    return Prototype.K;
  }

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || typeof element._extendedByPrototype != 'undefined' ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
        tagName = element.tagName.toUpperCase();

    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    extendElementWith(element, methods);

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

if (document.documentElement.hasAttribute) {
  Element.hasAttribute = function(element, attribute) {
    return element.hasAttribute(attribute);
  };
}
else {
  Element.hasAttribute = Element.Methods.Simulated.hasAttribute;
}

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods),
      "BUTTON":   Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    var element = document.createElement(tagName),
        proto = element['__proto__'] || element.constructor.prototype;

    element = null;
    return proto;
  }

  var elementPrototype = window.HTMLElement ? HTMLElement.prototype :
   Element.prototype;

  if (F.ElementExtensions) {
    copy(Element.Methods, elementPrototype);
    copy(Element.Methods.Simulated, elementPrototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};


document.viewport = {

  getDimensions: function() {
    return { width: this.getWidth(), height: this.getHeight() };
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop);
  }
};

(function(viewport) {
  var B = Prototype.Browser, doc = document, element, property = {};

  function getRootElement() {
    if (B.WebKit && !doc.evaluate)
      return document;

    if (B.Opera && window.parseFloat(window.opera.version()) < 9.5)
      return document.body;

    return document.documentElement;
  }

  function define(D) {
    if (!element) element = getRootElement();

    property[D] = 'client' + D;

    viewport['get' + D] = function() { return element[property[D]] };
    return viewport['get' + D]();
  }

  viewport.getWidth  = define.curry('Width');

  viewport.getHeight = define.curry('Height');
})(document.viewport);


Element.Storage = {
  UID: 1
};

Element.addMethods({
  getStorage: function(element) {
    if (!(element = $(element))) return;

    var uid;
    if (element === window) {
      uid = 0;
    } else {
      if (typeof element._prototypeUID === "undefined")
        element._prototypeUID = Element.Storage.UID++;
      uid = element._prototypeUID;
    }

    if (!Element.Storage[uid])
      Element.Storage[uid] = $H();

    return Element.Storage[uid];
  },

  store: function(element, key, value) {
    if (!(element = $(element))) return;

    if (arguments.length === 2) {
      Element.getStorage(element).update(key);
    } else {
      Element.getStorage(element).set(key, value);
    }

    return element;
  },

  retrieve: function(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var hash = Element.getStorage(element), value = hash.get(key);

    if (Object.isUndefined(value)) {
      hash.set(key, defaultValue);
      value = defaultValue;
    }

    return value;
  },

  clone: function(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    clone._prototypeUID = void 0;
    if (deep) {
      var descendants = Element.select(clone, '*'),
          i = descendants.length;
      while (i--) {
        descendants[i]._prototypeUID = void 0;
      }
    }
    return Element.extend(clone);
  },

  purge: function(element) {
    if (!(element = $(element))) return;
    var purgeElement = Element._purgeElement;

    purgeElement(element);

    var descendants = element.getElementsByTagName('*'),
     i = descendants.length;

    while (i--) purgeElement(descendants[i]);

    return null;
  }
});

(function() {

  function toDecimal(pctString) {
    var match = pctString.match(/^(\d+)%?$/i);
    if (!match) return null;
    return (Number(match[1]) / 100);
  }

  function getPixelValue(value, property, context) {
    var element = null;
    if (Object.isElement(value)) {
      element = value;
      value = element.getStyle(property);
    }

    if (value === null) {
      return null;
    }

    if ((/^(?:-)?\d+(\.\d+)?(px)?$/i).test(value)) {
      return window.parseFloat(value);
    }

    var isPercentage = value.include('%'), isViewport = (context === document.viewport);

    if (/\d/.test(value) && element && element.runtimeStyle && !(isPercentage && isViewport)) {
      var style = element.style.left, rStyle = element.runtimeStyle.left;
      element.runtimeStyle.left = element.currentStyle.left;
      element.style.left = value || 0;
      value = element.style.pixelLeft;
      element.style.left = style;
      element.runtimeStyle.left = rStyle;

      return value;
    }

    if (element && isPercentage) {
      context = context || element.parentNode;
      var decimal = toDecimal(value);
      var whole = null;
      var position = element.getStyle('position');

      var isHorizontal = property.include('left') || property.include('right') ||
       property.include('width');

      var isVertical =  property.include('top') || property.include('bottom') ||
        property.include('height');

      if (context === document.viewport) {
        if (isHorizontal) {
          whole = document.viewport.getWidth();
        } else if (isVertical) {
          whole = document.viewport.getHeight();
        }
      } else {
        if (isHorizontal) {
          whole = $(context).measure('width');
        } else if (isVertical) {
          whole = $(context).measure('height');
        }
      }

      return (whole === null) ? 0 : whole * decimal;
    }

    return 0;
  }

  function toCSSPixels(number) {
    if (Object.isString(number) && number.endsWith('px')) {
      return number;
    }
    return number + 'px';
  }

  function isDisplayed(element) {
    var originalElement = element;
    while (element && element.parentNode) {
      var display = element.getStyle('display');
      if (display === 'none') {
        return false;
      }
      element = $(element.parentNode);
    }
    return true;
  }

  var hasLayout = Prototype.K;
  if ('currentStyle' in document.documentElement) {
    hasLayout = function(element) {
      if (!element.currentStyle.hasLayout) {
        element.style.zoom = 1;
      }
      return element;
    };
  }

  function cssNameFor(key) {
    if (key.include('border')) key = key + '-width';
    return key.camelize();
  }

  Element.Layout = Class.create(Hash, {
    initialize: function($super, element, preCompute) {
      $super();
      this.element = $(element);

      Element.Layout.PROPERTIES.each( function(property) {
        this._set(property, null);
      }, this);

      if (preCompute) {
        this._preComputing = true;
        this._begin();
        Element.Layout.PROPERTIES.each( this._compute, this );
        this._end();
        this._preComputing = false;
      }
    },

    _set: function(property, value) {
      return Hash.prototype.set.call(this, property, value);
    },

    set: function(property, value) {
      throw "Properties of Element.Layout are read-only.";
    },

    get: function($super, property) {
      var value = $super(property);
      return value === null ? this._compute(property) : value;
    },

    _begin: function() {
      if (this._prepared) return;

      var element = this.element;
      if (isDisplayed(element)) {
        this._prepared = true;
        return;
      }

      var originalStyles = {
        position:   element.style.position   || '',
        width:      element.style.width      || '',
        visibility: element.style.visibility || '',
        display:    element.style.display    || ''
      };

      element.store('prototype_original_styles', originalStyles);

      var position = element.getStyle('position'),
       width = element.getStyle('width');

      if (width === "0px" || width === null) {
        element.style.display = 'block';
        width = element.getStyle('width');
      }

      var context = (position === 'fixed') ? document.viewport :
       element.parentNode;

      element.setStyle({
        position:   'absolute',
        visibility: 'hidden',
        display:    'block'
      });

      var positionedWidth = element.getStyle('width');

      var newWidth;
      if (width && (positionedWidth === width)) {
        newWidth = getPixelValue(element, 'width', context);
      } else if (position === 'absolute' || position === 'fixed') {
        newWidth = getPixelValue(element, 'width', context);
      } else {
        var parent = element.parentNode, pLayout = $(parent).getLayout();

        newWidth = pLayout.get('width') -
         this.get('margin-left') -
         this.get('border-left') -
         this.get('padding-left') -
         this.get('padding-right') -
         this.get('border-right') -
         this.get('margin-right');
      }

      element.setStyle({ width: newWidth + 'px' });

      this._prepared = true;
    },

    _end: function() {
      var element = this.element;
      var originalStyles = element.retrieve('prototype_original_styles');
      element.store('prototype_original_styles', null);
      element.setStyle(originalStyles);
      this._prepared = false;
    },

    _compute: function(property) {
      var COMPUTATIONS = Element.Layout.COMPUTATIONS;
      if (!(property in COMPUTATIONS)) {
        throw "Property not found.";
      }

      return this._set(property, COMPUTATIONS[property].call(this, this.element));
    },

    toObject: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var obj = {};
      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        var value = this.get(key);
        if (value != null) obj[key] = value;
      }, this);
      return obj;
    },

    toHash: function() {
      var obj = this.toObject.apply(this, arguments);
      return new Hash(obj);
    },

    toCSS: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var css = {};

      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        if (Element.Layout.COMPOSITE_PROPERTIES.include(key)) return;

        var value = this.get(key);
        if (value != null) css[cssNameFor(key)] = value + 'px';
      }, this);
      return css;
    },

    inspect: function() {
      return "#<Element.Layout>";
    }
  });

  Object.extend(Element.Layout, {
    PROPERTIES: $w('height width top left right bottom border-left border-right border-top border-bottom padding-left padding-right padding-top padding-bottom margin-top margin-bottom margin-left margin-right padding-box-width padding-box-height border-box-width border-box-height margin-box-width margin-box-height'),

    COMPOSITE_PROPERTIES: $w('padding-box-width padding-box-height margin-box-width margin-box-height border-box-width border-box-height'),

    COMPUTATIONS: {
      'height': function(element) {
        if (!this._preComputing) this._begin();

        var bHeight = this.get('border-box-height');
        if (bHeight <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bTop = this.get('border-top'),
         bBottom = this.get('border-bottom');

        var pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        if (!this._preComputing) this._end();

        return bHeight - bTop - bBottom - pTop - pBottom;
      },

      'width': function(element) {
        if (!this._preComputing) this._begin();

        var bWidth = this.get('border-box-width');
        if (bWidth <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bLeft = this.get('border-left'),
         bRight = this.get('border-right');

        var pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        if (!this._preComputing) this._end();

        return bWidth - bLeft - bRight - pLeft - pRight;
      },

      'padding-box-height': function(element) {
        var height = this.get('height'),
         pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        return height + pTop + pBottom;
      },

      'padding-box-width': function(element) {
        var width = this.get('width'),
         pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        return width + pLeft + pRight;
      },

      'border-box-height': function(element) {
        if (!this._preComputing) this._begin();
        var height = element.offsetHeight;
        if (!this._preComputing) this._end();
        return height;
      },

      'border-box-width': function(element) {
        if (!this._preComputing) this._begin();
        var width = element.offsetWidth;
        if (!this._preComputing) this._end();
        return width;
      },

      'margin-box-height': function(element) {
        var bHeight = this.get('border-box-height'),
         mTop = this.get('margin-top'),
         mBottom = this.get('margin-bottom');

        if (bHeight <= 0) return 0;

        return bHeight + mTop + mBottom;
      },

      'margin-box-width': function(element) {
        var bWidth = this.get('border-box-width'),
         mLeft = this.get('margin-left'),
         mRight = this.get('margin-right');

        if (bWidth <= 0) return 0;

        return bWidth + mLeft + mRight;
      },

      'top': function(element) {
        var offset = element.positionedOffset();
        return offset.top;
      },

      'bottom': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pHeight = parent.measure('height');

        var mHeight = this.get('border-box-height');

        return pHeight - mHeight - offset.top;
      },

      'left': function(element) {
        var offset = element.positionedOffset();
        return offset.left;
      },

      'right': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pWidth = parent.measure('width');

        var mWidth = this.get('border-box-width');

        return pWidth - mWidth - offset.left;
      },

      'padding-top': function(element) {
        return getPixelValue(element, 'paddingTop');
      },

      'padding-bottom': function(element) {
        return getPixelValue(element, 'paddingBottom');
      },

      'padding-left': function(element) {
        return getPixelValue(element, 'paddingLeft');
      },

      'padding-right': function(element) {
        return getPixelValue(element, 'paddingRight');
      },

      'border-top': function(element) {
        return getPixelValue(element, 'borderTopWidth');
      },

      'border-bottom': function(element) {
        return getPixelValue(element, 'borderBottomWidth');
      },

      'border-left': function(element) {
        return getPixelValue(element, 'borderLeftWidth');
      },

      'border-right': function(element) {
        return getPixelValue(element, 'borderRightWidth');
      },

      'margin-top': function(element) {
        return getPixelValue(element, 'marginTop');
      },

      'margin-bottom': function(element) {
        return getPixelValue(element, 'marginBottom');
      },

      'margin-left': function(element) {
        return getPixelValue(element, 'marginLeft');
      },

      'margin-right': function(element) {
        return getPixelValue(element, 'marginRight');
      }
    }
  });

  if ('getBoundingClientRect' in document.documentElement) {
    Object.extend(Element.Layout.COMPUTATIONS, {
      'right': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.right - rect.right).round();
      },

      'bottom': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.bottom - rect.bottom).round();
      }
    });
  }

  Element.Offset = Class.create({
    initialize: function(left, top) {
      this.left = left.round();
      this.top  = top.round();

      this[0] = this.left;
      this[1] = this.top;
    },

    relativeTo: function(offset) {
      return new Element.Offset(
        this.left - offset.left,
        this.top  - offset.top
      );
    },

    inspect: function() {
      return "#<Element.Offset left: #{left} top: #{top}>".interpolate(this);
    },

    toString: function() {
      return "[#{left}, #{top}]".interpolate(this);
    },

    toArray: function() {
      return [this.left, this.top];
    }
  });

  function getLayout(element, preCompute) {
    return new Element.Layout(element, preCompute);
  }

  function measure(element, property) {
    return $(element).getLayout().get(property);
  }

  function getDimensions(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');

    if (display && display !== 'none') {
      return { width: element.offsetWidth, height: element.offsetHeight };
    }

    var style = element.style;
    var originalStyles = {
      visibility: style.visibility,
      position:   style.position,
      display:    style.display
    };

    var newStyles = {
      visibility: 'hidden',
      display:    'block'
    };

    if (originalStyles.position !== 'fixed')
      newStyles.position = 'absolute';

    Element.setStyle(element, newStyles);

    var dimensions = {
      width:  element.offsetWidth,
      height: element.offsetHeight
    };

    Element.setStyle(element, originalStyles);

    return dimensions;
  }

  // Implementing a new method to avoid retesting the entire application with clientHeight
  function getDimensionsEx(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');
    if (display && display != 'none') { // Safari bug
      return {width: element.clientWidth, height: element.clientHeight};
    }
    return getDimensions(element);
  }

  function getOffsetParent(element) {
    element = $(element);

    if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
      return $(document.body);

    var isInline = (Element.getStyle(element, 'display') === 'inline');
    if (!isInline && element.offsetParent) return $(element.offsetParent);

    while ((element = element.parentNode) && element !== document.body) {
      if (Element.getStyle(element, 'position') !== 'static') {
        return isHtml(element) ? $(document.body) : $(element);
      }
    }

    return $(document.body);
  }


  function cumulativeOffset(element) {
    element = $(element);
    var valueT = 0, valueL = 0;
    if (element.parentNode) {
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);
    }
    return new Element.Offset(valueL, valueT);
  }

  function positionedOffset(element) {
    element = $(element);

    var layout = element.getLayout();

    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (isBody(element)) break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);

    valueL -= layout.get('margin-top');
    valueT -= layout.get('margin-left');

    return new Element.Offset(valueL, valueT);
  }

  function cumulativeScrollOffset(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return new Element.Offset(valueL, valueT);
  }

  function viewportOffset(forElement) {
    element = $(element);
    var valueT = 0, valueL = 0, docBody = document.body;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == docBody &&
        Element.getStyle(element, 'position') == 'absolute') break;
    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (element != docBody) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);
    return new Element.Offset(valueL, valueT);
  }

  function absolutize(element) {
    element = $(element);

    if (Element.getStyle(element, 'position') === 'absolute') {
      return element;
    }

    var offsetParent = getOffsetParent(element);
    var eOffset = element.viewportOffset(),
     pOffset = offsetParent.viewportOffset();

    var offset = eOffset.relativeTo(pOffset);
    var layout = element.getLayout();

    element.store('prototype_absolutize_original_styles', {
      left:   element.getStyle('left'),
      top:    element.getStyle('top'),
      width:  element.getStyle('width'),
      height: element.getStyle('height')
    });

    element.setStyle({
      position: 'absolute',
      top:    offset.top + 'px',
      left:   offset.left + 'px',
      width:  layout.get('width') + 'px',
      height: layout.get('height') + 'px'
    });

    return element;
  }

  function relativize(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') === 'relative') {
      return element;
    }

    var originalStyles =
     element.retrieve('prototype_absolutize_original_styles');

    if (originalStyles) element.setStyle(originalStyles);
    return element;
  }

  if (Prototype.Browser.IE) {
    getOffsetParent = getOffsetParent.wrap(
      function(proceed, element) {
        element = $(element);

        if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
          return $(document.body);

        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);

        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );

    positionedOffset = positionedOffset.wrap(function(proceed, element) {
      element = $(element);
      if (!element.parentNode) return new Element.Offset(0, 0);
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);

      var offsetParent = element.getOffsetParent();
      if (offsetParent && offsetParent.getStyle('position') === 'fixed')
        hasLayout(offsetParent);

      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    });
  } else if (Prototype.Browser.Webkit) {
    cumulativeOffset = function(element) {
      element = $(element);
      var valueT = 0, valueL = 0;
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        if (element.offsetParent == document.body)
          if (Element.getStyle(element, 'position') == 'absolute') break;

        element = element.offsetParent;
      } while (element);

      return new Element.Offset(valueL, valueT);
    };
  }


  Element.addMethods({
    getLayout:              getLayout,
    measure:                measure,
    getDimensions:          getDimensions,
    getDimensionsEx:        getDimensionsEx,
    getOffsetParent:        getOffsetParent,
    cumulativeOffset:       cumulativeOffset,
    positionedOffset:       positionedOffset,
    cumulativeScrollOffset: cumulativeScrollOffset,
    viewportOffset:         viewportOffset,
    absolutize:             absolutize,
    relativize:             relativize
  });

  function isBody(element) {
    return element.nodeName.toUpperCase() === 'BODY';
  }

  function isHtml(element) {
    return element.nodeName.toUpperCase() === 'HTML';
  }

  function isDocument(element) {
    return element.nodeType === Node.DOCUMENT_NODE;
  }

  function isDetached(element) {
    return element !== document.body &&
     !Element.descendantOf(element, document.body);
  }

  if ('getBoundingClientRect' in document.documentElement) {
    Element.addMethods({
      viewportOffset: function(element) {
        element = $(element);
        if (isDetached(element)) return new Element.Offset(0, 0);

        var rect = element.getBoundingClientRect(),
         docEl = document.documentElement;
        return new Element.Offset(rect.left - docEl.clientLeft,
         rect.top - docEl.clientTop);
      }
    });
  }
})();
window.$$ = function() {
  var expression = $A(arguments).join(', ');
  return Prototype.Selector.select(expression, document);
};

Prototype.Selector = (function() {

  function select() {
    throw new Error('Method "Prototype.Selector.select" must be defined.');
  }

  function match() {
    throw new Error('Method "Prototype.Selector.match" must be defined.');
  }

  function find(elements, expression, index) {
    index = index || 0;
    var match = Prototype.Selector.match, length = elements.length, matchIndex = 0, i;

    for (i = 0; i < length; i++) {
      if (match(elements[i], expression) && index == matchIndex++) {
        return Element.extend(elements[i]);
      }
    }
  }

  function extendElements(elements) {
    for (var i = 0, length = elements.length; i < length; i++) {
      Element.extend(elements[i]);
    }
    return elements;
  }


  var K = Prototype.K;

  return {
    select: select,
    match: match,
    find: find,
    extendElements: (Element.extend === K) ? K : extendElements,
    extendElement: Element.extend
  };
})();
Prototype._original_property = window.Sizzle;
/*!
 * Sizzle CSS Selector Engine - v1.0
 *  Copyright 2009, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
	done = 0,
	toString = Object.prototype.toString,
	hasDuplicate = false,
	baseHasDuplicate = true;

[0, 0].sort(function(){
	baseHasDuplicate = false;
	return 0;
});

var Sizzle = function(selector, context, results, seed) {
	results = results || [];
	var origContext = context = context || document;

	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	var parts = [], m, set, checkSet, check, mode, extra, prune = true, contextXML = isXML(context),
		soFar = selector;

	while ( (chunker.exec(""), m = chunker.exec(soFar)) !== null ) {
		soFar = m[3];

		parts.push( m[1] );

		if ( m[2] ) {
			extra = m[3];
			break;
		}
	}

	if ( parts.length > 1 && origPOS.exec( selector ) ) {
		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
			set = posProcess( parts[0] + parts[1], context );
		} else {
			set = Expr.relative[ parts[0] ] ?
				[ context ] :
				Sizzle( parts.shift(), context );

			while ( parts.length ) {
				selector = parts.shift();

				if ( Expr.relative[ selector ] )
					selector += parts.shift();

				set = posProcess( selector, set );
			}
		}
	} else {
		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {
			var ret = Sizzle.find( parts.shift(), context, contextXML );
			context = ret.expr ? Sizzle.filter( ret.expr, ret.set )[0] : ret.set[0];
		}

		if ( context ) {
			var ret = seed ?
				{ expr: parts.pop(), set: makeArray(seed) } :
				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );
			set = ret.expr ? Sizzle.filter( ret.expr, ret.set ) : ret.set;

			if ( parts.length > 0 ) {
				checkSet = makeArray(set);
			} else {
				prune = false;
			}

			while ( parts.length ) {
				var cur = parts.pop(), pop = cur;

				if ( !Expr.relative[ cur ] ) {
					cur = "";
				} else {
					pop = parts.pop();
				}

				if ( pop == null ) {
					pop = context;
				}

				Expr.relative[ cur ]( checkSet, pop, contextXML );
			}
		} else {
			checkSet = parts = [];
		}
	}

	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		throw "Syntax error, unrecognized expression: " + (cur || selector);
	}

	if ( toString.call(checkSet) === "[object Array]" ) {
		if ( !prune ) {
			results.push.apply( results, checkSet );
		} else if ( context && context.nodeType === 1 ) {
			for ( var i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && contains(context, checkSet[i])) ) {
					results.push( set[i] );
				}
			}
		} else {
			for ( var i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
					results.push( set[i] );
				}
			}
		}
	} else {
		makeArray( checkSet, results );
	}

	if ( extra ) {
		Sizzle( extra, origContext, results, seed );
		Sizzle.uniqueSort( results );
	}

	return results;
};

Sizzle.uniqueSort = function(results){
	if ( sortOrder ) {
		hasDuplicate = baseHasDuplicate;
		results.sort(sortOrder);

		if ( hasDuplicate ) {
			for ( var i = 1; i < results.length; i++ ) {
				if ( results[i] === results[i-1] ) {
					results.splice(i--, 1);
				}
			}
		}
	}

	return results;
};

Sizzle.matches = function(expr, set){
	return Sizzle(expr, null, null, set);
};

Sizzle.find = function(expr, context, isXML){
	var set, match;

	if ( !expr ) {
		return [];
	}

	for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
		var type = Expr.order[i], match;

		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
			var left = match[1];
			match.splice(1,1);

			if ( left.substr( left.length - 1 ) !== "\\" ) {
				match[1] = (match[1] || "").replace(/\\/g, "");
				set = Expr.find[ type ]( match, context, isXML );
				if ( set != null ) {
					expr = expr.replace( Expr.match[ type ], "" );
					break;
				}
			}
		}
	}

	if ( !set ) {
		set = context.getElementsByTagName("*");
	}

	return {set: set, expr: expr};
};

Sizzle.filter = function(expr, set, inplace, not){
	var old = expr, result = [], curLoop = set, match, anyFound,
		isXMLFilter = set && set[0] && isXML(set[0]);

	while ( expr && set.length ) {
		for ( var type in Expr.filter ) {
			if ( (match = Expr.match[ type ].exec( expr )) != null ) {
				var filter = Expr.filter[ type ], found, item;
				anyFound = false;

				if ( curLoop == result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

					if ( !match ) {
						anyFound = found = true;
					} else if ( match === true ) {
						continue;
					}
				}

				if ( match ) {
					for ( var i = 0; (item = curLoop[i]) != null; i++ ) {
						if ( item ) {
							found = filter( item, match, i, curLoop );
							var pass = not ^ !!found;

							if ( inplace && found != null ) {
								if ( pass ) {
									anyFound = true;
								} else {
									curLoop[i] = false;
								}
							} else if ( pass ) {
								result.push( item );
								anyFound = true;
							}
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}

		if ( expr == old ) {
			if ( anyFound == null ) {
				throw "Syntax error, unrecognized expression: " + expr;
			} else {
				break;
			}
		}

		old = expr;
	}

	return curLoop;
};

var Expr = Sizzle.selectors = {
	order: [ "ID", "NAME", "TAG" ],
	match: {
		ID: /#((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
		CLASS: /\.((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF-]|\\.)+)['"]*\]/,
		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,
		TAG: /^((?:[\w\u00c0-\uFFFF\*-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,
		PSEUDO: /:((?:[\w\u00c0-\uFFFF-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/
	},
	leftMatch: {},
	attrMap: {
		"class": "className",
		"for": "htmlFor"
	},
	attrHandle: {
		href: function(elem){
			return elem.getAttribute("href");
		}
	},
	relative: {
		"+": function(checkSet, part, isXML){
			var isPartStr = typeof part === "string",
				isTag = isPartStr && !/\W/.test(part),
				isPartStrNotTag = isPartStr && !isTag;

			if ( isTag && !isXML ) {
				part = part.toUpperCase();
			}

			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
				if ( (elem = checkSet[i]) ) {
					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

					checkSet[i] = isPartStrNotTag || elem && elem.nodeName === part ?
						elem || false :
						elem === part;
				}
			}

			if ( isPartStrNotTag ) {
				Sizzle.filter( part, checkSet, true );
			}
		},
		">": function(checkSet, part, isXML){
			var isPartStr = typeof part === "string";

			if ( isPartStr && !/\W/.test(part) ) {
				part = isXML ? part : part.toUpperCase();

				for ( var i = 0, l = checkSet.length; i < l; i++ ) {
					var elem = checkSet[i];
					if ( elem ) {
						var parent = elem.parentNode;
						checkSet[i] = parent.nodeName === part ? parent : false;
					}
				}
			} else {
				for ( var i = 0, l = checkSet.length; i < l; i++ ) {
					var elem = checkSet[i];
					if ( elem ) {
						checkSet[i] = isPartStr ?
							elem.parentNode :
							elem.parentNode === part;
					}
				}

				if ( isPartStr ) {
					Sizzle.filter( part, checkSet, true );
				}
			}
		},
		"": function(checkSet, part, isXML){
			var doneName = done++, checkFn = dirCheck;

			if ( !/\W/.test(part) ) {
				var nodeCheck = part = isXML ? part : part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			checkFn("parentNode", part, doneName, checkSet, nodeCheck, isXML);
		},
		"~": function(checkSet, part, isXML){
			var doneName = done++, checkFn = dirCheck;

			if ( typeof part === "string" && !/\W/.test(part) ) {
				var nodeCheck = part = isXML ? part : part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			checkFn("previousSibling", part, doneName, checkSet, nodeCheck, isXML);
		}
	},
	find: {
		ID: function(match, context, isXML){
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				return m ? [m] : [];
			}
		},
		NAME: function(match, context, isXML){
			if ( typeof context.getElementsByName !== "undefined" ) {
				var ret = [], results = context.getElementsByName(match[1]);

				for ( var i = 0, l = results.length; i < l; i++ ) {
					if ( results[i].getAttribute("name") === match[1] ) {
						ret.push( results[i] );
					}
				}

				return ret.length === 0 ? null : ret;
			}
		},
		TAG: function(match, context){
			return context.getElementsByTagName(match[1]);
		}
	},
	preFilter: {
		CLASS: function(match, curLoop, inplace, result, not, isXML){
			match = " " + match[1].replace(/\\/g, "") + " ";

			if ( isXML ) {
				return match;
			}

			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
				if ( elem ) {
					if ( not ^ (elem.className && (" " + elem.className + " ").indexOf(match) >= 0) ) {
						if ( !inplace )
							result.push( elem );
					} else if ( inplace ) {
						curLoop[i] = false;
					}
				}
			}

			return false;
		},
		ID: function(match){
			return match[1].replace(/\\/g, "");
		},
		TAG: function(match, curLoop){
			for ( var i = 0; curLoop[i] === false; i++ ){}
			return curLoop[i] && isXML(curLoop[i]) ? match[1] : match[1].toUpperCase();
		},
		CHILD: function(match){
			if ( match[1] == "nth" ) {
				var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(
					match[2] == "even" && "2n" || match[2] == "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}

			match[0] = done++;

			return match;
		},
		ATTR: function(match, curLoop, inplace, result, not, isXML){
			var name = match[1].replace(/\\/g, "");

			if ( !isXML && Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			if ( match[2] === "~=" ) {
				match[4] = " " + match[4] + " ";
			}

			return match;
		},
		PSEUDO: function(match, curLoop, inplace, result, not){
			if ( match[1] === "not" ) {
				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
					match[3] = Sizzle(match[3], null, null, curLoop);
				} else {
					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);
					if ( !inplace ) {
						result.push.apply( result, ret );
					}
					return false;
				}
			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
				return true;
			}

			return match;
		},
		POS: function(match){
			match.unshift( true );
			return match;
		}
	},
	filters: {
		enabled: function(elem){
			return elem.disabled === false && elem.type !== "hidden";
		},
		disabled: function(elem){
			return elem.disabled === true;
		},
		checked: function(elem){
			return elem.checked === true;
		},
		selected: function(elem){
			elem.parentNode.selectedIndex;
			return elem.selected === true;
		},
		parent: function(elem){
			return !!elem.firstChild;
		},
		empty: function(elem){
			return !elem.firstChild;
		},
		has: function(elem, i, match){
			return !!Sizzle( match[3], elem ).length;
		},
		header: function(elem){
			return /h\d/i.test( elem.nodeName );
		},
		text: function(elem){
			return "text" === elem.type;
		},
		radio: function(elem){
			return "radio" === elem.type;
		},
		checkbox: function(elem){
			return "checkbox" === elem.type;
		},
		file: function(elem){
			return "file" === elem.type;
		},
		password: function(elem){
			return "password" === elem.type;
		},
		submit: function(elem){
			return "submit" === elem.type;
		},
		image: function(elem){
			return "image" === elem.type;
		},
		reset: function(elem){
			return "reset" === elem.type;
		},
		button: function(elem){
			return "button" === elem.type || elem.nodeName.toUpperCase() === "BUTTON";
		},
		input: function(elem){
			return /input|select|textarea|button/i.test(elem.nodeName);
		}
	},
	setFilters: {
		first: function(elem, i){
			return i === 0;
		},
		last: function(elem, i, match, array){
			return i === array.length - 1;
		},
		even: function(elem, i){
			return i % 2 === 0;
		},
		odd: function(elem, i){
			return i % 2 === 1;
		},
		lt: function(elem, i, match){
			return i < match[3] - 0;
		},
		gt: function(elem, i, match){
			return i > match[3] - 0;
		},
		nth: function(elem, i, match){
			return match[3] - 0 == i;
		},
		eq: function(elem, i, match){
			return match[3] - 0 == i;
		}
	},
	filter: {
		PSEUDO: function(elem, match, i, array){
			var name = match[1], filter = Expr.filters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			} else if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || "").indexOf(match[3]) >= 0;
			} else if ( name === "not" ) {
				var not = match[3];

				for ( var i = 0, l = not.length; i < l; i++ ) {
					if ( not[i] === elem ) {
						return false;
					}
				}

				return true;
			}
		},
		CHILD: function(elem, match){
			var type = match[1], node = elem;
			switch (type) {
				case 'only':
				case 'first':
					while ( (node = node.previousSibling) )  {
						if ( node.nodeType === 1 ) return false;
					}
					if ( type == 'first') return true;
					node = elem;
				case 'last':
					while ( (node = node.nextSibling) )  {
						if ( node.nodeType === 1 ) return false;
					}
					return true;
				case 'nth':
					var first = match[2], last = match[3];

					if ( first == 1 && last == 0 ) {
						return true;
					}

					var doneName = match[0],
						parent = elem.parentNode;

					if ( parent && (parent.sizcache !== doneName || !elem.nodeIndex) ) {
						var count = 0;
						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.nodeIndex = ++count;
							}
						}
						parent.sizcache = doneName;
					}

					var diff = elem.nodeIndex - last;
					if ( first == 0 ) {
						return diff == 0;
					} else {
						return ( diff % first == 0 && diff / first >= 0 );
					}
			}
		},
		ID: function(elem, match){
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},
		TAG: function(elem, match){
			return (match === "*" && elem.nodeType === 1) || elem.nodeName === match;
		},
		CLASS: function(elem, match){
			return (" " + (elem.className || elem.getAttribute("class")) + " ")
				.indexOf( match ) > -1;
		},
		ATTR: function(elem, match){
			var name = match[1],
				result = Expr.attrHandle[ name ] ?
					Expr.attrHandle[ name ]( elem ) :
					elem[ name ] != null ?
						elem[ name ] :
						elem.getAttribute( name ),
				value = result + "",
				type = match[2],
				check = match[4];

			return result == null ?
				type === "!=" :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf(check) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf(check) >= 0 :
				!check ?
				value && result !== false :
				type === "!=" ?
				value != check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				type === "|=" ?
				value === check || value.substr(0, check.length + 1) === check + "-" :
				false;
		},
		POS: function(elem, match, i, array){
			var name = match[2], filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

var origPOS = Expr.match.POS;

for ( var type in Expr.match ) {
	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + /(?![^\[]*\])(?![^\(]*\))/.source );
	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source );
}

var makeArray = function(array, results) {
	array = Array.prototype.slice.call( array, 0 );

	if ( results ) {
		results.push.apply( results, array );
		return results;
	}

	return array;
};

try {
	Array.prototype.slice.call( document.documentElement.childNodes, 0 );

} catch(e){
	makeArray = function(array, results) {
		var ret = results || [];

		if ( toString.call(array) === "[object Array]" ) {
			Array.prototype.push.apply( ret, array );
		} else {
			if ( typeof array.length === "number" ) {
				for ( var i = 0, l = array.length; i < l; i++ ) {
					ret.push( array[i] );
				}
			} else {
				for ( var i = 0; array[i]; i++ ) {
					ret.push( array[i] );
				}
			}
		}

		return ret;
	};
}

var sortOrder;

if ( document.documentElement.compareDocumentPosition ) {
	sortOrder = function( a, b ) {
		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
} else if ( "sourceIndex" in document.documentElement ) {
	sortOrder = function( a, b ) {
		if ( !a.sourceIndex || !b.sourceIndex ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var ret = a.sourceIndex - b.sourceIndex;
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
} else if ( document.createRange ) {
	sortOrder = function( a, b ) {
		if ( !a.ownerDocument || !b.ownerDocument ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		var ret = aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
}

(function(){
	var form = document.createElement("div"),
		id = "script" + (new Date).getTime();
	form.innerHTML = "<a name='" + id + "'/>";

	var root = document.documentElement;
	root.insertBefore( form, root.firstChild );

	if ( !!document.getElementById( id ) ) {
		Expr.find.ID = function(match, context, isXML){
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				return m ? m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
			}
		};

		Expr.filter.ID = function(elem, match){
			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
			return elem.nodeType === 1 && node && node.nodeValue === match;
		};
	}

	root.removeChild( form );
	root = form = null; // release memory in IE
})();

(function(){

	var div = document.createElement("div");
	div.appendChild( document.createComment("") );

	if ( div.getElementsByTagName("*").length > 0 ) {
		Expr.find.TAG = function(match, context){
			var results = context.getElementsByTagName(match[1]);

			if ( match[1] === "*" ) {
				var tmp = [];

				for ( var i = 0; results[i]; i++ ) {
					if ( results[i].nodeType === 1 ) {
						tmp.push( results[i] );
					}
				}

				results = tmp;
			}

			return results;
		};
	}

	div.innerHTML = "<a href='#'></a>";
	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
			div.firstChild.getAttribute("href") !== "#" ) {
		Expr.attrHandle.href = function(elem){
			return elem.getAttribute("href", 2);
		};
	}

	div = null; // release memory in IE
})();

if ( document.querySelectorAll ) (function(){
	var oldSizzle = Sizzle, div = document.createElement("div");
	div.innerHTML = "<p class='TEST'></p>";

	if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
		return;
	}

	Sizzle = function(query, context, extra, seed){
		context = context || document;

		if ( !seed && context.nodeType === 9 && !isXML(context) ) {
			try {
				return makeArray( context.querySelectorAll(query), extra );
			} catch(e){}
		}

		return oldSizzle(query, context, extra, seed);
	};

	for ( var prop in oldSizzle ) {
		Sizzle[ prop ] = oldSizzle[ prop ];
	}

	div = null; // release memory in IE
})();

if ( document.getElementsByClassName && document.documentElement.getElementsByClassName ) (function(){
	var div = document.createElement("div");
	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

	if ( div.getElementsByClassName("e").length === 0 )
		return;

	div.lastChild.className = "e";

	if ( div.getElementsByClassName("e").length === 1 )
		return;

	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function(match, context, isXML) {
		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
			return context.getElementsByClassName(match[1]);
		}
	};

	div = null; // release memory in IE
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	var sibDir = dir == "previousSibling" && !isXML;
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];
		if ( elem ) {
			if ( sibDir && elem.nodeType === 1 ){
				elem.sizcache = doneName;
				elem.sizset = i;
			}
			elem = elem[dir];
			var match = false;

			while ( elem ) {
				if ( elem.sizcache === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 && !isXML ){
					elem.sizcache = doneName;
					elem.sizset = i;
				}

				if ( elem.nodeName === cur ) {
					match = elem;
					break;
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	var sibDir = dir == "previousSibling" && !isXML;
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];
		if ( elem ) {
			if ( sibDir && elem.nodeType === 1 ) {
				elem.sizcache = doneName;
				elem.sizset = i;
			}
			elem = elem[dir];
			var match = false;

			while ( elem ) {
				if ( elem.sizcache === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 ) {
					if ( !isXML ) {
						elem.sizcache = doneName;
						elem.sizset = i;
					}
					if ( typeof cur !== "string" ) {
						if ( elem === cur ) {
							match = true;
							break;
						}

					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
						match = elem;
						break;
					}
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

var contains = document.compareDocumentPosition ?  function(a, b){
	return a.compareDocumentPosition(b) & 16;
} : function(a, b){
	return a !== b && (a.contains ? a.contains(b) : true);
};

var isXML = function(elem){
	return elem.nodeType === 9 && elem.documentElement.nodeName !== "HTML" ||
		!!elem.ownerDocument && elem.ownerDocument.documentElement.nodeName !== "HTML";
};

var posProcess = function(selector, context){
	var tmpSet = [], later = "", match,
		root = context.nodeType ? [context] : context;

	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
		later += match[0];
		selector = selector.replace( Expr.match.PSEUDO, "" );
	}

	selector = Expr.relative[selector] ? selector + "*" : selector;

	for ( var i = 0, l = root.length; i < l; i++ ) {
		Sizzle( selector, root[i], tmpSet );
	}

	return Sizzle.filter( later, tmpSet );
};


window.Sizzle = Sizzle;

})();

;(function(engine) {
  var extendElements = Prototype.Selector.extendElements;

  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }

  function match(element, selector) {
    return engine.matches(selector, [element]).length == 1;
  }

  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = match;
})(Sizzle);

window.Sizzle = Prototype._original_property;
delete Prototype._original_property;

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit, accumulator, initial;

    if (options.hash) {
      initial = {};
      accumulator = function(result, key, value) {
        if (key in result) {
          if (!Object.isArray(result[key])) result[key] = [result[key]];
          result[key].push(value);
        } else result[key] = value;
        return result;
      };
    } else {
      initial = '';
      accumulator = function(result, key, value) {
        return result + (result ? '&' : '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
      }
    }

    return elements.inject(initial, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          result = accumulator(result, key, value);
        }
      }
      return result;
    });
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*'),
        element,
        arr = [ ],
        serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      arr.push(element);
    }
    return arr.inject([], function(elements, child) {
      if (serializers[child.tagName.toLowerCase()])
        elements.push(Element.extend(child));
      return elements;
    })
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return /^(?:input|select|textarea)$/i.test(element.tagName);
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    var element = form.findFirstElement();
    if (element) element.activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.getAttribute('method');

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !(/^(?:button|reset|submit)$/i.test(element.type))))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = (function() {
  function input(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return inputSelector(element, value);
      default:
        return valueSelector(element, value);
    }
  }

  function inputSelector(element, value) {
    if (Object.isUndefined(value))
      return element.checked ? element.value : null;
    else element.checked = !!value;
  }

  function valueSelector(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  }

  function select(element, value) {
    if (Object.isUndefined(value))
      return (element.type === 'select-one' ? selectOne : selectMany)(element);

    var opt, currentValue, single = !Object.isArray(value);
    for (var i = 0, length = element.length; i < length; i++) {
      opt = element.options[i];
      currentValue = this.optionValue(opt);
      if (single) {
        if (currentValue == value) {
          opt.selected = true;
          return;
        }
      }
      else opt.selected = value.include(currentValue);
    }
  }

  function selectOne(element) {
    var index = element.selectedIndex;
    return index >= 0 ? optionValue(element.options[index]) : null;
  }

  function selectMany(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(optionValue(opt));
    }
    return values;
  }

  function optionValue(opt) {
    return Element.hasAttribute(opt, 'value') ? opt.value : opt.text;
  }

  return {
    input:         input,
    inputSelector: inputSelector,
    textarea:      valueSelector,
    select:        select,
    selectOne:     selectOne,
    selectMany:    selectMany,
    optionValue:   optionValue,
    button:        valueSelector
  };
})();

/*--------------------------------------------------------------------------*/


Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
(function() {

  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45,

    cache: {}
  };

  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
    && 'onmouseleave' in docEl;



  var isIELegacyEvent = function(event) { return false; };

  if (window.attachEvent) {
    if (window.addEventListener) {
      isIELegacyEvent = function(event) {
        return !(event instanceof window.Event);
      };
    } else {
      isIELegacyEvent = function(event) { return true; };
    }
  }

  var _isButton;

  function _isButtonForDOMEvents(event, code) {
    return event.which ? (event.which === code + 1) : (event.button === code);
  }

  var legacyButtonMap = { 0: 1, 1: 4, 2: 2 };
  function _isButtonForLegacyEvents(event, code) {
    return event.button === legacyButtonMap[code];
  }

  function _isButtonForWebKit(event, code) {
    switch (code) {
      case 0: return event.which == 1 && !event.metaKey;
      case 1: return event.which == 2 || (event.which == 1 && event.metaKey);
      case 2: return event.which == 3;
      default: return false;
    }
  }

  if (window.attachEvent) {
    if (!window.addEventListener) {
      _isButton = _isButtonForLegacyEvents;
    } else {
      _isButton = function(event, code) {
        return isIELegacyEvent(event) ? _isButtonForLegacyEvents(event, code) :
         _isButtonForDOMEvents(event, code);
      }
    }
  } else if (Prototype.Browser.WebKit) {
    _isButton = _isButtonForWebKit;
  } else {
    _isButton = _isButtonForDOMEvents;
  }

  function isLeftClick(event)   { return _isButton(event, 0) }

  function isMiddleClick(event) { return _isButton(event, 1) }

  function isRightClick(event)  { return _isButton(event, 2) }

  function element(event) {
    event = Event.extend(event);

    var node = event.target, type = event.type,
     currentTarget = event.currentTarget;

    if (currentTarget && currentTarget.tagName) {
      if (type === 'load' || type === 'error' ||
        (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
          && currentTarget.type === 'radio'))
            node = currentTarget;
    }

    if (node.nodeType == Node.TEXT_NODE)
      node = node.parentNode;

    return Element.extend(node);
  }

  function findElement(event, expression) {
    var element = Event.element(event);

    if (!expression) return element;
    while (element) {
      if (Object.isElement(element) && Prototype.Selector.match(element, expression)) {
        return Element.extend(element);
      }
      element = element.parentNode;
    }
  }

  function pointer(event) {
    return { x: pointerX(event), y: pointerY(event) };
  }

  function pointerX(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollLeft: 0 };

    return event.pageX || (event.clientX +
      (docElement.scrollLeft || body.scrollLeft) -
      (docElement.clientLeft || 0));
  }

  function pointerY(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollTop: 0 };

    return  event.pageY || (event.clientY +
       (docElement.scrollTop || body.scrollTop) -
       (docElement.clientTop || 0));
  }


  function stop(event) {
    Event.extend(event);
    event.preventDefault();
    event.stopPropagation();

    event.stopped = true;
  }


  Event.Methods = {
    isLeftClick:   isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick:  isRightClick,

    element:     element,
    findElement: findElement,

    pointer:  pointer,
    pointerX: pointerX,
    pointerY: pointerY,

    stop: stop
  };

  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (window.attachEvent) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
        case 'mouseover':
        case 'mouseenter':
          element = event.fromElement;
          break;
        case 'mouseout':
        case 'mouseleave':
          element = event.toElement;
          break;
        default:
          return null;
      }
      return Element.extend(element);
    }

    var additionalMethods = {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return '[object Event]' }
    };

    Event.extend = function(event, element) {
      if (!event) return false;

      if (!isIELegacyEvent(event)) return event;

      if (event._extendedByPrototype) return event;
      event._extendedByPrototype = Prototype.emptyFunction;

      var pointer = Event.pointer(event);

      Object.extend(event, {
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });

      Object.extend(event, methods);
      Object.extend(event, additionalMethods);

      return event;
    };
  } else {
    Event.extend = Prototype.K;
  }

  if (window.addEventListener) {
    Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
    Object.extend(Event.prototype, methods);
  }

  function _createResponder(element, eventName, handler) {
    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) {
      CACHE.push(element);
      registry = Element.retrieve(element, 'prototype_event_registry', $H());
    }

    var respondersForEvent = registry.get(eventName);
    if (Object.isUndefined(respondersForEvent)) {
      respondersForEvent = [];
      registry.set(eventName, respondersForEvent);
    }

    if (respondersForEvent.pluck('handler').include(handler)) return false;

    var responder;
    if (eventName.include(":")) {
      responder = function(event) {
        if (Object.isUndefined(event.eventName))
          return false;

        if (event.eventName !== eventName)
          return false;

        Event.extend(event, element);
        handler.call(element, event);
      };
    } else {
      if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
       (eventName === "mouseenter" || eventName === "mouseleave")) {
        if (eventName === "mouseenter" || eventName === "mouseleave") {
          responder = function(event) {
            Event.extend(event, element);

            var parent = event.relatedTarget;
            while (parent && parent !== element) {
              try { parent = parent.parentNode; }
              catch(e) { parent = element; }
            }

            if (parent === element) return;

            handler.call(element, event);
          };
        }
      } else {
        if (eventName === "beforeunload")
        {
          responder = function(event) {
            Event.extend(event, element);
            return handler.call(element, event);
          };
        }
        else
        {
          responder = function(event) {
            Event.extend(event, element);
            handler.call(element, event);
          };
        }
      }
    }

    responder.handler = handler;
    respondersForEvent.push(responder);
    return responder;
  }

  function _destroyCache() {
    for (var i = 0, length = CACHE.length; i < length; i++) {
      Event.stopObserving(CACHE[i]);
      CACHE[i] = null;
    }
  }

  var CACHE = [];

  if (Prototype.Browser.IE)
    window.attachEvent('onunload', _destroyCache);

  if (Prototype.Browser.WebKit)
    window.addEventListener('unload', Prototype.emptyFunction, false);


  var _getDOMEventName = Prototype.K,
      translations = { mouseenter: "mouseover", mouseleave: "mouseout" };

  if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED) {
    _getDOMEventName = function(eventName) {
      return (translations[eventName] || eventName);
    };
  }

  function observe(element, eventName, handler) {
    element = $(element);

    var responder = _createResponder(element, eventName, handler);

    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.addEventListener)
        element.addEventListener("dataavailable", responder, false);
      else {
        element.attachEvent("ondataavailable", responder);
        element.attachEvent("onlosecapture", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);

      if (element.addEventListener)
        element.addEventListener(actualEventName, responder, false);
      else
        element.attachEvent("on" + actualEventName, responder);
    }

    return element;
  }

  function stopObserving(element, eventName, handler) {
    element = $(element);

    var registry = Element.retrieve(element, 'prototype_event_registry');
    if (!registry) return element;

    if (!eventName) {
      registry.each( function(pair) {
        var eventName = pair.key;
        stopObserving(element, eventName);
      });
      return element;
    }

    var responders = registry.get(eventName);
    if (!responders) return element;

    if (!handler) {
      responders.each(function(r) {
        stopObserving(element, eventName, r.handler);
      });
      return element;
    }

    var i = responders.length, responder;
    while (i--) {
      if (responders[i].handler === handler) {
        responder = responders[i];
        break;
      }
    }
    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.removeEventListener)
        element.removeEventListener("dataavailable", responder, false);
      else {
        element.detachEvent("ondataavailable", responder);
        element.detachEvent("onlosecapture", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);
      if (element.removeEventListener)
        element.removeEventListener(actualEventName, responder, false);
      else
        element.detachEvent('on' + actualEventName, responder);
    }

    registry.set(eventName, responders.without(responder));

    return element;
  }

  function fire(element, eventName, memo, bubble) {
    element = $(element);

    if (Object.isUndefined(bubble))
      bubble = true;

    if (element == document && document.createEvent && !element.dispatchEvent)
      element = document.documentElement;

    var event;
    if (document.createEvent) {
      event = document.createEvent('HTMLEvents');
      event.initEvent('dataavailable', bubble, true);
    } else {
      event = document.createEventObject();
      event.eventType = bubble ? 'ondataavailable' : 'onlosecapture';
    }

    event.eventName = eventName;
    event.memo = memo || { };

    if (document.createEvent)
      element.dispatchEvent(event);
    else
      element.fireEvent(event.eventType, event);

    return Event.extend(event);
  }

  Event.Handler = Class.create({
    initialize: function(element, eventName, selector, callback) {
      this.element   = $(element);
      this.eventName = eventName;
      this.selector  = selector;
      this.callback  = callback;
      this.handler   = this.handleEvent.bind(this);
    },

    start: function() {
      Event.observe(this.element, this.eventName, this.handler);
      return this;
    },

    stop: function() {
      Event.stopObserving(this.element, this.eventName, this.handler);
      return this;
    },

    handleEvent: function(event) {
      var element = Event.findElement(event, this.selector);
      if (element) this.callback.call(this.element, event, element);
    }
  });

  function on(element, eventName, selector, callback) {
    element = $(element);
    if (Object.isFunction(selector) && Object.isUndefined(callback)) {
      callback = selector, selector = null;
    }

    return new Event.Handler(element, eventName, selector, callback).start();
  }

  Object.extend(Event, Event.Methods);

  Object.extend(Event, {
    fire:          fire,
    observe:       observe,
    stopObserving: stopObserving,
    on:            on
  });

  Element.addMethods({
    fire:          fire,

    observe:       observe,

    stopObserving: stopObserving,

    on:            on
  });

  Object.extend(document, {
    fire:          fire.methodize(),

    observe:       observe.methodize(),

    stopObserving: stopObserving.methodize(),

    on:            on.methodize(),

    loaded:        false
  });

  if (window.Event) Object.extend(window.Event, Event);
  else window.Event = Event;
})();

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearTimeout(timer);
    document.loaded = true;
    document.fire('dom:loaded');
  }

  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.stopObserving('readystatechange', checkReadyState);
      fireContentLoadedEvent();
    }
  }

  function pollDoScroll() {
    try { document.documentElement.doScroll('left'); }
    catch(e) {
      timer = pollDoScroll.defer();
      return;
    }
    fireContentLoadedEvent();
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
  } else {
    document.observe('readystatechange', checkReadyState);
    if (window == top)
      timer = pollDoScroll.defer();
  }

  Event.observe(window, 'load', fireContentLoadedEvent);
})();

Element.addMethods();

/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Position = {
  includeScrollOffsets: false,

  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },


  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  var _getElementsByClassName = instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return _getElementsByClassName( parentElement || document.body, className );
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

(function() {
  window.Selector = Class.create({
    initialize: function(expression) {
      this.expression = expression.strip();
    },

    findElements: function(rootElement) {
      return Prototype.Selector.select(this.expression, rootElement);
    },

    match: function(element) {
      return Prototype.Selector.match(element, this.expression);
    },

    toString: function() {
      return this.expression;
    },

    inspect: function() {
      return "#<Selector: " + this.expression + ">";
    }
  });

  Object.extend(Selector, {
    matchElements: function(elements, expression) {
      var match = Prototype.Selector.match,
          results = [];

      for (var i = 0, length = elements.length; i < length; i++) {
        var element = elements[i];
        if (match(element, expression)) {
          results.push(Element.extend(element));
        }
      }
      return results;
    },

    findElement: function(elements, expression, index) {
      index = index || 0;
      var matchIndex = 0, element;
      for (var i = 0, length = elements.length; i < length; i++) {
        element = elements[i];
        if (Prototype.Selector.match(element, expression) && index === matchIndex++) {
          return Element.extend(element);
        }
      }
    },

    findChildElements: function(element, expressions) {
      var selector = expressions.toArray().join(', ');
      return Prototype.Selector.select(selector, element || document);
    }
  });
})();
/*
*
* Copyright (c) 2007 Andrew Tetlaw
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use, copy,
* modify, merge, publish, distribute, sublicense, and/or sell copies
* of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
* BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
* ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
* *
*
*
* FastInit
* http://tetlaw.id.au/view/javascript/fastinit
* Andrew Tetlaw
* Version 1.4.1 (2007-03-15)
* Based on:
* http://dean.edwards.name/weblog/2006/03/faster
* http://dean.edwards.name/weblog/2006/06/again/
* Help from:
* http://www.cherny.com/webdev/26/domloaded-object-literal-updated
*
*/
var FastInit = {
  onload : function() {
    if (FastInit.done) { return; }
    FastInit.done = true;
    for(var x = 0, al = FastInit.f.length; x < al; x++) {
      FastInit.f[x]();
    }
    // check for doubleSubmit only if validateForm.js is included in the page and thus nameSpace 'doubleSubmit' is defined
    if(typeof window.doubleSubmit !== "undefined")
    {
      for ( i = 0; i < window.document.forms.length; i++ )
      {
        // Below is necessary to make use of both form.onsubmit validations on individual pages
        // and form submit event handlers registered through Event.observe(..."submit"...)
        var originalFormOnSubmit = null;
        if(window.document.forms[i].onsubmit)
        {
          originalFormOnSubmit = window.document.forms[i].onsubmit;
          window.document.forms[i].onsubmit = function() {
            return;
          };
        }
        // Form.submit() doesn't call form submit event handlers registered below, so we have to make
        // sure form submit event handlers get called when form.submit() is used to submit the form
        // Note : Browser does not trigger the onsubmit event if you call the submit method of a form
        // programmatically. Likewise, we don't call form.onsubmit() here and that validation if wanted
        // is up to the developer to do before calling form.submit()
        window.document.forms[i].originalFormSubmit = window.document.forms[i].submit;
        window.document.forms[i].submit = function() {
          if(doubleSubmit.handleFormSubmitEvents( null, this, null ) == false)
          {
            return false;
          }
          return this.originalFormSubmit();
        };
        Event.observe( window.document.forms[i], "submit", doubleSubmit.handleFormSubmitEvents
            .bindAsEventListener( this, window.document.forms[i], originalFormOnSubmit ) );
      }
    }
  },
  addOnLoad : function() {
    var a = arguments;
    for(var x = 0, al = a.length; x < al; x++) {
      if(typeof a[x] === 'function') {
        if (FastInit.done ) {
          a[x]();
        } else {
          FastInit.f.push(a[x]);
        }
      }
    }
  },
  listen : function() {
    if (/WebKit|khtml/i.test(navigator.userAgent)) {
      FastInit.timer = setInterval(function() {
        if (/loaded|complete/.test(document.readyState)) {
          clearInterval(FastInit.timer);
          delete FastInit.timer;
          FastInit.onload();
        }}, 10);
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', FastInit.onload, false);
    } else if(!FastInit.iew32) {
      if(window.addEventListener) {
        window.addEventListener('load', FastInit.onload, false);
      } else if (window.attachEvent) {
        return window.attachEvent('onload', FastInit.onload);
      }
    }
  },
  f:[],done:false,timer:null,iew32:false
};
/*@cc_on @*/
/*@if (@_win32)
FastInit.iew32 = true;
document.write('<script id="__ie_onload" defer src="' + ((location.protocol == 'https:') ? '//0' : 'javascript:void(0)') + '"><\/script>');
document.getElementById('__ie_onload').onreadystatechange = function(){if (this.readyState == 'complete') { FastInit.onload(); }};
/*@end @*/
FastInit.listen();
/**
 * Only include the contents of this file once - for example, if this is included in a lightbox we don't want to re-run
 * all of this - just use the loaded version.  (i.e. rerunning would clear page.bundle which would remove all the
 * language strings for the current page)
 */
if (!window.page)
{
var page = {};

page.isLoaded = false;

/**
 * Utility for adding and using localized messages on the page.
 */
page.bundle = {};
page.bundle.messages = {};
page.bundle.addKey = function( key, value )
{
  page.bundle.messages[key] = value;
};

page.bundle.getString = function( key /*, arg1, arg2, ..., argN */ )
{
  var result = page.bundle.messages[key];
  if ( !result )
  {
     return "!!!!" + key + "!!!!!";
  }
  else
  {
    if ( arguments.length > 1 )
    {
      for ( var i = 1; i < arguments.length; i++ )
      {
        result = result.replace( new RegExp("\\{"+(i-1)+"\\}","g"), arguments[i] );
      }
    }
    return result;
  }
};

/**
 * Provides support for lazy initialization of javascript behavior when a certain
 * event happens to a certain item.
 */
page.LazyInit = function( event, eventTypes, initCode )
{
  var e = event || window.event;
  var target = Event.element( event );
  // This is because events bubble and we want a reference
  // to the element we registered the handlers on.
  target = page.util.upToClass(target, "jsInit");
  for (var i = 0; i < eventTypes.length; i++ )
  {
    target['on'+eventTypes[i]] = null;
  }
  eval( initCode ); //initCode can reference "target"
};

/**
 * Evaluates any <script> tags in the provided string in the global scope.
 * Useful for evaluating scripts that come back in text from an Ajax call.
 * If signalObject is passed then signalObject.evaluatingScripts will be set to false when done.
 */
page.globalEvalScripts = function(str, evalExternalScripts, signalObject)
{
  //Get any external scripts
  var waitForVars = [];
  var scriptVars = [
                    { script: 'bb_htmlarea', variable: ['HTMLArea'] },
                    { script: 'w_editor', variable: ['WebeqEditors'] },
                    { script: 'wysiwyg.js', variable: ['vtbe_attchfiles'] },
                    { script: 'gradebook_utils.js', variable: ['gradebook_utils'] },
                    { script: 'rubric.js', variable: ['rubricModule'] },
                    { script: 'gridmgmt.js', variable: ['gridMgmt'] },
                    { script: 'calendar-time.js', variable: ['calendar'] },
                    { script: 'widget.js', variable: ['widget'] },
                    { script: 'vtbeTinymce.js', variable: ['tinyMceWrapper'] },
                    { script: 'WhatsNewView.js', variable: ['WhatsNewView'] },
                    { script: 'tiny_mce.js', variable: ['tinymce','tinyMCE'] },
                    { script: 'slider.js', variable: ['Control.Slider'] }
                   ];
  if (evalExternalScripts)
  {
    var externalScriptRE = '<script[^>]*src=["\']([^>"\']*)["\'][^>]*>([\\S\\s]*?)<\/script>';
    var scriptMatches = str.match(new RegExp(externalScriptRE, 'img'));
    if (scriptMatches && scriptMatches.length > 0)
    {
      $A(scriptMatches).each(function(scriptTag)
      {
        var matches = scriptTag.match(new RegExp(externalScriptRE, 'im'));
        if (matches && matches.length > 0 && matches[1] != '')
        {
          var scriptSrc = matches[1];
          if (scriptSrc.indexOf('/dwr_open/') != -1)
          {
            // dwr_open calls will ONLY work if the current page's webapp == the caller's webapp,
            // otherwise we'll get a session error.  THis will happen if a lightbox is loaded with
            // dynamic content from a different webapp (say /webapps/blackboard) while the main page
            // is loaded from /webapps/discussionboard.  To avoid this, rewrite the url to use the
            // webapp associated with the current page.
            var newparts = scriptSrc.split('/');
            var oldparts = window.location.pathname.split('/');
            newparts[1] = oldparts[1];
            newparts[2] = oldparts[2];
            scriptSrc = newparts.join('/');
          }
          var scriptElem = new Element('script', {
            type: 'text/javascript',
            src: scriptSrc
          });
          var head = $$('head')[0];
          head.appendChild(scriptElem);

          for ( var i = 0; i < scriptVars.length; i++ )
          {
            if ( scriptSrc.indexOf( scriptVars[i].script ) != -1 )
            {
                 scriptVars[ i ].variable.each( function( s )
                {
                  waitForVars.push( s );
                } );
                break;
            }
          }
        }
      });
    }
  }
//Finding Comments in HTML Source Code Using Regular Expressions and replaces with empty value
//Example: <!-- <script>alert("welcome");</script>--> = ''
//So,that extractScripts won't find commented scripts to extract
//str =str.replace(new RegExp('\<![ \r\n\t]*(--([^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)\>', 'img'), '');
  page.delayAddExtractedScripts(str.extractScripts(), waitForVars, signalObject);
};

// Evaluate any inline script - delay a bit to give the scripts above time to load
// NOTE that this is not guaranteed to work - if there are delays loading and initializing
// the scripts required then code in these scripts might fail to find the required variables
// If it is for our code then updating waitForVars appropriately per script will work
page.delayAddExtractedScripts = function (scripts, waitForVars, signalObject)
{
  var count = 0;
  if (waitForVars.length === 0)
  {
    page.actuallyAddExtractedScripts(scripts, signalObject);
  }
  else
  {
  new PeriodicalExecuter( function( pe )
  {
    if ( count < 100 )
    {
      count++;
      if ( page.allVariablesDefined(waitForVars) )
      {
        page.actuallyAddExtractedScripts(scripts, signalObject);
        pe.stop();
      }
    }
    else // give up if it takes longer than 5s to load
    {
      page.actuallyAddExtractedScripts(scripts, signalObject);
      pe.stop();
    }
  }.bind(this), 0.05 );
  }
};

page.variableDefined = function (avar)
{
  
  if ( !window[avar] )
  {
    if (avar.indexOf('.') > 0)
    {
      var parts = avar.split('.');
      var obj = window[parts[0]];
      for (var partNum = 1; obj && partNum < parts.length; partNum++)
      {
        obj = obj[parts[partNum]];
      }
      if (obj)
      {
        return true;
      }
    }
    return false;
  }
  return true;
};
page.allVariablesDefined = function(vars)
{
  var result = true;
  for ( var i = 0; i < vars.length; i++ )
  {
    if ( !page.variableDefined(vars[i]) )
    {
      result = false;
      break;
    }
  }
  return result;
};

page.actuallyAddExtractedScripts = function (scripts, signalObject)
{
  var scriptExecutionDelay = 0;
  if( signalObject )
  {
    scriptExecutionDelay = signalObject.delayScriptExecution;
  }
  scripts.each(function(script)
    {
      if ( script != '' )
      {
        if ( Prototype.Browser.IE && window.execScript )
        {
          ( function()
            {
              window.execScript( script );
            }.delay( scriptExecutionDelay ) );
        }
        else
        {
          ( function()
            {
              var scriptElem = new Element( 'script',
              {
                type : 'text/javascript'
              } );
              var head = $$( 'head' )[ 0 ];
              script = document.createTextNode( script );
              scriptElem.appendChild( script );
              head.appendChild( scriptElem );
              head.removeChild( scriptElem );
           }.delay( scriptExecutionDelay ) );
        }
      }
    }
  );
  if (signalObject)
  {
    signalObject.evaluatingScripts = false;
  }
};

page.setIframeHeightAndWidth = function ()
{
  page.setIframeHeight();
  page.setIframeWidth();
};

page.setIframeHeight = function ()
{
  try
  {
    var iframeElements = $$('iframe.cleanSlate');
    var i = 0;
    for( i = 0; i < iframeElements.length; i++ )
    {
      var iframeElement = iframeElements[i];
      if ( iframeElement.contentWindow && iframeElement.contentWindow.document && iframeElement.contentWindow.document.body )
      {
        var frameHeight = page.util.getMaxContentHeight( iframeElement );
        iframeElement.style.height =iframeElement.contentWindow.document.body.scrollHeight + frameHeight + 300 +'px';
      }
    }
  }
  catch( e ){}
};

page.setIframeWidth = function ()
{
  try
  {
    var iframeElements = $$('iframe.cleanSlate');
    var i = 0;
    for( i = 0; i < iframeElements.length; i++ )
    {
      var iframeElement = iframeElements[i];
      if ( iframeElement.contentWindow && iframeElement.contentWindow.document && iframeElement.contentWindow.document.body )
      {
        var frameWidth = page.util.getMaxContentWidth( iframeElement );
        iframeElement.style.width = frameWidth + 100 + 'px';
      }
    }
  }
  catch( e ){}
};

page.onResizeChannelIframe = function( channelExtRef )
{
  var frameId = 'iframe' + channelExtRef;
  var listId = 'list_channel' + channelExtRef;
  var f = $( frameId );
  var fli = f.contentWindow.document.getElementById( listId );
  if (fli)
  {
    f.style.height = fli.scrollHeight + 15 + "px";
  }
};

/**
 * Contains page-wide utility methods
 */
page.util = {};

/**
 * Returns whether the specific element has the specified class name.
 * Same as prototype's Element.hasClassName, except it doesn't extend the element (which is faster in IE).
 */
page.util.hasClassName = function ( element, className )
{
  var elementClassName = element.className;
  if ((typeof elementClassName == "undefined") || elementClassName.length === 0)
  {
    return false;
  }
  if (elementClassName == className ||
      elementClassName.match(new RegExp("(^|\\s)" + className + "(\\s|$)")))
  {
    return true;
  }

  return false;
};

page.util.fireClick = function ( elem )
{
  if (Prototype.Browser.IE)
  {
    elem.fireEvent("onclick");
  }
  else
  {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("click", true, true);
    elem.dispatchEvent(evt);
  }
};

page.util.useARIA = function ()
{
  if (/Firefox[\/\s](\d+\.\d+)/.test(navigator.userAgent)){ //test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
    var ffversion= parseFloat( RegExp.$1 ); // capture x.x portion and store as a number
    if (ffversion >= 1.9)
    {
      return true;
    }
  }
  else if (/MSIE (\d+\.\d+);/.test(navigator.userAgent)){ //test for MSIE x.x;
    var ieversion= parseFloat( RegExp.$1 ); // capture x.x portion and store as a number
    if (ieversion>=8)
    {
      return true;
    }
  }
  return false;
};

// Find an element with the given className, starting with the element passed in
page.util.upToClass = function ( element, className )
{
  while (element && !page.util.hasClassName(element, className))
  {
    element = element.parentNode;
  }
  return $(element);
};

page.util.isRTL = function ()
{
  var els = document.getElementsByTagName("html");
  var is_rtl = (typeof(els) != 'undefined' &&
          els && els.length == 1 && els[0].dir == 'rtl' );
  return is_rtl ;
};

page.util.allImagesLoaded = function (imgList)
{
  var allDone = true;
  if (imgList)
  {
    for ( var i = 0, c = imgList.length; i < c; i++ )
    {
      var animg = imgList[i];
      // TODO - this doesn't appear to work on IE.
      if ( !animg.complete )
      {
        allDone = false;
        break;
      }
    }
  }
  return allDone;
};

// Exposes (display but keep invisible) an invisible element for measurement
// recursively traverses up the DOM looking for
// a parent node of element whose display == 'none'
// If found, sets its style to: display:block, position:absolute, and visibility:hidden
// and saves it as element.hiddenNode so it can be easily unexposed
page.util.exposeElementForMeasurement = function ( element )
{
  element = $(element);
  var e = element;
  var hiddenNode;
  // find parent node that is hidden
  while ( !hiddenNode && e && e.parentNode)
  {
    if ( $(e).getStyle('display') === 'none')
    {
      hiddenNode = $(e);
    }
    e = $(e.parentNode);
  }
  if ( hiddenNode )
  {
    // save original style attributes: visibility, position, & display
    element.hiddenNode = hiddenNode;
    var style = hiddenNode.style;
    var originalStyles = {
                          visibility: style.visibility,
                          position:   style.position,
                          display:    style.display
                        };
    var newStyles = {
                     visibility: 'hidden',
                     display:    'block'
                   };

     if (originalStyles.position !== 'fixed')
     {
       newStyles.position = 'absolute';
     }
     hiddenNode.originalStyles = originalStyles;
     // set new style for: visibility, position, & display
     hiddenNode.setStyle( newStyles );
  }

};

// undo previous call to exposeElementForMeasurement
page.util.unExposeElementForMeasurement = function ( element )
{
  element = $(element);
  if ( element && element.hiddenNode && element.hiddenNode.originalStyles )
  {
    Element.setStyle( element.hiddenNode, element.hiddenNode.originalStyles );
    element.hiddenNode.originalStyles = null;
    element.hiddenNode = null;
  }

};


/**
 * Returns whether any part of the two elements overlap each other.
 */
page.util.elementsOverlap = function ( e1, e2 )
{
  var pos1 = $(e1).cumulativeOffset();
  var a = { x1: pos1.left, y1: pos1.top, x2: pos1.left + e1.getWidth(), y2: pos1.top + e1.getHeight() };
  var pos2 = $(e2).cumulativeOffset();
  var b = { x1: pos2.left, y1: pos2.top, x2: pos2.left + e2.getWidth(), y2: pos2.top + e2.getHeight() };

  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
};
/**
 *  To handle the case where the focus is visible but too close to the
    bottom of the page, scroll the page up a bit.
    Note: when using scrollbar.js, use scrollBar.scrollTo() rather than focusAndScroll
*/

page.util.focusAndScroll= function(elem)
{
  elem.focus();

  return page.util.ensureVisible(elem);
};

page.util.ensureVisible= function(elem)
{
  var scrolltop = document.viewport.getScrollOffsets().top;
  var mytop = elem.cumulativeOffset()[1];
  var height = document.viewport.getDimensions().height;
  var realtop = mytop - scrolltop;
  var thirty = height * 0.3;
  if (realtop > (height-thirty))
  {
    var scrollDistance = realtop - thirty;
    window.scrollBy(0,scrollDistance);
  }
  return false;
};

page.util.processJSProtoString = function (string, checkToken) {
  // This value must match the value passed as the 2nd parameter to this string.
  // The goal is to pass a known value, as a constant, through the javascript: pseudo-protocol
  // handler. We can then examine the result to determine the decoding method used by the current
  // browser.
  var sniffToken = '%C3%A9';

  // There are three known decoding cases, non-translated, UTF8, and unescape
  if (checkToken === unescape(sniffToken)) {
    // Unescape decoded
    return decodeURIComponent(escape(string));
  } else if (checkToken === sniffToken) {
    // Non-translated
    return decodeURIComponent(string);
  } else {
    // UTF8 Decoded/Unknown
    return string;
  }
};

/**
 * Find the first action bar that precedes sourceElement
 * Returns the action bar div element if found, null otherwise
 *
 * @param sourceElement
 */
page.util.findPrecedingActionBar = function( sourceElement )
{
  var actionBar = null;
  // Loop through each ancestor of sourceElement,
  // starting with parent, until an action bar is found
  sourceElement.ancestors().each( function( item )
  {
    actionBar = item.previous('div.tabActionBar') ||
                item.previous('div.actionBarMicro') ||
                item.previous('div.actionBar');
    if (actionBar)
    {
      throw $break;
    }
  });
  return actionBar;
};

page.util.getLargestDimensions = function (element)
{
  var width = 0;
  var height = 0;
  var dim;
  while (element != document)
  {
    dim = $(element).getDimensions();
    if (dim.width > width)
    {
      width = dim.width;
    }
    if (dim.height > height)
    {
      height = dim.height;
    }
    element = element.up();
  }
    return { width: width, height: height };
};

/*
 * Resize the current window so that it will fit the largest dimensions found for the given element.
 * Will also reposition on the screen if required to fit.  Will not size larger than the screen.
 * NOTE that this will only work for popup windows - main windows are typically in a tabset in
 * the browser and they don't allow resizing like this.  That's OK because the main use case
 * for this method is to make sure popup windows are resized appropriately for their content.
 */
page.util.resizeToContent = function (startElement)
{
    var dim = page.util.getLargestDimensions(startElement);
    var newWidth = dim.width;
    newWidth += 25; // TODO: Haven't figured out why I need this extra space yet...
    if (window.innerWidth > newWidth)
    {
      newWidth = window.innerWidth;
    }
    if (newWidth > screen.width)
    {
      newWidth = screen.width;
    }

    var newHeight = dim.height;
    newHeight += 100; // TODO: Haven't figured out why I need this extra space yet
    if (window.innerHeight > newHeight)
    {
      newHeight = window.innerHeight;
    }
    if (newHeight > screen.height)
    {
      newHeight = screen.height;
    }

    var left = 0;
    var top = 0;
    if ( window.screenLeft )
    {
      left = window.screenLeft;
      top = window.screenTop;
    }
    else if ( window.screenX )
    {
      left = window.screenX;
      top = window.screenY;
    }
    if (left + newWidth > screen.width)
    {
      left = screen.width - newWidth;
      if (left < 0)
      {
        left = 0;
      }
    }
    if (top + newHeight > screen.height)
    {
      top = screen.height - newHeight;
      if (top < 0)
      {
        top = 0;
      }
    }
    window.moveTo(left,top);
    window.resizeTo(newWidth,newHeight);
};

/**
 * Sets the css position of all li elements that are contained in action bars on the page.
 * Since z-index only works on positioned elements, this function can be used to ensure that
 * divs with a higher z-index will always appear on top of any action bars on the page.
 *
 * @param cssPosition
 */
page.util.setActionBarPosition = function( cssPosition )
{
  $$( 'div.actionBar',
      'div.tabActionBar',
      'div.actionBarMicro' ).each( function( actionbar )
  {
    actionbar.select( 'li' ).each( function( li )
    {
      li.setStyle( {position: cssPosition} );
    });
  });
};

/**
 * Class for controlling the course menu-collapser.  Also ensures the menu is
 * the right height
 */
page.PageMenuToggler = Class.create();
page.PageMenuToggler.prototype =
{
  /**
   * initialize
   */
  initialize: function( isMenuOpen,key,temporaryScope )
  {
    page.PageMenuToggler.toggler = this;
    this.key = key;
    if (temporaryScope)
    {
      this.temporaryScope = temporaryScope;
    }
    else
    {
      this.temporaryScope = false;
    }
    this.isMenuOpen = isMenuOpen;
    this.puller = $('puller');
    this.menuPullerLink = $(this.puller.getElementsByTagName('a')[0]);
    this.menuContainerDiv = $('menuWrap');
    this.navigationPane = $('navigationPane');
    this.contentPane = $('contentPanel') || $('contentPane');
    this.navigationPane = $('navigationPane');
    this.locationPane = $(this.navigationPane.parentNode);
    this.breadcrumbBar = $('breadcrumbs');

    this.menu_pTop = parseInt(this.menuContainerDiv.getStyle('paddingTop'), 10);
    this.menu_pBottom = parseInt(this.menuContainerDiv.getStyle('paddingBottom'), 10);
    this.loc_pTop = parseInt(this.locationPane.getStyle('paddingTop'), 10);

    if ( this.breadcrumbBar )
    {
      this.bc_pTop = parseInt(this.breadcrumbBar.getStyle('paddingTop'), 10);
      this.bc_pBottom = parseInt(this.breadcrumbBar.getStyle('paddingBottom'), 10);
    }
    else
    {
      this.bc_pTop = 0;
      this.bc_pBottom = 0;
    }

    this.toggleListeners = [];
    this.onResize( null );  // fix the menu size

    // Doesn't work in IE or Safari..
    //Event.observe( window, 'resize', this.onResize.bindAsEventListener( this ) );
    Event.observe( this.menuPullerLink, 'click', this.onToggleClick.bindAsEventListener( this ) );
  },

  /**
   * Adds a listener for course menu toggle events
   */
  addToggleListener: function( listener )
  {
    this.toggleListeners.push( listener );
  },

  /**
   * Notifies all registered toggle event listeners that a toggle has occurred.
   */
  _notifyToggleListeners: function( isOpen )
  {
    this.toggleListeners.each( function( listener )
    {
      listener( isOpen );
    });
  },

  notifyToggleListeners: function( isOpen )
  {
    // we call once the toggle is complete and the DOM in its new state. 2012 themes add transition, which seems
    // to collide with the logic to get dimensions of dom element, so the delay is a 1 sec to let time for those
    // transitions to be done.
    this._notifyToggleListeners.bind( this, isOpen ).delay( 1 );
  },
  /**
   * getAvailableResponse
   */
  getAvailableResponse : function ( req  )
  {
    var originalMenuOpen = this.isMenuOpen ;
    if ( req.responseText.length > 0 )
    {
      if ( req.responseText == 'true' )
      {
        this.isMenuOpen = true;
      }
      else
      {
        this.isMenuOpen = false;
    }
    }

    if ( originalMenuOpen != this.isMenuOpen )
    {
      this.notifyToggleListeners( this.isMenuOpen );
      this.menuContainerDiv.toggle();
      this.puller.toggleClassName("pullcollapsed");
      this.contentPane.toggleClassName("contcollapsed");
      this.navigationPane.toggleClassName("navcollapsed");
    }
  },



  /**
   * Expands the menu.  This can be used instead of toggling to explicitly
   * change the visibility of the menu.
   */
  expand : function ()
  {
    this.menuContainerDiv.show();
    this.puller.removeClassName("pullcollapsed");
    this.contentPane.removeClassName("contcollapsed");
    this.navigationPane.removeClassName("navcollapsed");

    this.isMenuOpen = true;

    var msg = page.bundle.messages[ "coursemenu.hide" ];
    this.menuPullerLink.title = msg;
    $('expander').alt = msg;

    this.notifyToggleListeners( true );
    if (this.temporaryScope)
    {
      UserDataDWRFacade.setStringTempScope( this.key, true );
    }
    else
    {
      UserDataDWRFacade.setStringPermScope( this.key, true );
    }
  },

  /**
   * Collapses the menu.  This can be used instead of toggling to explicitly
   * change the visibility of the menu.
   */
  collapse : function ()
  {
    this.menuContainerDiv.hide();
    this.puller.addClassName("pullcollapsed");
    this.contentPane.addClassName("contcollapsed");
    this.navigationPane.addClassName("navcollapsed");

    this.isMenuOpen = false;

    var msg = page.bundle.messages[ "coursemenu.show" ];
    this.menuPullerLink.title = msg;
    $('expander').alt = msg;

    this.notifyToggleListeners( false );
    if (this.temporaryScope)
    {
      UserDataDWRFacade.setStringTempScope( this.key, false );
    }
    else
    {
      UserDataDWRFacade.setStringPermScope( this.key, false );
    }
  },

  /**
   * Event triggered when the puller toggle control is clicked.  Changes the
   * menu from open to closed or closed to open depending on existing state.
   */
  onToggleClick: function( event )
  {
    if ( this.isMenuOpen )
    {
      this.collapse();
    }
    else
    {
      this.expand();
    }
    Event.stop( event );
  },

  /**
   * onResize
   */
  onResize: function( event )
  {
      var menuHeight = this.menuContainerDiv.getHeight();
      var contentHeight = this.contentPane.getHeight();
      var maxHeight = ( menuHeight > contentHeight ) ? menuHeight : contentHeight;
      this.contentPane.setStyle({height: maxHeight + 'px'});
      this.navigationPane.setStyle({height: maxHeight + 'px'});
  }
};
page.PageMenuToggler.toggler = null;

/**
 *  Class for controlling the page help toggler in the view toggle area
 */
page.PageHelpToggler = Class.create();
page.PageHelpToggler.prototype =
{
  initialize: function( isHelpEnabled, showHelpText, hideHelpText, assumeThereIsHelp )
  {
    page.PageHelpToggler.toggler = this;
    this.toggleListeners = [];
    this.isHelpEnabled = isHelpEnabled;
    this.showText = showHelpText;
    this.hideText = hideHelpText;
    this.contentPanel = $('contentPanel') || $('contentPane');
    var helperList = [];
    if ( this.contentPanel && !assumeThereIsHelp)
    {
      var allElems = [];
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('p') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('div') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('li') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('span') ) );
      for ( var i = 0; i < allElems.length; i++ )
      {
        var el = allElems[i];
        if ( page.util.hasClassName( el, 'helphelp' ) ||
             page.util.hasClassName( el, 'stepHelp' ) ||
             page.util.hasClassName( el, 'taskbuttonhelp' ) ||
             page.util.hasClassName( el, 'pageinstructions' ) )
        {
          helperList.push( $(el) );
        }
      }
    }

    var helpTextToggleLink = $('helpTextToggleLink');
    if ( ( !helperList || helperList.length === 0) && !assumeThereIsHelp )
    {
      if ( helpTextToggleLink )
      {
        helpTextToggleLink.remove();
      }
    }
    else
    {
      if ( !isHelpEnabled )
      {
        helperList.invoke( "toggle" );
      }

      if ( !this.showText )
      {
        this.showText = page.bundle.getString("viewtoggle.editmode.showHelp");
      }

      if ( !this.hideText )
      {
        this.hideText = page.bundle.getString("viewtoggle.editmode.hideHelp");
      }

      helpTextToggleLink.style.display = 'inline-block';
      this.toggleLink = helpTextToggleLink;
      this.toggleImage = $(this.toggleLink.getElementsByTagName('img')[0]);
      Event.observe( this.toggleLink, "click", this.onToggleClick.bindAsEventListener( this ) );
      $(this.toggleLink.parentNode).removeClassName('hidden');
      this.updateUI();
    }
  },

  addToggleListener: function( listener )
  {
    this.toggleListeners.push( listener );
  },

  _notifyToggleListeners: function()
  {
    this.toggleListeners.each( function( listener )
    {
      listener( this.isHelpEnabled );
    });
  },

  notifyToggleListeners: function()
  {
    // we notify once the whole menu collapse/expand is done, so the DOM is in final state
    this._notifyToggleListeners.bind( this ).delay( );
  },


  updateUI: function( )
  {
    if ( this.isHelpEnabled )
    {
      $("showHelperSetting").value = 'true';
      this.toggleImage.src = "/images/ci/ng/small_help_on2.gif";
      this.toggleLink.setAttribute( "title", this.showText );
      this.toggleImage.setAttribute( "alt", this.showText );
    }
    else
    {
      $("showHelperSetting").value = 'false';
      this.toggleImage.src = "/images/ci/ng/small_help_off2.gif";
      this.toggleLink.setAttribute( "title", this.hideText );
      this.toggleImage.setAttribute( "alt", this.hideText );
    }
  },

  onToggleClick: function( event )
  {
    // Toggle all elements that have the css class "helphelp"
    var helperList = [];
    if ( this.contentPanel )
    {
      var allElems = [];
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('p') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('div') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('li') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('span') ) );

      for ( var i = 0; i < allElems.length; i++ )
      {
        var el = allElems[i];
        if ( page.util.hasClassName( el, 'helphelp' ) ||
             page.util.hasClassName( el, 'stepHelp' ) ||
             page.util.hasClassName( el, 'taskbuttonhelp' ) ||
             page.util.hasClassName( el, 'pageinstructions' ) )
        {
          $(el).toggle();
        }
      }
    }

    if ( this.isHelpEnabled )
    {
      this.isHelpEnabled = false;
      UserPageInstructionsSettingDWRFacade.setShowPageInstructions( "false" );
    }
    else
    {
      this.isHelpEnabled = true;
      UserPageInstructionsSettingDWRFacade.setShowPageInstructions( "true" );
    }

    this.updateUI();
    this.notifyToggleListeners();
    Event.stop( event );
  }
};

/**
 * Class for controlling the display of a context menu.
 */
page.ContextMenu = Class.create();
page.ContextMenu.prototype =
{
  initialize: function( contextMenuContainer, divId, forceMenuRefresh )
  {
    this.displayContextMenuLink = contextMenuContainer.down("a");
    this.contextMenuContainer = contextMenuContainer;
    this.forceMenuRefresh = forceMenuRefresh;
    this.uniqueId = this.displayContextMenuLink.id.split('_')[1];
    this.contextMenuDiv = this.displayContextMenuLink.savedDiv;
    if ( !this.contextMenuDiv )
    {
      this.contextMenuDiv = contextMenuContainer.down("div");//$('cmdiv_' + this.uniqueId);
      this.displayContextMenuLink.savedDiv = this.contextMenuDiv;
      page.ContextMenu.hiddenDivs.set(divId,this.contextMenuDiv);
    }

    this.originalContextMenuDiv = this.contextMenuDiv.cloneNode(true);
    $(this.contextMenuDiv).setStyle({zIndex: 200});
    this.displayContextMenuLink.appendChild( this.contextMenuDiv ); // Temporarily add the menu back where it started
    this.closeContextMenuLink = contextMenuContainer.down(".contextmenubar_top").down(0);
    this.contextParameters = contextMenuContainer.readAttribute("bb:contextParameters");
    this.menuGeneratorURL = contextMenuContainer.readAttribute("bb:menuGeneratorURL");
    this.nav = contextMenuContainer.readAttribute("bb:navItem");
    this.enclosingTableCell = contextMenuContainer.up("td");
    this.menuOrder = contextMenuContainer.readAttribute("bb:menuOrder");
    this.overwriteNavItems = contextMenuContainer.readAttribute("bb:overwriteNavItems");
    this.beforeShowFunc = contextMenuContainer.readAttribute("bb:beforeShowFunc");
    if (this.beforeShowFunc)
    {
      this.beforeShowFunc = eval(this.beforeShowFunc);
    }

    if ( this.menuOrder )
    {
      this.menuOrder = this.menuOrder.split(',');
    }

    if ( !this.contextParameters )
    {
      this.contextParameters = "";
    }

    if ( !this.menuGeneratorURL )
    {
      this.menuGeneratorURL = "";
    }

    if ( !this.nav )
    {
      this.nav = "";
    }

    this.dynamicMenu = false;

    if ( this.menuGeneratorURL )
    {
      this.dynamicMenu = true;
    }

    if (this.dynamicMenu)
    {
      Event.observe( this.displayContextMenuLink, "click", this.generateDynamicMenu.bindAsEventListener( this ) );
    }
    else
    {
      Event.observe( this.displayContextMenuLink, "click", this.onDisplayLinkClick.bindAsEventListener( this ) );
    }

    Event.observe( this.closeContextMenuLink, "click", this.onCloseLinkClick.bindAsEventListener( this ) );
    Event.observe( this.contextMenuDiv, "keydown", this.onKeyPress.bindAsEventListener( this ) );

    // adding nowrap to table cell containing context menu
    // If no enclosing td is found, try th
    if ( !this.enclosingTableCell )
    {
      this.enclosingTableCell = contextMenuContainer.up("th");
    }

    if ( this.enclosingTableCell )
    {
      if ( !this.enclosingTableCell.hasClassName("nowrapCell") )
      {
        this.enclosingTableCell.addClassName("nowrapCell");
      }

      // if label tag is an immediate parent of context menu span tag, it needs nowrap as well
      if ( this.enclosingTableCell.down("label") && !this.enclosingTableCell.down("label").hasClassName("nowrapLabel"))
      {
        this.enclosingTableCell.down("label").addClassName("nowrapLabel");
      }
    }

    if ( !this.dynamicMenu )
    {
      var contexMenuItems = contextMenuContainer.getElementsBySelector("li > a").each( function (link )
      {
        if ( !link.up('li').hasClassName("contextmenubar_top") )
        {
          Event.observe( link, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
          Event.observe( link, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
        }
      }.bind( this ) );
    }

    this.useARIA = page.util.useARIA();

    // remove the context menu div from the page for performance reasons - add it back when we need to show it
    Element.remove( this.contextMenuDiv );
  },

  onKeyPress: function( event )
  {
    var elem, children, index;
    var key = event.keyCode || event.which;
    if ( key == Event.KEY_UP )
    {
      elem = Event.element ( event );
      children = this.contextMenuDiv.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index > 0 )
      {
        children[index - 1].focus();
      }
      Event.stop( event );
    }
    else if ( key == Event.KEY_DOWN )
    {
      elem = Event.element ( event );
      children = this.contextMenuDiv.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index < ( children.length - 1 ) )
      {
        children[index + 1].focus();
      }
      Event.stop( event );
    }
    else if ( key == Event.KEY_ESC )
    {
      this.close();
      this.displayContextMenuLink.focus();
      Event.stop( event );
    }
    else if ( key == Event.KEY_TAB )
    {
      elem = Event.element ( event );
      children = this.contextMenuDiv.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( (!event.shiftKey && index == children.length - 1) || (event.shiftKey && index === 0))
      {
        this.close();
        this.displayContextMenuLink.focus();
        Event.stop( event );
      }
    }
    else if ( key == Event.KEY_RETURN )
    {
      if ( this.useARIA )
      {
        elem = Event.element ( event );
        (function() { page.util.fireClick( elem ); }.bind(this).defer());
        Event.stop( event );
      }
    }
  },

  onAnchorFocus: function ( event )
  {
    Event.element( event ).setStyle({ backgroundColor: '#FFFFFF' });
  },

  onAnchorBlur: function( event )
  {
    Event.element( event ).setStyle({ backgroundColor: '' });
  },

  afterMenuGeneration: function( req )
  {
    if ( this.dynamicMenu )
    {
      var result;
      this.dynamicMenu =  this.forceMenuRefresh;
      try
      {
        result = req.responseText.evalJSON( true );
        if ( result.success == "true" )
        {
          // append uniqueId to each li
          var menuHTML = result.contentMenuHTMLList.replace(/(<li.*?id=")(.*?)(".*?>)/g,"$1$2_"+this.uniqueId+"$3");
          if ( this.forceMenuRefresh )
          {
             this.contextMenuDiv.innerHTML = this.originalContextMenuDiv.innerHTML;
          }
          this.contextMenuDiv.insert({bottom:menuHTML});
          $A(this.contextMenuDiv.getElementsByTagName("ul")).each( function( list, index )
          {
            list.id = 'cmul'+index+'_'+this.uniqueId;
          }.bind(this) );
          var contexMenuItems = this.contextMenuDiv.getElementsBySelector("li > a").each( function (link )
          {
            if ( !link.up('li').hasClassName("contextmenubar_top") )
            {
              Event.observe( link, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
              Event.observe( link, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
             }
          }.bind( this ) );
        }
        else
        {
          new page.InlineConfirmation("error", result.errorMessage, false );
        }
      }
      catch ( e )
      {
         new page.InlineConfirmation("error", result.errorMessage, false );
      }
    }

    this.showMenu();
    //focus on the first menu item
    (function() { this.contextMenuDiv.down("a").focus(); }.bind(this).defer());
  },

  appendItems: function( items, menuItemContainer )
  {
    if (!menuItemContainer)
    {
      var uls = this.contextMenuDiv.getElementsBySelector("ul");
      menuItemContainer = uls[uls.length-1];
    }

    items.each( function ( item )
    {
      if ( item.type == "seperator" )
      {
        if (menuItemContainer.getElementsBySelector("li").length === 0)
        {
          return;
        }
        var ul = new Element('ul');
        menuItemContainer.parentNode.appendChild( ul );
        menuItemContainer = ul;
        return;
      }
      if ( !this.menuItemTempate )
      {
        var menuItems = this.contextMenuDiv.getElementsBySelector("li");
        this.menuItemTempate = menuItems[menuItems.length-1];
      }
      var mi = this.menuItemTempate.cloneNode( true );
      var a  =  mi.down('a');
      var name = item.key ? page.bundle.getString( item.key ) : item.name ? item.name : "?";
      a.update( name );
      a.title = item.title ? item.title : name;
      a.href = "#";
      menuItemContainer.appendChild( mi );
      Event.observe( a, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
      Event.observe( a, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
      Event.observe( a, 'click', this.onItemClick.bindAsEventListener( this, item.onclick, item.doNotSetFocusOnClick ) );
    }.bind( this ) );

  },

  onItemClick: function( evt, func, doNotSetFocusOnClick )
  {
    this.onCloseLinkClick( evt, doNotSetFocusOnClick );
    func();
  },

  setItems: function( items )
  {
    // rather than try to match up new items with existing items, it's easier to delete the existing items
    // (except for the close item) and then add the new items

    // remove existing menu items, except close menu
    var menuItems = this.contextMenuDiv.getElementsBySelector("li").each( function (li )
    {
      if ( !li.hasClassName("contextmenubar_top") )
      {
        if (!this.menuItemTempate)
        {
          this.menuItemTempate = li;
        }
        li.stopObserving();
        li.remove();
      }
    }.bind( this ) );

    // should only be one menuItemContainer
    var menuItemContainers = this.contextMenuDiv.getElementsBySelector("ul").each( function (ul)
    {
      if ( !ul.down("li") )
      {
        ul.remove();
      }
    }.bind( this ) );

    this.appendItems(items, menuItems[0].parentNode);
  },

  showMenu : function()
  {
    if (this.beforeShowFunc)
    {
      this.beforeShowFunc(this);
    }
    page.ContextMenu.registerContextMenu( this );
    this.reorderMenuItems();
    if ( this.useARIA )
    {
      this.initARIA();
    }
    var offset = this.displayContextMenuLink.cumulativeOffset();
    var scrollOffset = this.displayContextMenuLink.cumulativeScrollOffset();
    var viewportScrollOffset = document.viewport.getScrollOffsets();
    if ( this.displayContextMenuLink.up( 'div.lb-content' ) )
    {
      // Fix offset for context menu link inside a lightbox
      offset[0] = offset[0] + viewportScrollOffset[0];
      offset[1] = offset[1] + viewportScrollOffset[1];
    }
    else
    {
      // Fix the offset if the item is in a scrolled container
      offset[0] = offset[0] - scrollOffset[0] + viewportScrollOffset[0];
      offset[1] = offset[1] - scrollOffset[1] + viewportScrollOffset[1];
    }
    document.body.appendChild( this.contextMenuDiv );
    this.contextMenuDiv.setStyle({display: "block"});
    var width = this.contextMenuDiv.getWidth();
    var bodyWidth = $(document.body).getWidth();

    if ( page.util.isRTL() )
    {
      offset[0] = offset[0] + this.displayContextMenuLink.getWidth() - width;
    }

    if ( offset[0] + width > bodyWidth )
    {
      offset[0] = offset[0] - width + 30;
    }

    if ( this.keepMenuToRight )
    {
      // In case the link is very wide (i.e. gradecenter accessible mode cell link for really wide cell)
      // make sure the menu renders to the right side of the link
      var linkWidth = this.displayContextMenuLink.getDimensions().width;
      if (linkWidth > width)
      {
        // Only worry if the link is actually wider than the menu
        offset[0] += (linkWidth-width);
      }
    }

    // Don't start the menu off the left side of the window
    if ( offset[0] < 0 )
    {
      offset[0] = 0;
    }

    var height = this.contextMenuDiv.getHeight();
    var bodyHeight = $(document.body).getHeight();
    if (bodyHeight === 0)
    {
      // TODO This is kindof a hack since body height == 0 on a stream page, but we hacked in a special case for
      // lb-content above so it isn't entirely unheard of... would just be nicer to make this bodyheight choice
      // determined by the calling page rather than trial and error...
      var streamDiv = this.displayContextMenuLink.up( 'div.stream_full' );
      if (streamDiv)
      {
        bodyHeight = streamDiv.getHeight();
      }
    }
    var ypos = offset[1] + this.displayContextMenuLink.getHeight() + 17;
    if ( ( height + ypos ) > bodyHeight )
    {
      ypos -= height;
      ypos -= 34;
    }
    // Don't start the menu off the top of the screen
    if (ypos < 0 )
    {
      ypos = 0;
    }
    if (height > bodyHeight)
    {
      // If the menu is too big to fit on the screen, set it to the height of the screen and allow scrollbars inside the menu
      this.contextMenuDiv.setStyle({ height: bodyHeight + "px", overflowY: "auto", overflowX: "hidden", left: offset[0] + "px", top: ypos + "px" });
    }
    else
    {
      this.contextMenuDiv.setStyle({ left: offset[0] + "px", top: ypos + "px"});
    }
    if ( !this.shim )
    {
      this.shim = new page.popupShim( this.contextMenuDiv );
    }
    this.shim.open();
  },

  initARIA: function()
  {
    if ( !this.initializedARIA )
    {
      this.displayContextMenuLink.setAttribute( "aria-haspopup", "true" );
      this.displayContextMenuLink.setAttribute( "role", "menubutton" );
      this.contextMenuDiv.setAttribute( "role", "application" );
      this.contextMenuDiv.down( "ul" ).setAttribute( "role", "menu" );
      $A( this.contextMenuDiv.getElementsByTagName('a') ).each ( function( link )
      {
        link.setAttribute( "role", "menuitem" );
        link.parentNode.setAttribute( "role", "presentation" );
        if ( !link.href.include("#") )
        {
          Event.observe( link, 'click', function() {
            if ( this.ohref.toLowerCase().startsWith("javascript") )
            {
              eval( decodeURIComponent(this.ohref) );
            }
            else
            {
              if ( this.target )
              {
                window.open( this.ohref, this.target );
              }
              else
              {
                window.location = this.ohref;
              }
            }
          } );
          link.ohref = link.href;
          link.removeAttribute( "href" );
          link.tabIndex = "0";
          link.setStyle( {cursor: 'pointer'} ); // make it look like a link.
        }
      });
      this.initializedARIA = true; // Only initialize once.
    }
  },

  reorderMenuItems : function()
  {
    if ( !this.menuOrder || this.menuOrder.length < 2 )
    {
      return;
    }

    var orderMap = {};
    var closeItem = null;
    var extraItems = [];  // items not in order

    // Gather up all of the <li> tags in the menu and stick them in a map/object of id to the li object
    $A(this.contextMenuDiv.getElementsByTagName("li")).each( function( listItem )
    {
      if (listItem.hasClassName("contextmenubar_top"))
      {
        closeItem = listItem;
      }
      else
      {
        if (this.menuOrder.indexOf(listItem.id) > -1)
        {
          orderMap[listItem.id] = listItem;  // add item to map
        }
        else
        {
          extraItems.push(listItem); // listItem id not specified in menuOrder, so add listItem to extraItems
        }
      }
    }.bind(this) );

    // Remove all the content from the context menu div
    $A(this.contextMenuDiv.getElementsByTagName("ul")).each( function( list )
    {
      Element.remove(list);
    }.bind(this) );

    // Re-add the special "close" item as the first item.
    var ulElement = $(document.createElement("ul"));
    if ( this.useARIA )
    {
      ulElement.setAttribute('role','presentation');
    }
    this.contextMenuDiv.insert({bottom:ulElement});
    ulElement.insert({bottom:closeItem});

    // Loop through the order, adding a <ul> at the start, and starting a new <ul> whenever a "*separator*"
    //  is encountered, and adding the corresponding <li> for each of the ids in the order using the map/object
    this.menuOrder.each( function( id )
    {
      if (id == "*separator*")
      {
        ulElement = $(document.createElement("ul"));
        if ( this.useARIA )
        {
          ulElement.setAttribute('role','presentation');
        }
        this.contextMenuDiv.insert({bottom:ulElement});
      }
      else
      {
        ulElement.insert({bottom:orderMap[id]});
      }
    }.bind(this) );


    // Add any extraItems to thier own ul
    if (extraItems.length > 0)
    {
      ulElement = $(document.createElement("ul"));
      if ( this.useARIA )
      {
        ulElement.setAttribute('role','presentation');
      }
      this.contextMenuDiv.insert({bottom:ulElement});
      extraItems.each( function( lineItem )
      {
        ulElement.insert({bottom:lineItem});
      }.bind(this) );
    }

    // Remove any empty ULs and ensure that the added <ul>s have id of form "cmul${num}_${uniqueId}"
    $A(this.contextMenuDiv.getElementsByTagName("ul")).findAll( function( list )
    {
      if ( list.childElements().length === 0 )
      {
        list.remove(); return false;
      }
      else
      {
        return true;
      }
    }).each( function( list, index )
    {
      list.id = 'cmul'+index+'_'+this.uniqueId;
    }.bind(this) );

    this.menuOrder = null;  // only re-order once
  },

  generateDynamicMenu : function(event)
  {
    page.ContextMenu.closeAllContextMenus();
    if (this.dynamicMenu)
    {
      var context_parameters = this.contextParameters;
      var menu_generator_url = this.menuGeneratorURL;
      var nav = this.nav;
      var overwriteNavItems = this.overwriteNavItems;

      if ( context_parameters )
      {
        context_parameters = context_parameters.toQueryParams();
      }
      else
      {
        context_parameters = {};
      }

      var params = Object.extend({nav_item: nav }, context_parameters );
      params = Object.extend( params, { overwriteNavItems : overwriteNavItems } );

      new Ajax.Request(menu_generator_url,
      {
        method: 'post',
        parameters: params,
        onSuccess: this.afterMenuGeneration.bind( this )
      });
    }
    else
    {
      this.afterMenuGeneration(this);
    }
    $(event).preventDefault();
  },

  onDisplayLinkClick: function( event )
  {
    page.ContextMenu.closeAllContextMenus();
    if (this.dynamicMenu)
    {
     this.generateDynamicMenu(event);
     this.dynamicMenu = false;
    }
    else
    {
      this.showMenu();
      //focus on the first menu item
      (function() { if (this.contextMenuDiv.style.display != 'none') { this.contextMenuDiv.down("a").focus(); } }.bind(this).defer());
      $(event).preventDefault();
    }
  },

  onCloseLinkClick: function( event, doNotSetFocusOnClick )
  {
    this.close();
    
    var setFocusOnDisplayContextMenuLink = true;
    
    // grade center (in non-accessible mode) hides displayContextMenuLink onMouseOut, so we need to make sure it's doNotSetFocusOnClose flag is not set
    // before setting focus.
    if ( this.displayContextMenuLink.doNotSetFocusOnClose !== undefined && this.displayContextMenuLink.doNotSetFocusOnClose )
    {
      setFocusOnDisplayContextMenuLink = false;
    }
    
    // We may not want to set focus on displayContextMenuLink when one of the menu items (other than Close Menu) is clicked.
    // Initially this behavior was required for Grade Center Quick Comment of a grade in the grid (see getGradeContextMenuItems function in gradebookgrid_cellctrl.js)
    if ( doNotSetFocusOnClick !== undefined && doNotSetFocusOnClick )
    {
      setFocusOnDisplayContextMenuLink = false;
    }
    
    if ( setFocusOnDisplayContextMenuLink )
    {
      this.displayContextMenuLink.focus();
    }
    if (event)
    {
    Event.stop( event );
    }
  },

  close: function()
  {
    // Delay the removal of the element from the page so firefox will continue to process
    // the click on the menu item chosen (otherwise it stops processing as soon as we remove the
    // element resulting in the menu not actually working)
    (function() {
      this.closeNow();
    }.bind(this).delay(0.1));
  },

  closeNow: function()
  {
    if (this.contextMenuDiv.style.display != "none")
    {
      var links = this.contextMenuDiv.getElementsBySelector("li > a");
      links.each(function(link) {
        link.blur();
      });
      this.contextMenuDiv.style.display = "none";
      Element.remove( this.contextMenuDiv );
      if ( this.shim )
      {
        this.shim.close();
      }
    }
  }
};
/**
 * Function called to change the 'arrow' of a breadcrumb to face downward when they are clicked for the
 * contextual menu.
 * @param uniqId - unique number which identifies the crumb which was clicked
 * @param size - the size of the breadcrumb
 * @return
 */
page.ContextMenu.changeArrowInBreadcrumb = function (uniqId, event)
{

  page.ContextMenu.alignArrowsInBreadcrumb(event);
  $('arrowContext_'+uniqId).addClassName('contextArrowDown').removeClassName('contextArrow');
  //Stop the click event to propagate anymore -else all arrows will be aligned again
  Event.stop( event );
  return false;
};

//To align all breadcrumb arrows in one direction
page.ContextMenu.alignArrowsInBreadcrumb = function (event)
{
  if ($('breadcrumbs') !== null){
    var bList = $($('breadcrumbs').getElementsByTagName('ol')[0]);
    var bs = bList.immediateDescendants();
    if (bs.length !== null && bs.length >1){
      for (var i = 2; i <= bs.length; i++) {
        var arrowSpan = $('arrowContext_'+i);
        if (arrowSpan !== null ){
          $('arrowContext_'+i).addClassName('contextArrow').removeClassName('contextArrowDown');
        }
      }
    }
  }

  return false;
};

// "static" methods
page.ContextMenu.LI = function(event, divId, forceMenuRefresh)
{
  page.LazyInit(event,['focus','mouseover'],'new page.ContextMenu(page.util.upToClass(target,\'contextMenuContainer\'), \'' + divId + '\',' + forceMenuRefresh + ');');
};
page.ContextMenu.contextMenus = []; // _Open_ context menus
page.ContextMenu.registerContextMenu = function( menu )
{
  page.ContextMenu.contextMenus.push( menu );
};
page.ContextMenu.hiddenDivs = $H(); // All the menu divs on the page - only needed for cases such as view_spreadsheet2.js where we try to modify the menus outside this framework
page.ContextMenu.hideMenuDiv = function( uniqueId)
{
  var linkId = 'cmlink_' + uniqueId;
  var link = document.getElementById(linkId);
  if (link && !link.savedDiv ) {
    var elementId = 'cmdiv_' + uniqueId;
    var element = link.nextSibling; // Should be the text between the link and div but check anyways
    if ( !element || element.id != elementId)
    {
      element = element.nextSibling;
      if ( !element || element.id != elementId)
      {
        element = document.getElementById(elementId);
    }
    }
    if (element)
    {
      link.savedDiv = element;
      page.ContextMenu.hiddenDivs.set(uniqueId,element);
      Element.remove( element );
    }
  }
};
page.ContextMenu.addDivs = function()
{
  $H(page.ContextMenu.hiddenDivs).values().each(function(ele)
  {
    document.body.appendChild(ele);
  });
};

page.ContextMenu.removeDivs = function()
{
  $H(page.ContextMenu.hiddenDivs).values().each(function(ele)
  {
    Element.remove(ele);
  });
};

page.ContextMenu.closeAllContextMenus = function( event )
{
  var deferClose = false;
  if ( event )
  {
    var e = Event.findElement( event, 'a' );
    if ( e && e.href.indexOf("#contextMenu") >= 0 )
    {
      Event.stop( event );
      return;
    }
    deferClose = true;
  }

  page.ContextMenu.contextMenus.each( function( menu )
  {
    if ( menu != this )
    {
      if (deferClose) {
        menu.close();
      } else {
        menu.closeNow();
      }
    }
  });
  page.ContextMenu.contextMenus = [];
};

/**
 *  Enables flyout menus to be opened using a keyboard or mouse.  Enables
 *  them to be viewed properly in IE as well.
 */
page.FlyoutMenu = Class.create();
page.FlyoutMenu.prototype =
{
  initialize: function( subMenuListItem )
  {
    this.subMenuListItem = $(subMenuListItem);
    this.menuLink = $(subMenuListItem.getElementsByTagName('a')[0]);
    //special case to render iframe shim under new course content build menu
    if (this.subMenuListItem.hasClassName('bcContent'))
    {
      var buildContentDiv = this.subMenuListItem.down("div.flyout");
      if ( !buildContentDiv )
      {
        this.subMenu = $(subMenuListItem.getElementsByTagName('ul')[0]);
      }
      else
      {
        this.subMenu = buildContentDiv;
      }
    }
    else
    {
      this.subMenu = $(subMenuListItem.getElementsByTagName('ul')[0]);
    }
    this.menuLink.flyoutMenu = this;

    // calculate the next/previous tab stops
    this.previousSibling = this.subMenuListItem.previous();
    while ( this.previousSibling && (!this.previousSibling.down('a') || !this.previousSibling.visible()) )
    {
      this.previousSibling = this.previousSibling.previous();
    }
    this.nextSibling = this.subMenuListItem.next();
    while ( this.nextSibling && (!this.nextSibling.down('a') || !this.nextSibling.visible()) )
    {
      this.nextSibling = this.nextSibling.next();
    }

    var rumble = $(this.subMenuListItem.parentNode.parentNode);
    this.inListActionBar = rumble && ( rumble.hasClassName("rumble_top") || rumble.hasClassName("rumble") );

    Event.observe( this.menuLink, 'mouseover', this.onOpen.bindAsEventListener( this ) );
    Event.observe( subMenuListItem, 'mouseout', this.onClose.bindAsEventListener( this ) );
    Event.observe( this.menuLink, 'click', this.onLinkOpen.bindAsEventListener( this ) );
    Event.observe( this.subMenuListItem, 'keydown', this.onKeyPress.bindAsEventListener( this ) );

    $A( this.subMenu.getElementsByTagName('li') ).each ( function( li )
    {
      $A(li.getElementsByTagName('a')).each( function( link )
      {
        Event.observe( link, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
        Event.observe( link, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
        Event.observe( link, 'click', this.onLinkClick.bindAsEventListener( this, link ) );
      }.bind( this ) );
    }.bind( this ) );

    // ARIA menus currently don't work properly in IE8, JAWS consumes arrow up/down keys
    this.useARIA = page.util.useARIA() && !Prototype.Browser.IE;
    if ( this.useARIA )
    {
      this.initARIA();
    }
    this.enabled = true;
  },

  initARIA: function()
  {
    var inListActionBar = this.inListActionBar;
    if ( inListActionBar )
    {
      this.subMenuListItem.up('ul').setAttribute( "role", "menubar" );
    }
    this.subMenuListItem.setAttribute( "role", "menuitem" );
    this.subMenu.setAttribute( "role", "menu" );
    if ( !this.menuLink.hasClassName("notMenuLabel") )
    {
      this.subMenu.setAttribute( "aria-labelledby", this.menuLink.id );
    }
    $A( this.subMenu.getElementsByTagName('a') ).each ( function( link )
    {
      link.setAttribute( "role", "menuitem" );
      link.parentNode.setAttribute( "role", "presentation" );
      // List action bars have onclick handlers that prevent submission of the page
      // if no items are selected, so we can't register new onclicks here because
      // otherwise we can't stop them from executing.
      if ( !inListActionBar )
      {
        if ( !link.href.include("#") )
        {
          Event.observe( link, 'click', function() {
            if ( this.ohref.toLowerCase().startsWith("javascript") )
            {
              eval(decodeURIComponent(this.ohref) );
            }
            else
            {
              if ( this.target )
              {
                window.open( this.ohref, this.target );
              }
              else
              {
                window.location = this.ohref;
              }
            }
          } );
          link.ohref = link.href;
          link.removeAttribute( "href" );
          link.tabIndex = "-1";
          link.style.cursor = 'pointer'; // make it look like a link.
        }
      }
    });

  },

  setEnabled: function( enabled )
  {
    this.enabled = enabled;
    if ( !enabled )
    {
      this.subMenu.setStyle({ display: '' });
    }
  },

  onKeyPress: function( event )
  {
    if (!this.enabled)
    {
      return;
    }
    var key = event.keyCode || event.which;
    var elem = Event.element ( event );
    var children, index, link;
    if ( key == Event.KEY_UP )
    {
      children = this.subMenu.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index > 0 )
      {
        children[index - 1].focus();
      }
      else if ( index === 0 )
      {
        children[children.length - 1].focus(); // wrap to bottom
      }
      Event.stop( event );
    }
    else if ( key == Event.KEY_DOWN )
    {
      children = this.subMenu.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index == -1 )
      {
        this.open();
       (function() { this.subMenu.down("li > a").focus(); }.bind(this).defer());
      }
      else if ( index < ( children.length - 1 ) )
      {
        children[index + 1].focus();
      }
      else if ( index == ( children.length - 1 ) )
      {
        children[0].focus(); // wrap to top
      }

      Event.stop( event );
    }
    else if ( key == Event.KEY_LEFT )
    {
      if ( !this.previousSibling || ( this.previousSibling.hasClassName("mainButton") ||
                                  this.previousSibling.hasClassName("mainButtonType") ) )
      {
        this.executeTab( event, true, true );
      }
      else if ( this.previousSibling )
      {
        link = this.previousSibling.getElementsByTagName('a')[0];
        if ( !link || !this.previousSibling.hasClassName("sub") )
        {
          return;
        }
        this.close();
        page.util.fireClick( link );
        Event.stop( event );
      }
    }
    else if ( key == Event.KEY_RIGHT )
    {
      if ( !this.nextSibling || ( this.nextSibling.hasClassName("mainButton") ||
                              this.nextSibling.hasClassName("mainButtonType") ) )
      {
        this.executeTab( event, true, false );
      }
      else if ( this.nextSibling )
      {
        link = this.nextSibling.getElementsByTagName('a')[0];
        if ( !link || !this.nextSibling.hasClassName("sub") )
        {
          return;
        }
        this.close();
        page.util.fireClick( link );
        Event.stop( event );
      }
    }
    else if ( key == Event.KEY_ESC )
    {
      this.close();
      this.menuLink.focus();
      Event.stop( event );
    }
    else if ( key == Event.KEY_RETURN && this.useARIA && !this.inListActionBar )
    {
      page.util.fireClick( elem );
      Event.stop( event );
    }
    else if ( key == Event.KEY_TAB && this.useARIA )
    {
      this.executeTab( event, false, event.shiftKey );
    }
  },

  executeTab: function( event, forceMenuLinkTab, shift )
  {
    var elem = Event.element ( event );
    var link;
    if ( ( elem != this.menuLink ) || forceMenuLinkTab )
    {
      if ( shift )
      {
        // Go to previous menu
        if ( this.previousSibling )
        {
          link = this.previousSibling.getElementsByTagName('a')[0];
          if ( link ) { link.focus(); } else { this.menuLink.focus(); }
        }
        else
        {
          this.menuLink.focus();
        }
      }
      else
      {
        // Go to next menu
        if ( this.nextSibling )
        {
          link = this.nextSibling.getElementsByTagName('a')[0];
          if ( link ) { link.focus(); } else { this.menuLink.focus(); }
        }
        else
        {
          this.menuLink.focus();
        }
      }

      this.close();
      Event.stop( event );
    }
  },

  onOpen: function( event )
  {
    if (!this.enabled)
    {
      return;
    }
    this.open();
  },

  onClose: function( event )
  {
    var to = $(event.relatedTarget || event.toElement);
    if ( !to || to.up('li.sub') != this.subMenuListItem )
    {
      this.close();
    }
  },

  onLinkOpen: function( event )
  {
    if (!this.enabled)
    {
      return;
    }
    this.open();
    (function() { this.subMenu.down("li > a").focus(); }.bind(this).defer());
    Event.stop( event );
  },

  resizeAfterShowHide: function()
  {
  // TODO - ideally this would just resize the outer div, but closing and opening 'works'
  this.close();
  this.open();
  },

  open: function()
  {
    var alreadyShown = this.subMenu.getStyle('display') === 'block';
    // If the menu is already showing (i.e. as_ce4 theme, we don't need to position it)
    if ( !alreadyShown )
    {
      // Set position of action bar elements to static to enable z-index stack order
      page.util.setActionBarPosition( 'static' );

      var menuTop = this.subMenuListItem.getHeight();
      if ( this.subMenu.hasClassName( 'narrow' ) )
      {
        menuTop = 0;
      }
      this.subMenuListItem.setStyle( {position: 'relative'} );
      this.subMenu.setStyle(
      {
        display: 'block',
        zIndex: '999999',
        top: menuTop+'px',
        left: '0px',
        width: '',
        height: '',
        overflowY: ''
      });
      var offset = Position.cumulativeOffset( this.subMenuListItem );
      var menuDims = this.subMenu.getDimensionsEx();
      var menuHeight = menuDims.height;
      var popupWidth = this.subMenu.getWidth();
      var subListItemDims = this.subMenuListItem.getDimensions();
      var menuWidth = subListItemDims.width;

      var viewportDimensions = document.viewport.getDimensions();
      var scrollOffsets = document.viewport.getScrollOffsets();

      var offsetTop = offset[1] - scrollOffsets.top;

      this.subMenu.flyoutMenu = this;

      if ( (offsetTop + menuHeight + subListItemDims.height) > viewportDimensions.height)
      {
        if ( (offsetTop - menuHeight) > 0 )
        {
          // if menu goes below viewport but still fits on-page, show it above button
          this.subMenu.setStyle({ top: '-'+menuHeight+'px' });
        }
        else
        {
          // we need to create scrollbars
          var newWidth = this.subMenu.getWidth() + 15;
          popupWidth = newWidth + 5;
          var newMenuHeight = viewportDimensions.height - (offsetTop + subListItemDims.height) - 20;
          var newMenuTop = menuTop;
          if (newMenuHeight < offsetTop)
          {
            // More space above than below
            newMenuHeight = offsetTop;
            newMenuTop = -offsetTop;
          }
          this.subMenu.setStyle(
                                {
                                  display: 'block',
                                  zIndex: '999999',
                                  top: newMenuTop+'px',
                                  left: '0px',
                                  width: newWidth + 'px',
                                  height: newMenuHeight + 'px',
                                  overflowY: 'auto'
                                });
        }
      }

      var offsetLeft = offset[0] - scrollOffsets.left;
      if ( (offsetLeft + popupWidth) > viewportDimensions.width )
      {
        var subMenuWidth = this.subMenuListItem.getWidth();
        var newLeft = popupWidth - (viewportDimensions.width-offsetLeft);
        if ((newLeft > 0) && (newLeft < offsetLeft))
        {
          newLeft = -newLeft;
        }
        else
        {
          newLeft = -offsetLeft;
        }
        this.subMenu.setStyle({ left: newLeft+'px' });
      }

      if ( page.util.isRTL() )
      {
        var newRight = 0;
        if ( (offsetLeft + menuWidth) - popupWidth < 0 )
        {
          newRight = (offsetLeft + menuWidth) - popupWidth;
        }
        this.subMenu.setStyle({ left: '', right: newRight+'px'});
      }

      if (!this.shim)
      {
        this.shim = new page.popupShim( this.subMenu);
      }

      this.shim.open();
    }
  },

  close: function()
  {
    // Reset position of action bar elements to relative
    page.util.setActionBarPosition( 'relative' );

    this.subMenuListItem.setStyle({position: ''});
    this.subMenu.setStyle({
      display: '',
      top: '',
      left: '',
      width: '',
      height: '',
      overflowY: ''
    });
    if ( this.shim )
    {
      this.shim.close();
    }
  },

  onLinkClick: function( event, link )
  {
    if (!this.enabled)
    {
      return;
    }
    setTimeout( this.blurLink.bind( this, link), 100);
  },

  blurLink: function( link )
  {
    link.blur();
    if (page.util.hasClassName( link, "donotclose" ))
    {
      link.focus();
    }
    else
    {
      this.close();
    }

  },

  onAnchorFocus: function ( event )
  {
    if (!this.enabled)
    {
      return;
    }
    var link = Event.element( event );
    link.setStyle({ backgroundColor: '#FFFFFF' });
  },

  onAnchorBlur: function( event )
  {
    var link = Event.element( event );
    link.setStyle({ backgroundColor: '' });
  }
};

/**
 * Class for providing functionality to menu palettes
 */
page.PaletteController = Class.create();
page.PaletteController.prototype =
{
  /**
   * Constructor
   *
   * @param paletteIdStr        Unique string identifier for a palette
   * @param expandCollapseIdStr Id value of anchor tag to be assigned
   *                            the palette expand/collapse functionality
   * @param closeOtherPalettesWhenOpen Whether to close all other palettes when this one is open
   */
  initialize: function( paletteIdStr, expandCollapseIdStr, closeOtherPalettesWhenOpen, collapsed )
  {
    // palette id string
    this.paletteItemStr = paletteIdStr;

    // palette element
    this.paletteItem = $(this.paletteItemStr);

    // default id string to palette contents container element
    this.defaultContentsContainerId = page.PaletteController.getDefaultContentsContainerId(this.paletteItemStr);

    // the currently active palette contents container element
    this.activeContentsContainer = $(this.defaultContentsContainerId);

    // expand/collapse palette toggle element
    this.paletteToggle = $(expandCollapseIdStr);

    if (this.paletteToggle)
    {
      Event.observe(this.paletteToggle, 'click', this.toggleExpandCollapsePalette.bindAsEventListener(this));
    }

    this.closeOtherPalettesWhenOpen = closeOtherPalettesWhenOpen;

    page.PaletteController.registerPaletteBox(this);
    if (collapsed)
    {
      this.collapsePalette(true);
    }
  },

  /**
   * Set the currently active palette contents container element
   *
   * @param container palette contents container element
   */
  setActiveContentsContainer: function ( container )
  {
    this.activeContentsContainer = container;
  },

  /**
   * Get the currently active palette contents container element
   *
   * @return palette contents container element
   */
  getActiveContentsContainer: function ()
  {
    return this.activeContentsContainer;
  },

  /**
   * Expands the palette if it's not already expanded.
   *
   * @return palette contents container element
   */
  expandPalette: function ( doNotPersist )
  {
    var itemPalClass = [];
    itemPalClass = this.paletteItem.className.split(" ");

    var h2 = $(this.paletteItemStr+"_paletteTitleHeading");
    var expandCollapseLink = h2.getElementsByTagName('a')[0];
    if ( !this.useFirstTagForExpandCollapse( h2 ) )
    {
      expandCollapseLink = h2.getElementsByTagName('a')[1];
    }

    var itemList = this.activeContentsContainer;

    if ( itemList.style.display == "none" )
    {
      itemList.style.display = "block";
      itemPalClass.length = itemPalClass.length - 1;
      this.paletteItem.className = itemPalClass.join(" ");
      h2.className = "";
      var itemTitle = expandCollapseLink.innerHTML.stripTags().trim();
      if ( !this.useFirstTagForExpandCollapse( h2 ) )
      {
        itemTitle = h2.getElementsByTagName('a')[0].innerHTML.stripTags();
      }
      expandCollapseLink.title = page.bundle.getString('expandCollapse.collapse.section.param', itemTitle);
      expandCollapseLink.up().setAttribute("aria-expanded", "true");
    }

    if ( doNotPersist )
    {
      return;
    }

    this.saveSessionStickyInfo( itemList.id, itemList.style.display );
  },

  /**
   * Collapses the palette if it's not already collapsed.
   *
   * @return palette contents container element
   */
  collapsePalette: function ( doNotPersist )
  {
    var itemPalClass = [];
    itemPalClass = this.paletteItem.className.split(" ");

    // Note - h2 is actually a div, not an h2 :)
    var h2 = $(this.paletteItemStr+"_paletteTitleHeading");
    var expandCollapseLink = h2.getElementsByTagName('a')[0];
    if ( !this.useFirstTagForExpandCollapse( h2 ) )
    {
      expandCollapseLink = h2.getElementsByTagName('a')[1];
    }

    var itemList = this.activeContentsContainer;

    if ( itemList.style.display != "none" )
    {
      itemList.style.display = "none";
      itemPalClass[itemPalClass.length] = 'navPaletteCol';
      this.paletteItem.className = itemPalClass.join(" ");

      if (itemPalClass.indexOf('controlpanel') != -1)
      {
      }

      if (itemPalClass.indexOf('listCm')!=-1)
      {
        h2.className = "listCmCol"; // colors h2 background (removes background image)
      }

      if (itemPalClass.indexOf('tools') != -1)
      {
        h2.className = "toolsCol";
      }
      var itemTitle = expandCollapseLink.innerHTML.stripTags();
      if ( !this.useFirstTagForExpandCollapse( h2 ) )
      {
        itemTitle = h2.getElementsByTagName('a')[0].innerHTML.stripTags().trim();
      }
      expandCollapseLink.title = page.bundle.getString('expandCollapse.expand.section.param', itemTitle);
      expandCollapseLink.up().setAttribute("aria-expanded", "false");
    }

    if (doNotPersist)
    {
      return;
    }

    this.saveSessionStickyInfo( itemList.id, itemList.style.display );
  },

  /**
   * Takes in a key value pair to save to the session as sticky data.
   *
   * @param key The key that will have the current course id appended to it to be saved to the session.
   * @param value The value to the key.
   */
  saveSessionStickyInfo: function( key, value )
  {
    /* Get the course id off of the global variable if exists, so that data is saved per
     * user session per course. If course doesn't exist, use empty string.
     */
    var current_course_id = window.course_id ? window.course_id : "";
    UserDataDWRFacade.setStringTempScope( key + current_course_id, value );
  },

  /**
   * Whether the first tag has js onclick event binding on it for palette collapse/expand
   *
   * @param h2
   */
  useFirstTagForExpandCollapse: function ( h2 )
  {
    return h2.getElementsByTagName('a')[0].id.indexOf( "noneExpandCollapseTag" ) > -1 ? false : true;
  },

  /**
   * Toggles a palette from expand to collapse and vice versa.
   *
   * @param event Optional event object if this method was bound to event.
   */
  toggleExpandCollapsePalette: function ( event, doNotPersist )
  {
    // To prevent default event behavior
    if ( event )
    {
      Event.stop( event );
    }

    if ( this.activeContentsContainer.style.display == "none" )
    {
      // palette is currently closed, so we will be expanding it
      if ( this.closeOtherPalettesWhenOpen )
      {
        // if closeOtherPalettesWhenOpen is set to true for this palette, close all other palettes
        page.PaletteController.closeAllOtherPalettes(this.paletteItemStr, doNotPersist);
      }
      this.expandPalette( doNotPersist );
    }
    else
    {
      // palette is currently expanded, so we will be collapsing it
      this.collapsePalette( doNotPersist );
    }
  }
};

// "static" methods

page.PaletteController.paletteBoxes = [];
page.PaletteController.registerPaletteBox = function( paletteBox )
{
  page.PaletteController.paletteBoxes.push( paletteBox );
};

/**
 * Get the palette controller js object by palette id
 *
 * @param paletteId
 */
page.PaletteController.getPaletteControllerObjById = function( paletteId )
{
  return page.PaletteController.paletteBoxes.find( function( pb )
         { return ( pb.paletteItemStr == paletteId ); } );
};


/**
 * Closes all palettes except the specified one
 *
 * @param paletteToKeepOpen
 */
page.PaletteController.closeAllOtherPalettes = function( paletteToKeepOpen, doNotPersist )
{
  for(var i = 0; i < page.PaletteController.paletteBoxes.length; i++)
  {
    var paletteItem = page.PaletteController.paletteBoxes[i];
    if (paletteToKeepOpen !== paletteItem.paletteItemStr)
    {
      paletteItem.collapsePalette( doNotPersist );
    }
  }
};

/**
 * Toggles (expand/collapse) the contents of a nav palette by palette id
 *
 * @param paletteId
 * @param doNotPersist - optional param to suppress persisting state, default is to persist
 */
page.PaletteController.toggleExpandCollapsePalette = function( paletteId, doNotPersist )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  paletteObj.toggleExpandCollapsePalette( null, doNotPersist);
};


/**
 * Collapses the contents of a nav palette by palette id
 *
 * @param paletteId
 * @param doNotPersist - optional param to suppress persisting state, default is to persist
 */
page.PaletteController.collapsePalette = function( paletteId, doNotPersist )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  paletteObj.collapsePalette( doNotPersist);
};


/**
 * Expand the contents of a nav palette by palette id
 *
 * @param paletteId
 * @param doNotPersist - optional param to suppress persisting state, default is to persist
 */
page.PaletteController.expandPalette = function( paletteId, doNotPersist )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  paletteObj.expandPalette( doNotPersist);
};


/**
 * Set the active palette contents container (element containing the body
 * contents of a palette). The active contents container is used to toggle
 * visibility when expanding and collapsing menu palettes.
 *
 * @param paletteId
 * @param paletteContentsContainer Optional container to set.
 *                                 If not given, the palette's active
 *                                 container will not be changed.
 * @return The new active palette contents container element.
 *         If no paletteContentsContainer element was passed,
 *         The current active palette contents container element
 *         will be returned.
 */
page.PaletteController.setActivePaletteContentsContainer = function( paletteId, paletteContentsContainer )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  if ( paletteContentsContainer )
  {
    paletteObj.setActiveContentsContainer( paletteContentsContainer );
  }
  return paletteObj.getActiveContentsContainer();
};

/*
 * Get the default palette contents container id string
 *
 * @param paletteId
 */
page.PaletteController.getDefaultContentsContainerId = function( paletteId )
{
  return paletteId + "_contents";
};


/**
 * Class for providing expand/collapse functionality (with dynamic loading)
 */
page.ItemExpander = Class.create();
page.ItemExpander.prototype =
{
  /**
   * Constructor
   * - expandLink - the link that when clicked will expand/collapse the item
   * - expandArea - the actual area that will get expanded/collapsed (if the item is dynamically loaded, this area will be populated dynamically)
   * - expandText - the text to show as a tooltip on the link for expanding
   * - collapseText - the text to show as a tooltip on the link for collapsing
   * - expandTitleText - the customized text for link title afer expanding the item; if null/undefined, use expandText
   * - collapseTitleText - the customized text for link title after collapsing the item;if null/undefined, use collapseText
   * - dynamic - whether the contents are dynamically loaded
   * - dynamicUrl - the URL to get the contents of the item from
   * - contextParameters - additional URL parameters to add when calling the dynamicUrl
   * - sticky - load/save expand state from UserData; true if null/undefined
   * - expanded - initially expanded; false if null/undefined
   */
  initialize: function( expandLink, expandArea, expandText, collapseText, dynamic, dynamicUrl, contextParameters, expandTitleText, collapseTitleText, sticky, expanded )
  {
    this.expandLink = $(expandLink);
    this.expandArea = $s(expandArea);
    // Register the expander so it can be found
    page.ItemExpander.itemExpanderMap[this.expandLink.id] = this;
    this.expandText = expandText.unescapeHTML();
    this.collapseText = collapseText.unescapeHTML();
    if ( expandTitleText !== null && expandTitleText !== undefined )
    {
      this.expandTitleText = expandTitleText.unescapeHTML();
    }
    else
    {
      this.expandTitleText = this.expandText;
    }
    if ( collapseTitleText !== null && collapseTitleText !== undefined )
    {
      this.collapseTitleText = collapseTitleText.unescapeHTML();
    }
    else
    {
      this.collapseTitleText = this.collapseText;
    }
    this.dynamic = dynamic;
    this.dynamicUrl = dynamicUrl;

    if ( contextParameters !== null && contextParameters !== undefined )
    {
      this.contextParameters = contextParameters.toQueryParams();
    }
    else
    {
      this.contextParameters = {};
    }

    this.sticky = ( sticky !== null && sticky !== undefined ) ? sticky : true;
    this.expanded = ( expanded !== null && expanded !== undefined ) ? expanded : false;
    this.hasContents = !this.dynamic;

    if ( this.sticky )
    {
      // get the course id off of the global variable if exists, because data is saved per user session per course
      var current_course_id = ( (typeof course_id != "undefined") && course_id !== null ) ? course_id : "";
      UserDataDWRFacade.getStringTempScope( this.expandLink.id + current_course_id, this.getAvailableResponse.bind( this ) );
    }
    this.expandCollapse( !this.expanded );
    Event.observe( this.expandLink, "click", this.onToggleClick.bindAsEventListener( this ) );
  },

  getAvailableResponse : function ( response  )
  {
    var originalExpanded = this.expanded ;
    var cachedExpanded = false;
    if ( response.length > 0 )
    {
      if ( response == 'true' )
      {
        cachedExpanded = true;
      }
      else
      {
        cachedExpanded = false;
    }
    }

    if ( originalExpanded != cachedExpanded )
    {
      //because we want the menu to be in the cached state,
      //we pass in the opposite so that expandCollapse changes the menu state.
      this.expandCollapse(originalExpanded);
    }
  },

  onToggleClick: function( event )
  {
    if ( event )
    {
      Event.stop( event );
    }

    this.expandCollapse(this.expanded);

    if ( this.sticky )
    {
      // get the course id off of the global variable if exists, so that data is saved per user session per course
      var current_course_id = ( (typeof course_id != "undefined") && course_id !== null ) ? course_id : "";
      UserDataDWRFacade.setStringTempScope( this.expandLink.id + current_course_id, this.expanded );
    }
  },

  expandCollapse: function(shouldCollapse)
  {
    var combo;
    if ( shouldCollapse ) //Collapse the item
    {
      $(this.expandArea).hide();
      this.expandLink.title = this.expandTitleText;
      this.expandLink.up().setAttribute("aria-expanded", "false");
      if ( this.expandLink.hasClassName("comboLink_active") )
      {
        combo = this.expandLink.up("li").down(".submenuLink_active");
        this.expandLink.removeClassName("comboLink_active");
        this.expandLink.addClassName("comboLink");
        if ( combo )
        {
          combo.removeClassName("submenuLink_active");
          combo.addClassName("submenuLink");
        }
      }
      else
      {
        this.expandLink.removeClassName("open");
      }
      this.expanded = false;
    }
    else //Expand the item
    {
      if ( this.hasContents )
      {
        $(this.expandArea).setStyle({ zoom: 1 });
        this.expandArea.show();
        this.expandLink.title = this.collapseTitleText;
        this.expandLink.up().setAttribute("aria-expanded", "true");
        if ( this.expandLink.hasClassName("comboLink") )
        {
          combo = this.expandLink.up("li").down(".submenuLink");
          this.expandLink.removeClassName("comboLink");
          this.expandLink.addClassName("comboLink_active");
          if ( combo )
          {
            combo.removeClassName("submenuLink");
            combo.addClassName("submenuLink_active");
          }
        }
        else
        {
          this.expandLink.addClassName("open");
        }
      }
      else if ( this.dynamic )
      {
        this.loadData();
      }

      this.expanded = true;
    }
  },

  loadData: function()
  {
    new Ajax.Request( this.dynamicUrl,
    {
      method: "post",
      parameters: this.contextParameters,
      requestHeaders: { cookie: document.cookie },
      onSuccess: this.afterLoadData.bind( this )
    });
  },

  afterLoadData: function( req )
  {
    try
    {
      var result = req.responseText.evalJSON( true );
      if ( result.success != "true" )
      {
        new page.InlineConfirmation("error", result.errorMessage, false );
      }
      else
      {
        this.hasContents = true;
        this.expandArea.innerHTML = result.itemContents;
        $(this.expandArea).setStyle({ zoom: 1 });
        this.expandArea.show();
        this.expandLink.title = this.collapseTitleText;
        this.expandLink.up().setAttribute("aria-expanded", "true");
        if ( this.expandLink.hasClassName("comboLink") )
        {
          var combo = this.expandLink.up("li").down(".submenuLink");
          this.expandLink.removeClassName("comboLink");
          this.expandLink.addClassName("comboLink_active");
          if ( combo )
          {
            combo.removeClassName("submenuLink");
            combo.addClassName("submenuLink_active");
          }
        }
        else
        {
          this.expandLink.addClassName("open");
        }
        this.expanded = true;
      }
    }
    catch ( e )
    {
      //Invalid response
    }
  }
};
page.ItemExpander.itemExpanderMap = {};

/**
 * Class for controlling the "breadcrumb expansion" (i.e. the "..." hiding the inner
 * breadcrumbs)
 */
page.BreadcrumbExpander = Class.create();
page.BreadcrumbExpander.prototype =
{
  initialize: function( breadcrumbBar )
  {
    var breadcrumbListElement = $(breadcrumbBar.getElementsByTagName('ol')[0]);
    var breadcrumbs = breadcrumbListElement.immediateDescendants();
    if ( breadcrumbs.length > 4 )
    {
      this.ellipsis = document.createElement("li");
      var ellipsisLink = document.createElement("a");
      ellipsisLink.setAttribute("href", "#");
      ellipsisLink.setAttribute("title", page.bundle.getString('breadcrumbs.expand') );
      ellipsisLink.innerHTML = "...";
      this.ellipsis.appendChild( ellipsisLink );
      this.ellipsis = Element.extend( this.ellipsis );
      Event.observe( ellipsisLink, "click", this.onEllipsisClick.bindAsEventListener( this ) );
      this.hiddenItems = $A(breadcrumbs.slice(2,breadcrumbs.length - 2));
      breadcrumbListElement.insertBefore( this.ellipsis, this.hiddenItems[0] );
      this.hiddenItems.invoke( "hide" );
    }

    // Make sure the breadcrumbs don't run into the mode switcher
    var breadcrumbContainer = $(breadcrumbListElement.parentNode);
    var modeSwitcher = breadcrumbBar.down('.modeSwitchWrap');
    if ( modeSwitcher )
    {
      var containerWidth = breadcrumbContainer.getWidth();
      var containerOffset = breadcrumbContainer.cumulativeOffset();
      var modeSwitcherOffset = modeSwitcher.cumulativeOffset();
      var modeSwitcherWidth = modeSwitcher.getWidth();
      if ( page.util.isRTL() )
      {
        if ( modeSwitcherOffset[0] + modeSwitcherWidth > containerOffset[0] )
        {
          breadcrumbContainer.setStyle({ paddingLeft: ( modeSwitcherOffset[0] + modeSwitcherWidth ) + 'px'} );
        }
      }
     // else
      //{
       // breadcrumbContainer.setStyle({ paddingRight: ( containerWidth - ( modeSwitcherOffset[0] - containerOffset[0] ) ) + 'px'} );
      //}
    }
  },

  onEllipsisClick: function( event )
  {
    this.hiddenItems.invoke( "show" );
    this.ellipsis.hide();
    Event.stop( event );
  }
};

/**
 * Dynamically creates an inline confirmation.
 */
page.InlineConfirmation = Class.create();
page.InlineConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, oneReceiptPerPage )
  {
    var receiptId = $s('receipt_id');
    // do not insert a duplicate receipt, if one already exists
    if(receiptId && oneReceiptPerPage)
    {
     return;
    }
    var cssClass = "bad";
    if ( type == "success" )
    {
      cssClass = "good";
    }
    else if ( type == "warning" )
    {
      cssClass = "warningReceipt";
    }
    var contentPane = $('contentPanel') || $('portalPane');
    var receiptHtml = '<div id="receipt_id" class="receipt '+ cssClass +'">'+
                      '<span class="inlineReceiptSpan" tabindex="-1" style="color:#FFFFFF">'+message+'</span>';
    if ( showRefreshLink )
    {
      receiptHtml += ' <a href="#refresh" onClick="document.location.href = document.location.href; return false;">' + page.bundle.getString("inlineconfirmation.refresh") + '</a>';
    }
    receiptHtml += '<a class="close" href="#close" title="'+ page.bundle.getString("inlineconfirmation.close") +'" onClick="Element.remove( $(this).up(\'div.receipt\') ); return false;"><img alt="'+ page.bundle.getString("inlineconfirmation.close") +'" src="/images/ci/ng/close_mini.gif"></a></div>';
    contentPane.insert({top:receiptHtml});
    // use aria live region to announce this confirmation message rather than setting focus to it. (Too many things are fighting over setting focus)
    // Note: if this confirmation is invoked from a menu handler, it may not announce if focus is lost when the menu closes. See how courseTheme.js sets focus before invoking.
    var insertedA = contentPane.down('span.inlineReceiptSpan');
    insertedA.setAttribute("aria-live","assertive");
    insertedA.parentNode.setAttribute("role","application");
    (function() { insertedA.update( insertedA.innerHTML ); }.defer(2));  // update live region so it is announced
  }
};

page.NestedInlineConfirmationIdCounter = 0;
page.NestedInlineConfirmation = Class.create();
page.NestedInlineConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, previousElement,showCloseLink, extracss, insertBefore, oneReceiptPerPage, fadeAway, focusDiv, fadingTime, insertTop, receiptDivId, focusOnRender )
  {
    if ( Object.isUndefined( focusOnRender ) )
    {
      focusOnRender = true;
    }
   var receiptId = $s('receipt_nested_id');
    // do not insert a duplicate receipt, if one already exists
   var newDivId = 'receipt_nested_id';
    if(receiptId)
    {
      if (oneReceiptPerPage)
      {
        return;
      }
      newDivId = newDivId + (page.NestedInlineConfirmationIdCounter++);
    }
    
    // if receiptDivId is provided, we are explicitly using it as the id for the new receipt replacing the existing receipt with the same id
    if (receiptDivId)
    {
      // Remove the old message with the same receiptDivId if there is one before adding a new one
      if ( $( receiptDivId ) != null )
      {
        $( receiptDivId ).remove();
      }
      newDivId = receiptDivId;
    }

    var cssClass = "bad";
    if ( type == "success" )
    {
      cssClass = "good";
    }
    else if (type == "warning")
    {
      cssClass = "warningReceipt";
    }

    if (!extracss)
    {
      extracss = "";
    }

    var arrowSpan = '';
    if (extracss.indexOf( "point", 0 ) != -1)
    {
      arrowSpan = '<span class="arrow"></span>';
    }

    var contentPane = $(previousElement);
    if (!contentPane)
    {
      // TODO - if we can't find the element we wanted to insert before, is it OK to just drop the notification?
      return;
    }
    var receiptHtml = '<div id="'+newDivId+'" style="display:none" class="receipt '+ cssClass +' '+extracss +'">'+arrowSpan+
                      '<span class="inlineReceiptSpan areceipt" tabindex="-1">'+message+'</span>';
    if ( showRefreshLink )
    {
      receiptHtml += ' <a href="#refresh" onClick="document.location.href = document.location.href; return false;">' + page.bundle.getString("inlineconfirmation.refresh") + '</a>';
    }

    if (showCloseLink)
    {
      // either this is a JS Snippet to execute on close or a simple true in which case we do nothing extra
      var onCloseFunction = "";
      if ( typeof showCloseLink === "string" || showCloseLink instanceof String )
      {
        if ( !page.closeReceiptLinkCounter )
        {
          page.closeReceiptLinkCounter = 0;
        }
        else
        {
          ++page.closeReceiptLinkCounter;
        }
        onCloseFunction = "onReceiptClosed" + page.closeReceiptLinkCounter;
        receiptHtml += "<script type='text/javascript'>window." + onCloseFunction + " = function( ) { " + showCloseLink + " ; }; </script>";
        onCloseFunction += "( );";
      }
      receiptHtml += '<a class="close" href="#close" style="z-index:1000" title="' + page.bundle.getString("inlineconfirmation.close") + '" onClick="' + onCloseFunction + 'Element.remove( $(this).up(\'div.receipt\') ); return false;"><img alt="' + page.bundle.getString("inlineconfirmation.close") + '" src="/images/ci/ng/close_mini.gif"></a></div>';
    }

    if ( insertBefore )
    {
      contentPane.insert({before:receiptHtml});
    }
    else if (insertTop)
    {
      contentPane.insert({top:receiptHtml});
    }
    else
    {
      contentPane.insert({after:receiptHtml});
    }
    this.insertedDiv = insertBefore?contentPane.previousSibling:(insertTop?contentPane.firstChild:contentPane.nextSibling);
    $(this.insertedDiv).show();
    var insertedA = $(this.insertedDiv).down('span.inlineReceiptSpan');
    var fadingDuration = fadingTime ? fadingTime : 5000;

    // For all cases (focus or not), set the aria assertive attribute to make sure this is announced by the screen reader
    insertedA.setAttribute("aria-live","assertive");
    this.insertedDiv.setAttribute("role","application");
    (function() { insertedA.update( insertedA.innerHTML ); }.defer(2));  // update live region so it is announced (needed for jaws 12)

    if ( focusOnRender )
    {
        try
        {
         ( function()
            {
           try
           {
              if ( focusDiv )
              {
                page.util.focusAndScroll( $( focusDiv ) );
              }
              else
              {
                page.util.focusAndScroll( insertedA );
              }
           }
           catch ( focusError )
           {
             // Ignore focus errors. These can happens sometimes on IE if focus is set on an element that is located
             // inside another element that has recently been switched from a hidden state to a visible one.
           }

            }.defer() );
        }
        catch ( focusError )
        {
          // Ignore focus errors. These can happens sometimes on IE if focus is set on an element that is located
          // inside another element that has recently been switched from a hidden state to a visible one.
        }
    }
    else
    {
        // not setting focus to this confirmation - but still make sure it is visible.
        if ( focusDiv )
        {
          page.util.ensureVisible( $( focusDiv ) );
        }
        else
        {
          page.util.ensureVisible( insertedA );
        }
    }
    if ( fadeAway )
      {
        setTimeout( function()
        {
          Element.fade( $(this.insertedDiv),
          {
            duration : 0.3
          } );
        }.bind(this), fadingDuration );
      }
  },

  close: function()
  {
    if ( this.insertedDiv )
    {
      this.insertedDiv.remove();
    }
  }
};


page.NestedInlineFadeAwayConfirmation = Class.create();
page.NestedInlineFadeAwayConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, element,showCloseLink, insertBefore, time  )
  {
  var fadingDuration = time ? time : 2000;
  new page.NestedInlineConfirmation(type, message, showRefreshLink, element,showCloseLink, "", insertBefore );
  var elementToFade = insertBefore?element.previousSibling:element.nextSibling;

    setTimeout(
      function()
      {
        Element.fade( elementToFade, {duration:0.3} );
      }, fadingDuration );
  }
};

page.NestedInlineFadeAwaySingleConfirmation = Class.create();
page.NestedInlineFadeAwaySingleConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, element,showCloseLink, insertBefore, time, newDivId )
  {
  var fadingDuration = time ? time : 2000;
  new page.NestedInlineConfirmation(type, message, showRefreshLink, element,showCloseLink, "", insertBefore, false /*only one instance*/, null, null, null, null, newDivId );
  var elementToFade = insertBefore?element.previousSibling:element.nextSibling;

    setTimeout(
      function()
      {
        Element.fade( elementToFade, {duration:0.3} );
      }, fadingDuration );
  }
};

/**
 * Make sure the container as position: relative so that the offset can work
 */
page.MiniReceipt = Class.create();
page.MiniReceipt.prototype =
{
    initialize: function( message, containerElement, top, left, time )
    {
      var visibleDuration = time ? time : 2000;
      var top = top?top:-22; // usually show receipt above
      var left = left?left:0;
      var alreadyExistingReceipt = $( containerElement ).down( "div.miniReceipt" );
      if  ( alreadyExistingReceipt )
      {
        alreadyExistingReceipt.hide( );
      }
      var receiptHtml = '<div class="miniReceipt adding" style="display: none; top:' + top + 'px; left:'+ left + 'px" role="alert" aria-live="assertive">' + message + '</div>';
      var receiptElement = $( containerElement ).insert( { top:receiptHtml } ).firstDescendant( );
      $( containerElement ).select();
      receiptElement.show( );
      setTimeout(
        function()
        {
          Element.fade( receiptElement, {duration:0.3, afterFinish: function() { receiptElement.remove(); } } );
        }, visibleDuration );
    }
};

page.extendedHelp = function( helpattributes, windowName )
{
  window.helpwin = window.open('/webapps/blackboard/execute/viewExtendedHelp?' +
               helpattributes,windowName,'menubar=1,resizable=1,scrollbars=1,status=1,width=480,height=600');
  window.helpwin.focus();
};

page.decoratePageBanner = function()
{
  var bannerDiv = $('pageBanner');
  // TODO: review this logic - we used to actually add a style to containerDiv but
  // we do not need it anymore - does the pagetitlediv hiding depend on containerdiv existing?  probably, so leaving
  var containerDiv = $('contentPanel') || $('contentPane');
  if ( bannerDiv && containerDiv )
  {
    // hide empty title bar
    if ( !$('pageTitleText') && $('pageTitleDiv') )
    {
      $('pageTitleDiv').hide();
    }
  }
};

page.initializeSinglePopupPage = function( pageId )
{
  // Initialize the single popup page, make sure the window will be closed by clicking submit or cancel, and the parent
  // window will be refreshed after submit.
  var items = document.forms;
  for ( var i = 0; i < items.length; i++ )
  {
    var formItem = items[ i ];
    formItem.observe( 'submit', function()
    {
       (function()
       {
         window.close();
         if( window.opener.refreshConfirm )
         {
            window.opener.refreshConfirm(pageId);
         }
       }.defer());
    } );
    if ( formItem.top_Cancel )
    {
      Event.observe( formItem.top_Cancel, 'click', function( event )
      {
        Event.stop( event );
        window.close();
      } );
    }
    if ( formItem.bottom_Cancel )
    {

      Event.observe( formItem.bottom_Cancel, 'click', function( event )
      {
        Event.stop( event );
        window.close();
      } );
    }
  }
};

page.openLightbox = function( link, title, url, width, height )
{
  var lightboxParam =
  {
      defaultDimensions :
      {
          w : width ? width : 1000,
          h : height ? height : 800
      },
      contents : '<iframe src="' + url + '" width="100%" height="100%"/>',
      title : title,
      closeOnBodyClick : false,
      showCloseLink : true,
      useDefaultDimensionsAsMinimumSize : true
  };
  var lightboxInstance = new lightbox.Lightbox( lightboxParam );
  lightboxInstance.open();
};

page.printAndClose = function()
{
  (function() {
    window.print();
    window.close();
  }.defer());
};

/**
 * Utility for data collection step manipulation
 */
page.steps = {};
page.steps.HIDE = "hide";
page.steps.SHOW = "show";

/**
 * Hide or show an array of steps given the step ids and
 * renumber all visible steps on the page.
 *
 * @param action - either page.steps.HIDE or page.steps.SHOW
 * @param stepIdArr - string array of step ids
 */
page.steps.hideShowAndRenumber = function ( action, stepIdArr )
{
  // hide or show each of the step ids given
  ($A(stepIdArr)).each( function( stepId )
  {
      page.steps.hideShow( action, stepId );
  });

  // get all H3 elements that contain css class of "steptitle"
  var stepTitleTags = [];
  $A(document.getElementsByTagName('h3')).each( function( tag )
  {
    if ( page.util.hasClassName( tag, 'steptitle' ) )
    {
      stepTitleTags.push( $(tag) );
    }
  });

  // starting at number 1, renumber all of the visible steps
  var number = 1;
  stepTitleTags.each(function( stepTitleTag )
  {
    if ( stepTitleTag.up('div').visible() )
    {
      stepTitleTag.down('span').update(number);
      number++;
    }
  });
};

/**
 * Hide or show a single step given the step id.
 *
 * @param action - either page.steps.HIDE or page.steps.SHOW
 * @param stepId - string identifier to a single step
 */
page.steps.hideShow = function ( action, stepId )
{
  if ( action == page.steps.SHOW )
  {
    $(stepId).show();
  }
  else if ( action == page.steps.HIDE )
  {
    $(stepId).hide();
  }
};

page.showChangeTextSizeHelp = function( )
{
  page.extendedHelp('internalhandle=change_text_size&helpkey=change_text_size','change_text_size' );
  return false;
};

page.showAccessibilityOptions = function()
{
   var win = window.open('/webapps/portal/execute/changePersonalStyle?cmd=showAccessibilityOptions',
       'accessibilityOptions','menubar=1,resizable=1,scrollbars=1,status=1,width=480,height=600');
   win.focus();
};

page.toggleContrast = function( )
{
  new Ajax.Request('/webapps/portal/execute/changePersonalStyle?cmd=toggleContrast',
  {
    onSuccess: function(transport, json)
    {
      var fsWin;
      if (window.top.nav)
      {
        fsWin = window.top;
      }
      else if (window.opener && window.opener.top.nav)
      {
        fsWin = window.opener.top;
        window.close();
      }
      if (fsWin)
      {
        fsWin.nav.location.reload();
        fsWin.content.location.reload();
      }
      else
      {
        window.top.location.reload();
      }
    }
  });
  return false;
};

/**
 * IFrame-based shim used with popups so they render on top of all other page elements (including applets)
 */
page.popupShim = Class.create();
page.popupShim.prototype =
{
  initialize: function( popup )
  {
    this.popup = popup;
  },

  close: function( )
  {
    this.toggleOverlappingEmbeds( false );
  },

  open: function( )
  {
    this.toggleOverlappingEmbeds( true );
  },

  toggleOverlappingEmbeds: function( turnOff )
  {
    ['embed','object','applet','select'].each( function( tag ) {
      var elems = document.getElementsByTagName( tag );
      for ( var i = 0, l = elems.length; i < l; i++ )
      {
        var e = $(elems[i]);
        
        /* Only show/hide overlapping object if the element is visible in the first place, otherwise there is no point.
         * Note that visible() checks the display property, and behaves differently from the visibility property being 
         * set below, so we're safe when this method is being called with turn off|on.
         */
        if( e.visible() )
        {
          if ( !turnOff || ( page.util.elementsOverlap( this.popup, e ) && !e.descendantOf( this.popup ) ) )
          {
            elems[i].style.visibility = ( turnOff ? 'hidden' : '' );
          }
        }
      }
    }.bind( this ) );
  }
};

/**
 * Looks through the children of the specified element for links with the specified
 * class name, and if it finds any, autowires lightboxes to them.  If lightbox.js/effects.js
 * hasn't already been loaded, load it.
 */
page.LightboxInitializer = Class.create(
{
  initialize: function( className, parentElement, justThisParent )
  {
    this.className = className;
    if (justThisParent)
    {
      this.parentElement = parentElement;
    }
    var links = parentElement.getElementsByTagName('a');
    for ( var i = 0, l = links.length; i < l; i++ )
    {
      if ( page.util.hasClassName( links[i], className ) )
      {
        if ( window.lightbox && window.Effect)
        {
          this._autowire();
        }
        else
        {
          this._load();
        }
        break;
      }
    }
  },

  _autowire: function()
  {
    lightbox.autowireLightboxes( this.className, this.parentElement );
  },

  _load: function()
  {
    var h = $$('head')[0];
    // TODO: This code does not take version into account (so immediately after an upgrade this won't get the new file)... 
    var scs = ( !window.lightbox ? ['/javascript/ngui/lightbox.js'] : []).concat(
                !window.Effect ? ['/javascript/scriptaculous/effects.js'] : [] );
    scs.each( function( sc )
    {
      var s = new Element('script', { type: 'text/javascript', src: sc } );
      h.appendChild( s );
    });
    this._wait();
  },

  _wait: function()
  {
    var count = 0;
    new PeriodicalExecuter( function( pe )
    {
      if ( count < 100 )
      {
        count++;
        if ( window.lightbox && window.Effect )
        {
          pe.stop();
          this._autowire();
        }
      }
      else // give up if it takes longer than 5s to load lightbox.js/effects.js
      {
        pe.stop();
      }
    }.bind(this), 0.05 );
  }
});

page.YouTubeControls = {
  toggleAXControls : function( playerid, openYtControlsId, event )
  {
    if( $( playerid.sub( 'ytEmbed', 'controls' ) ).style.display != 'block' ) {
      $( playerid.sub( 'ytEmbed', 'controls' ) ).style.display = 'block';
      $( playerid.sub( 'ytEmbed', 'strip' ) ).style.display = 'block';
      $( openYtControlsId ).addClassName( 'liveAreaTab' );
      if ( window.lightbox && lightbox.getCurrentLightbox() )
      {
        lightbox.getCurrentLightbox()._resizeAndCenterLightbox( false );
      }

    }
    else
    {
      $( playerid.sub( 'ytEmbed', 'controls' ) ).style.display = 'none';
      $( playerid.sub( 'ytEmbed', 'strip' ) ).style.display = 'none';
      $( openYtControlsId ).removeClassName( 'liveAreaTab' );
      if ( window.lightbox && lightbox.getCurrentLightbox() )
      {
        lightbox.getCurrentLightbox()._resizeAndCenterLightbox( false );
      }

    }
    Event.stop( event );
  },
  formatTime : function ( sec )
  {
    var duration = parseInt( sec, 10 );
    var totalMinutes = Math.floor( duration / 60 );
    var hours = Math.floor( totalMinutes / 60 );
    var seconds = duration % 60;
    var minutes = totalMinutes % 60;
    if ( hours > 0 )
    {
      return hours + ':' + this.padZero( minutes ) + ':' + this.padZero( seconds );
    }
    else
    {
      return this.padZero( minutes ) + ':' + this.padZero( seconds );
    }
  },
  padZero : function ( number )
  {
    if (number < 10)
    {
      return "0" + number;
    }
    else
    {
      return number;
    }
  },
  updateButtonLabels : function ( ytplayer, muteBtnId, playBtnId, status )
  {
    if( ytplayer.isMuted() )
    {
      $( muteBtnId ).update( page.bundle.getString( 'yt.unmute' ) );
    }
    else
    {
      $( muteBtnId ).update( page.bundle.getString( 'yt.mute' ) );
    }
    if( status == 1 )
    {
      $( playBtnId ).update( page.bundle.getString( 'yt.pause' ) );
    }
    else
    {
      $( playBtnId ).update( page.bundle.getString( 'yt.play' ) );
    }
  },
  updateIframeButtonLabels : function ( ytplayer, muteBtnId, playBtnId, status )
  {
    if ( typeof ytplayer.isMuted !== 'undefined'  ) {
    if( ytplayer.isMuted() )
    {
      $( muteBtnId ).update( page.bundle.getString( 'yt.unmute' ) );
    }
    else
    {
      $( muteBtnId ).update( page.bundle.getString( 'yt.mute' ) );
    }
    }
    if( status == 1 )
    {
      $( playBtnId ).update( page.bundle.getString( 'yt.pause' ) );
    }
    else
    {
      $( playBtnId ).update( page.bundle.getString( 'yt.play' ) );
    }
  }  
};

function onYouTubePlayerReady( playerid )
{
  var ytplayer = $( playerid );
  if( !ytplayer )
  { //ie fix: grab object tag instead of embed tag
    var objTagId = playerid.sub( 'ytEmbed', 'ytObject' );
    ytplayer = $( objTagId );
  }
  var playBtnId = playerid.sub( 'ytEmbed', 'playVideo' );
  Event.observe( $( playBtnId ), 'click',
    function( event ) {
      if( ytplayer.getPlayerState() == 1 )
      {
        ytplayer.pauseVideo();
      }
      else
      {
        ytplayer.playVideo();
      }
      Event.stop( event );
    }
  );
  var stopBtnId = playerid.sub( 'ytEmbed', 'stopVideo' );
  Event.observe( $( stopBtnId ), 'click',
    function( event ) {
      ytplayer.pauseVideo();
      ytplayer.seekTo( "0" );
      $( playBtnId ).update( page.bundle.getString( 'yt.play' ) );
      Event.stop( event );
    }
  );
  var volUpBtnId = playerid.sub( 'ytEmbed', 'volUp' );
  Event.observe( $( volUpBtnId ), 'click',
    function( event ) {
      var currVol = ytplayer.getVolume();
      if( currVol > 89 )
      {
        ytplayer.setVolume( 100 );
      }
      else
      {
        ytplayer.setVolume( currVol + 10 );
      }
      Event.stop( event );
    }
  );
  var volDownBtnId = playerid.sub( 'ytEmbed', 'volDown' );
  Event.observe( $( volDownBtnId ), 'click',
    function( event ) {
      var currVol = ytplayer.getVolume();
      if( currVol < 11 )
      {
        ytplayer.setVolume( 0 );
      }
      else
      {
        ytplayer.setVolume( currVol - 10 );
      }
      Event.stop( event );
    }
  );
  var muteBtnId = playerid.sub( 'ytEmbed', 'mute' );
  Event.observe( $( muteBtnId ), 'click',
    function( event ) {
      if( ytplayer.isMuted() )
      {
        ytplayer.unMute();
      }
      else
      {
        ytplayer.mute();
      }
      Event.stop( event );
    }
  );
  var timeDivId = playerid.sub( 'ytEmbed', 'currentTime' );
  var statusDivId = playerid.sub( 'ytEmbed', 'currentStatus');
  var dtTime = new Date();
  new PeriodicalExecuter( function( pe )
  {
    //lightbox closed, so stop this PeriodicalExecuter
    if( !$( timeDivId ) )
    {
      pe.stop();
      return;
    }
    //update the current time
    $( timeDivId ).update( page.YouTubeControls.formatTime( ytplayer.getCurrentTime() ) );
    //update the current status
    var status = ytplayer.getPlayerState();
    var statusStr = page.bundle.getString( 'yt.stopped' );
    switch( status )
    {
    case -1 : statusStr = page.bundle.getString( 'yt.stopped' ); break;
    case 0  : statusStr = page.bundle.getString( 'yt.ended' ); break;
    case 1  : statusStr = page.bundle.getString( 'yt.playing' ); break;
    case 2  : statusStr = page.bundle.getString( 'yt.paused' ); break;
    case 3  : statusStr = page.bundle.getString( 'yt.buffering' ); break;
    case 5  : statusStr = page.bundle.getString( 'yt.cued' ); break;
    }
    page.YouTubeControls.updateButtonLabels( ytplayer, muteBtnId, playBtnId, status );

    $( statusDivId ).update( statusStr );
  }.bind(this), 0.5 );

  //wire the open/close controls wrapper
  var openYtControlsId = playerid.sub( 'ytEmbed', 'openYtControls' );
  Event.observe( $( openYtControlsId ), 'click',
    function( event ) {
      page.YouTubeControls.toggleAXControls( playerid, openYtControlsId, event );
    }
  );
  var closeYtControlsId = playerid.sub( 'ytEmbed', 'closeYtControls' );
  Event.observe( $( closeYtControlsId ), 'click',
    function( event ) {
      page.YouTubeControls.toggleAXControls( playerid, openYtControlsId, event );
    }
  );
};

var youtubeisready;
var tag = document.createElement( 'script' );
tag.src = "//www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName( 'script' )[ 0 ];
firstScriptTag.parentNode.insertBefore( tag, firstScriptTag );

function onYouTubeIframeAPIReady()
{
  youtubeisready = true;
  page.util.bbPreptextareasforyoutube();
};

page.util.bbPreptextareasforyoutube = function(frameIds)
{
  if( youtubeisready )
  {
    if ( !frameIds ) 
    {
      frameIds = $$( '.ytIframeClass' );
    }
    var ytPlayers = [];
    frameIds.each( function( frameId )
    {
      var ytPlayerId = frameId.id;
      var controlsId = ytPlayerId.replace("ytEmbed","");
      var frameData = frameId.outerHTML;
      var videoId = "";
      if( frameData.indexOf('//www.youtube.com/embed') != -1 )
      {
        videoId = frameData.match("//www.youtube.com/embed/([\\d\\w-_]+)")[1];
      }
      
      if( frameData.indexOf('//www.youtube.com/v') != -1 )
      {
        videoId = frameData.match("//www.youtube.com/v/([\\d\\w-_]+)")[1];
      }
     
      if( videoId  === "" )
        return;
      
  		ytPlayerId.replace("ytEmbed", "videoId");
  		var ytplayer = new YT.Player(frameId, {
  		    videoId : videoId,
  		    playerVars : {
  	          wmode: 'transparent',
  	          rel : 0,
  	          modestbranding : 1,
  	          menu: 'disable'
  			},
  			events : {
  				'onReady' : onPlayerReady,
  				'onStateChange' : onytplayerStateChange,
  				'onError' : onPlayerError
  			}
  		});
      
      ytPlayers.push(ytplayer);
      var playBtnId = $("playVideo" + controlsId );
      Event.observe( playBtnId, 'click', function( event )
      {
        if ( ytplayer.getPlayerState() == 1 )
        {
          ytplayer.pauseVideo();
        }
        else
        {
          ytplayer.playVideo();
        }
        Event.stop( event );
      } );
      var stopBtnId = $("stopVideo" + controlsId );
      Event.observe(  stopBtnId , 'click', function( event )
      {
        ytplayer.pauseVideo();
        ytplayer.seekTo( "0" );
        $( playBtnId ).update( page.bundle.getString( 'yt.play' ) );
        Event.stop( event );
      } );
      var volUpBtnId = $("volUp" + controlsId );
      Event.observe( volUpBtnId , 'click',
        function( event ) {
          var currVol = ytplayer.getVolume();
          if( currVol > 89 )
          {
            ytplayer.setVolume( 100 );
          }
          else
          {
            ytplayer.setVolume( currVol + 10 );
          }
          Event.stop( event );
        }
      );
      var volDownBtnId = $("volDown" + controlsId );
      Event.observe( volDownBtnId, 'click',
        function( event ) {
          var currVol = ytplayer.getVolume();
          if( currVol < 11 )
          {
            ytplayer.setVolume( 0 );
          }
          else
          {
            ytplayer.setVolume( currVol - 10 );
          }
          Event.stop( event );
        }
      );
      var muteBtnId = $("mute" + controlsId );
      Event.observe( muteBtnId, 'click',
        function( event ) {
        if ( typeof ytplayer.isMuted !== 'undefined'  ) {
          if( ytplayer.isMuted() )
          {
            ytplayer.unMute();
          }
          else
          {
            ytplayer.mute();
          }
        }
          Event.stop( event );
        }
      );    
     
      var timeDivId = ytPlayerId.sub( 'ytEmbed', 'currentTime' );
      var statusDivId = ytPlayerId.sub( 'ytEmbed', 'currentStatus');
      var dtTime = new Date();
      new PeriodicalExecuter( function( pe )
      {
        //lightbox closed, so stop this PeriodicalExecuter
        if( !$( timeDivId ) )
        {
          pe.stop();
          return;
        }
        //update the current time
        if ( typeof ytplayer.getCurrentTime !== 'undefined'  )
        {
          $( timeDivId ).update( page.YouTubeControls.formatTime( ytplayer.getCurrentTime() ) );
        }
        //update the current status
        var status = -1;
        if ( typeof ytplayer.getPlayerState !== 'undefined'  )
        {
          status = ytplayer.getPlayerState();
        }
        var statusStr = page.bundle.getString( 'yt.stopped' );
        switch( status )
        {
        case -1 : statusStr = page.bundle.getString( 'yt.stopped' ); break;
        case 0  : statusStr = page.bundle.getString( 'yt.ended' ); break;
        case 1  : statusStr = page.bundle.getString( 'yt.playing' ); break;
        case 2  : statusStr = page.bundle.getString( 'yt.paused' ); break;
        case 3  : statusStr = page.bundle.getString( 'yt.buffering' ); break;
        case 5  : statusStr = page.bundle.getString( 'yt.cued' ); break;
        }
        page.YouTubeControls.updateIframeButtonLabels( ytplayer, muteBtnId, playBtnId, status );
  
        $( statusDivId ).update( statusStr );
      }.bind(this), 0.5 );
      
      //wire the open/close controls wrapper
      var openYtControlsId =$("openYtControls" + controlsId);
      Event.observe( openYtControlsId, 'click', function( event )
      {
        page.YouTubeControls.toggleAXControls( ytPlayerId, openYtControlsId, event );
      } );
      var closeYtControlsId = ytPlayerId.sub( 'ytEmbed', 'closeYtControls' );
      Event.observe( $( closeYtControlsId ), 'click', function( event )
      {
        page.YouTubeControls.toggleAXControls( ytPlayerId, openYtControlsId, event );
      } );
    } 
    );
  }
  return ytPlayers;
};

function onPlayerReady( event )
{
  event.target.stopVideo();
};

function onPlayerError( event )
{
  event.target.stopVideo();
};

function onytplayerStateChange( event )
{
  if ( event.data === 0 ) 
  {
    event.target.playVideo();
    event.target.stopVideo();
  }
};

page.util.flyoutMenuMainButtonKeyboardHandler = function( event )
{
  var key = event.keyCode || event.which;
  if (key == Event.KEY_LEFT || key == Event.KEY_RIGHT)
  {
    var elem = Event.element( event );
    var target = elem.up( 'li' );
    while ( true )
    {
      if ( key == Event.KEY_LEFT )
      {
        target = target.previous();
      }
      else if ( key == Event.KEY_RIGHT )
      {
        target = target.next();
      }
      if ( !target || page.util.hasClassName( target, 'sub' ) ||
                      page.util.hasClassName( target, 'mainButton' ) ||
                      page.util.hasClassName( target, 'mainButtonType' ) )
      {
        break;
      }
    }
    if ( target )
    {
      var menuLinks = $A( target.getElementsByTagName( 'a' ) );
      if ( menuLinks && menuLinks.length > 0 )
      {
        menuLinks[ 0 ].focus();
        Event.stop( event );
      }
    }
  }
};

page.util.initFlyoutMenuBehaviourForListActionMenuItems = function( container ) {
  //Initialize accessible flyout menu behavior
  if ( !container )
  {
    container = document;
  }
  var uls = document.getElementsByTagName('ul');
  if (uls) {
    var numUls = uls.length;
    for (var i = 0; i < numUls; i++) {
      var ul = uls[i];
      if (page.util.hasClassName(ul, 'nav')) {
        var lis = ul.getElementsByTagName('li');
        if (lis) {
          var numLis = lis.length;
          for (var j = 0; j < numLis; j++) {
            var li = lis[j];
            if (page.util.hasClassName(li, 'sub')) {
              new page.FlyoutMenu($(li));
            } else if (page.util.hasClassName(li, 'mainButton') || page.util.hasClassName(li, 'mainButtonType')) {
              var menuLinks = $A($(li).getElementsByTagName('a'));
              if (menuLinks && menuLinks.length > 0) {
                Event.observe(menuLinks[0], 'keydown', page.util.flyoutMenuMainButtonKeyboardHandler.bindAsEventListener(menuLinks[0]));
              }
            }
          }
        }
      }
    }
  }
};

page.util.getMaxContentHeight = function( iframeElement )
{
  var maxHeight = iframeElement.contentWindow.document.body.scrollHeight;
  var frameElements;
  var iframeElements;
  if ( iframeElement.contentDocument )
  {
    // getElementsByTagName() returns a NodeList object, which is immutable and cannot easily be converted to an array
    frameElements = iframeElement.contentDocument.getElementsByTagName("frame");
    iframeElements = iframeElement.contentDocument.getElementsByTagName("iframe");
  }

  var i = 0;
  var frameHeight;
  var frameElement;

  for( i = 0; i < frameElements.length; i++ )
  {
    frameElement = frameElements[i];

    if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
    {
      frameHeight = frameElement.contentWindow.document.body.scrollHeight;
    }

    if( frameHeight > maxHeight )
    {
      maxHeight = frameHeight;
    }
  }

  for( i = 0; i < iframeElements.length; i++ )
  {
    frameElement = iframeElements[i];

    if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
    {
      frameHeight = frameElement.contentWindow.document.body.scrollHeight;
    }

    if( frameHeight > maxHeight )
    {
      maxHeight = frameHeight;
    }
  }

  return maxHeight;
};

page.util.getMaxContentWidth = function( iframeElement )
{
  var maxWidth = iframeElement.contentWindow.document.body.scrollWidth;
  var frameElements;
  var iframeElements;
  if ( iframeElement.contentDocument )
  {
    // getElementsByTagName() returns a NodeList object, which is immutable and cannot easily be converted to an array
    frameElements = iframeElement.contentDocument.getElementsByTagName("frame");
    iframeElements = iframeElement.contentDocument.getElementsByTagName("iframe");
  }

  var i = 0;
  var frameWidth;
  var frameElement;

  for( i = 0; i < frameElements.length; i++ )
  {
    frameElement = frameElements[i];

    if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
    {
      frameWidth = frameElement.contentWindow.document.body.scrollWidth;
    }

    if( frameWidth > maxWidth )
    {
      maxWidth = frameWidth;
    }
  }

  for( i = 0; i < iframeElements.length; i++ )
  {
    frameElement = iframeElements[i];

    if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
    {
      frameWidth = frameElement.contentWindow.document.body.scrollWidth;
    }

    if( frameWidth > maxWidth )
    {
      maxWidth = frameWidth;
    }
  }

  return maxWidth;
};

page.subheaderCleaner =
{
  init : function( entityKind )
  {
  var allHidden = true;
  var firstUl = null;
  var className = 'portletList-img courseListing ' + entityKind;
  $A( document.getElementsByClassName( className ) ).each( function( ul ) {
      if ( !ul.down() )
      {
        ul.previous( 'h3' ).hide();
        ul.hide();
        if ( !firstUl )
        {
          firstUl = ul;
        }
      }
      else
      {
        allHidden = false;
      }
    });
    if ( allHidden && firstUl )
    {
      firstUl.up( 'div' ).previous( 'div' ).show();
    }
  }
};

 /**
  * Set up any JavaScript that will always be run on load (that doesn't depend on
  * any application logic / localization) here.
  *
  * Please leave this at the bottom of the file so it's easy to find.
  *
  */
FastInit.addOnLoad( function()
{
  Event.observe( document.body, "click", page.ContextMenu.closeAllContextMenus.bindAsEventListener( window ) );

  Event.observe( document.body, "click", page.ContextMenu.alignArrowsInBreadcrumb.bindAsEventListener( window ) );

  Event.observe( document.body, 'keydown', function(event) {
    var key = event.keyCode || event.which;
    if ( key == 116 )  // reload current page on F5 key press
    {
      Event.stop( event );  // prevent browser from reloading complete frameset
      if ( Prototype.Browser.IE )
      {
        event.keyCode = 0;
      }
      (function() { window.location.reload( true ); }.defer());
      return false;
    }
  });

  page.util.initFlyoutMenuBehaviourForListActionMenuItems();

  if ( $('breadcrumbs') )
  {
    new page.BreadcrumbExpander($('breadcrumbs'));
    // If we're in the content wrapper, hide the content wrapper breadcrumb frame
    // so that we don't get stacked breadcrumbs.
    if ( window.name === 'contentFrame' )
    {
      var parent = window.parent;
      if ( parent )
      {
        var frameset = parent.document.getElementById( 'contentFrameset' );
        if ( frameset )
        {
          frameset.rows = "*,100%";
        }
      }
    }
  }

  var contentPane = $('contentPanel') || $('portalPane');
  if ( contentPane )
  {
    new page.LightboxInitializer( 'lb', contentPane );
  }

  // add a label for inventory table checkboxes, if needed
  $A(document.getElementsByTagName("table")).each( function( table )
  {
    if ( !page.util.hasClassName( table, 'inventory' ) )
    {
      return;
    }
    var rows = table.rows;
    if ( rows.length < 2 )
    {
      return;
    }
    for (var r = 0, rlen = rows.length - 1; r < rlen; r++)
    {
      var cells = rows[r+1].cells; // skip header row
      for (var c = 0, clen = cells.length; c < clen; c++)
      {
        var cell = $(cells[c]);
        var inp = cell.down('input');

        if ( !inp || ( inp.type != 'checkbox' && inp.type != 'radio' ) )
        {
          // We're only looking for checkbox/radio cells to label, so move on
          continue;
        }

        var lbl = cell.down('label');

        if (lbl && !lbl.innerHTML.blank())
        {
          break; // skip cells that already have a non-blank label
        }

        if ( !lbl )
        {  // add new label to checkbox
          lbl = new Element('label', {htmlFor: inp.id} );
          lbl.addClassName('hideoff');
          cell.insert({bottom:lbl});
        }
        var headerCell = $(cell.parentNode).down('th');
        if ( !headerCell )
        {
          break; // skip rows without header cell
        }

        // create a temporary clone of the header cell and remove any hidden divs I.e. context menus
        var tempCell = $(headerCell.cloneNode(true));
        var tempCellDivs = tempCell.getElementsByTagName("div");
        for ( var i = 0; i < tempCellDivs.length; i++ )
        {
          var d = tempCellDivs[i];
          if ( d && !$(d).visible() )
          {
            d.remove();
          }
        }
        var lblBody = tempCell.innerHTML.replace( /<\/?[^>]*>/g, '' );  // strip html tags from header
        lblBody = page.bundle.getString('inventoryList.select.item', lblBody);
        lbl.update( lblBody );  // set label to header contents (minus tags)
        break;
      }
    }
  });

  //set default font sizes to display text. hack to fix IE7 default font size issue.
  var sizes = {1:'xx-small', 2:'x-small', 3:'small', 4:'medium', 5:'large', 6:'x-large', 7:'xx-large'};
  var fonts = document.getElementsByTagName('font');
  for ( var i = 0; i < fonts.length; i++ )
  {
    var font = fonts[i];
    if ( font.size )
    {
      // Since some font elements may be manually created by end users we have to handle random
      // values in here.
      if (!font.size.startsWith("+") && !font.size.startsWith("-"))
      {
        var fsize = parseInt(font.size, 10);
        if (fsize > 0 && fsize < 8)
        {
          font.style.fontSize = sizes[fsize];
        }
      }
    }
  }

  page.scrollToEnsureVisibleElement();
  page.isLoaded = true;

});

/**
 * Class for adding an insertion marker within a list
 */
page.ListInsertionMarker = Class.create();
page.ListInsertionMarker.prototype =
{
  initialize: function( listId, position, key, text )
  {
    var list = $(listId);
    var listElements = list.childElements();
    // create a marker list item
    var marker = new Element('li',{'id':listId+':'+key, 'class':'clearfix separator' });
    marker.update('<h3 class="item" id=""><span class="reorder editmode"><span><img alt="" src="/images/ci/icons/generic_updown.gif"></span></span><span class="line"></span><span class="text">'+text+'</span></h3>');
    //marker.setStyle({  position: 'relative', minHeight: '10px', padding: '0px', background: '#CCCCCC' });
    position = ( position > listElements.length ) ? listElements.length : position;

    // add marker to list
    if (listElements.length === 0)
    {
      list.insert({top:marker}); // add marker to top of empty list
    }
    else if (listElements.length == position)
    {
      list.insert({bottom:marker});  // add marker after last element
    }
    else
    {
      listElements[position].insert({before:marker});  // add marker before element at position
    }

    var select = $('reorderControls'+listId).down('select');
    // add a option for the marker to the keyboard repostioning select, if any
    if (select)
    {
      var option = new Element('option',{'value':key}).update( '-- '+text+' --' );
      if (listElements.length === 0)
      {
        select.insert({top:option});
      }
      else if (listElements.length == position)
      {
        select.insert({bottom:option});
      }
      else
      {
        $(select.options[position]).insert({before:option});
      }
    }
  }
};

page.scrollToEnsureVisibleElement = function( )
{
  var params = window.location.search.parseQuery();
  var ensureVisibleId = params.ensureVisibleId;
  if ( !ensureVisibleId )
  {
    return;
  }
  var ensureVisibleElement = $(ensureVisibleId);
  if ( !ensureVisibleElement )
  {
    return;
  }
  var pos = ensureVisibleElement.cumulativeOffset();
  var scrollY = pos.top;
  var bodyHeight = $( document.body ).getHeight();
  if (scrollY + ensureVisibleElement.getHeight() < bodyHeight)
  {
    return; // element is already visible
  }

  var receipt = $('inlineReceipt_good');
  if ( receipt && receipt.visible() ) // pin receipt to top
  {
    var offset = receipt.cumulativeOffset();
    offset.top = 0;
    var w = parseInt(receipt.getStyle('width'), 10);
    if ( Prototype.Browser.IE ) // width in IE includes border & padding, need to remove it
    {
      var bw = parseInt(receipt.getStyle('borderLeftWidth'), 10) + parseInt(receipt.getStyle('borderRightWidth'), 10);
      var pw = parseInt(receipt.getStyle('paddingLeft'), 10) + parseInt(receipt.getStyle('paddingRight'), 10);
      w = w - bw - pw;
    }
    receipt.setStyle({
      position:"fixed",
      zIndex:"1000",
      left: offset.left + "px",
      top: offset.top + "px",
      width: w + "px"});
    scrollY = scrollY -  2 * receipt.getHeight();
  }
  // scroll window to show ensureVisibleElement
  window.scrollTo(0, scrollY );
};

/**
 * Recursively walks up the frameset stack asking each window to change their
 * document.domain attribute in anticipation of making a cross-site scripting
 * call to an LMS integration.
 *
 * <p>This should only be called from popup windows, as changing the document.domain
 * value of a window that is going to be reused later could do surprising things.
 *
 * @param domain Domain name shared by the Learn and LMS servers.
 */
page.setLmsIntegrationDomain = function( domain )
{
  if ( '' == domain )
  {
    return;
  }

  try
  {
    if ( parent.page.setLmsIntegrationDomain )
    {
      parent.page.setLmsIntegrationDomain( domain );
  }
  }
  catch ( err ) { /* Ignore */ }

  document.domain = domain;
};

page.refreshTopFrame = function()
{
  if ( window.top.nav )
  {
    window.top.nav.location.reload();
  }
};

// See BreadcrumbBarRenderer.java for code that calls this method.
page.rewriteTaskStatusUntilDone = function( spanId, taskId, courseId )
{
  var theSpan = $(spanId);
  if (theSpan)
  {
    new Ajax.Request("/webapps/blackboard/execute/getSystemTaskStatus?taskId=" + taskId + "&course_id=" + courseId ,
                     {
                       method: 'post',
                       onSuccess: function(transport, json)
                       {
                         var result = transport.responseText.evalJSON( true );
                         theSpan = $(spanId); // reload it just in case it was removed between the request and response
                         if (theSpan)
                         {
                           theSpan.update(result.text);
                           if (result.complete == "false")
                           {
                             setTimeout(function() {page.rewriteTaskStatusUntilDone(spanId, taskId, courseId);}, 3000);
                           }
                         }
                       },
                       onFailure: function(transport, json)
                       {
                         theSpan = $(spanId); //reload the span as above
                         if (theSpan)
                         {
                           theSpan.hide();
                           $(spanId+'error').show();
                         }
                       }
                     });
  }
};

/*
 * Clean up the task id which associated with the specified course, so that the inline warning does not show up again
 */
page.cleanTaskId = function( courseId )
{
  // we don't care about the result, at worse it will display again on the next page
  var url = "/webapps/blackboard/execute/courseMain?action=cleanTaskId&course_id=" + courseId +
            "&sessionId=" + getCookie( 'JSESSIONID' );
  new Ajax.Request( url, { method: 'post' } );
};

//that doesn't then any code utilizing these methods will not work 'as expected'. Current usage
//as/of the writing of this code is "ok" with that - the user won't get the perfect experience but it won't completely fail either.
page.putInSessionStorage = function( key, value )
{
  if ( typeof sessionStorage !== 'undefined' )
  {
    sessionStorage[ getCookie( 'JSESSIONID' ) + key ] = value;
  }
};

// any code utilizing these methods must have separately included cookie.js
// since we don't always include cookie.js
page.getFromSessionStorage = function( key )
{
  if ( typeof sessionStorage !== 'undefined' )
  {
    return sessionStorage[ getCookie( 'JSESSIONID' ) + key ];
  }
  return undefined;
};

page.aria = {};

page.aria.show = function ( element )
{
  $(element).show();
  element.setAttribute("aria-expanded", "true");
};

page.aria.hide = function ( element )
{
  $(element).hide();
  element.setAttribute("aria-expanded", "false");
};

page.aria.toggle = function ( element )
{
  if (Element.visible($(element)))
  {
    page.aria.hide(element);
  }
  else
  {
    page.aria.show(element);
  }
};

}
// ===================================================================
// Author: Matt Kruse <matt@mattkruse.com>
// WWW: http://www.mattkruse.com/
//
// NOTICE: You may use this code for any purpose, commercial or
// private, without any further permission from the author. You may
// remove this notice from your final code if you wish, however it is
// appreciated by the author if at least my web site address is kept.
//
// You may *NOT* re-distribute this code in any way except through its
// use. That means, you can include it in your product, or your web
// site, or any other form where the code is actually being used. You
// may not put the plain javascript up on your site for download or
// include it in your javascript libraries for download.
// If you wish to share this code with others, please just point them
// to the URL instead.
// Please DO NOT link directly to my .js files from your site. Copy
// the files to your server and use them there. Thank you.
// ===================================================================

// HISTORY
// ------------------------------------------------------------------
// May 17, 2003: Fixed bug in parseDate() for dates <1970
// March 11, 2003: Added parseDate() function
// March 11, 2003: Added "NNN" formatting option. Doesn't match up
//                 perfectly with SimpleDateFormat formats, but
//                 backwards-compatability was required.

// ------------------------------------------------------------------
// These functions use the same 'format' strings as the
// java.text.SimpleDateFormat class, with minor exceptions.
// The format string consists of the following abbreviations:
//
// Field        | Full Form          | Short Form
// -------------+--------------------+-----------------------
// Year         | yyyy (4 digits)    | yy (2 digits), y (2 or 4 digits)
// Month        | MMM (name or abbr.)| MM (2 digits), M (1 or 2 digits)
//              | NNN (abbr.)        |
// Day of Month | dd (2 digits)      | d (1 or 2 digits)
// Day of Week  | EE (name)          | E (abbr)
// Hour (1-12)  | hh (2 digits)      | h (1 or 2 digits)
// Hour (0-23)  | HH (2 digits)      | H (1 or 2 digits)
// Hour (0-11)  | KK (2 digits)      | K (1 or 2 digits)
// Hour (1-24)  | kk (2 digits)      | k (1 or 2 digits)
// Minute       | mm (2 digits)      | m (1 or 2 digits)
// Second       | ss (2 digits)      | s (1 or 2 digits)
// AM/PM        | a                  |
//
// NOTE THE DIFFERENCE BETWEEN MM and mm! Month=MM, not mm!
// Examples:
//  "MMM d, y" matches: January 01, 2000
//                      Dec 1, 1900
//                      Nov 20, 00
//  "M/d/yy"   matches: 01/20/00
//                      9/2/00
//  "MMM dd, yyyy hh:mm:ssa" matches: "January 01, 2000 12:30:45AM"
// ------------------------------------------------------------------

var MONTH_NAMES=new Array('January','February','March','April','May','June','July','August','September','October','November','December','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec');
var DAY_NAMES=new Array('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sun','Mon','Tue','Wed','Thu','Fri','Sat');
function LZ(x) {return(x<0||x>9?"":"0")+x}

// ------------------------------------------------------------------
// isDate ( date_string, format_string )
// Returns true if date string matches format of format string and
// is a valid date. Else returns false.
// It is recommended that you trim whitespace around the value before
// passing it to this function, as whitespace is NOT ignored!
// ------------------------------------------------------------------
function isDate(val,format) {
  var date=getDateFromFormat(val,format);
  if (date==0) { return false; }
  return true;
  }

// -------------------------------------------------------------------
// compareDates(date1,date1format,date2,date2format)
//   Compare two date strings to see which is greater.
//   Returns:
//   1 if date1 is greater than date2
//   0 if date2 is greater than date1 of if they are the same
//  -1 if either of the dates is in an invalid format
// -------------------------------------------------------------------
function compareDates(date1,dateformat1,date2,dateformat2) {
  var d1=getDateFromFormat(date1,dateformat1);
  var d2=getDateFromFormat(date2,dateformat2);
  if (d1==0 || d2==0) {
    return -1;
    }
  else if (d1 > d2) {
    return 1;
    }
  return 0;
  }

// ------------------------------------------------------------------
// formatDate (date_object, format)
// Returns a date in the output format specified.
// The format string uses the same abbreviations as in getDateFromFormat()
// ------------------------------------------------------------------
function formatDate(date,format) {
  format=format+"";
  var result="";
  var i_format=0;
  var c="";
  var token="";
  var y=date.getYear()+"";
  var M=date.getMonth()+1;
  var d=date.getDate();
  var E=date.getDay();
  var H=date.getHours();
  var m=date.getMinutes();
  var s=date.getSeconds();
  var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,H,KK,K,kk,k;
  // Convert real date parts into formatted versions
  var value=new Object();
  if (y.length < 4) {y=""+(y-0+1900);}
  value["y"]=""+y;
  value["yyyy"]=y;
  value["yy"]=y.substring(2,4);
  value["M"]=M;
  value["MM"]=LZ(M);
  value["MMM"]=MONTH_NAMES[M-1];
  value["NNN"]=MONTH_NAMES[M+11];
  value["d"]=d;
  value["dd"]=LZ(d);
  value["E"]=DAY_NAMES[E+7];
  value["EE"]=DAY_NAMES[E];
  value["H"]=H;
  value["HH"]=LZ(H);
  if (H==0){value["h"]=12;}
  else if (H>12){value["h"]=H-12;}
  else {value["h"]=H;}
  value["hh"]=LZ(value["h"]);
  if (H>11){value["K"]=H-12;} else {value["K"]=H;}
  value["k"]=H+1;
  value["KK"]=LZ(value["K"]);
  value["kk"]=LZ(value["k"]);
  if (H > 11) { value["a"]="PM"; }
  else { value["a"]="AM"; }
  value["m"]=m;
  value["mm"]=LZ(m);
  value["s"]=s;
  value["ss"]=LZ(s);
  while (i_format < format.length) {
    c=format.charAt(i_format);
    token="";
    while ((format.charAt(i_format)==c) && (i_format < format.length)) {
      token += format.charAt(i_format++);
      }
    if (value[token] != null) { result=result + value[token]; }
    else { result=result + token; }
    }
  return result;
  }

// ------------------------------------------------------------------
// formatUTCDate (date_object, format)
// Returns a date in the output format specified.
// date_object is a UTC date
// The format string uses the same abbreviations as in getDateFromFormat()
// The following article explains how UTC comes into play:
// http://blogs.msdn.com/marcelolr/archive/2008/06/04/javascript-date-utc-and-local-times.aspx
// ------------------------------------------------------------------
function formatUTCDate(date,format) {
  format=format+"";
  var result="";
  var i_format=0;
  var c="";
  var token="";
  var y=date.getUTCFullYear()+"";
  var M=date.getUTCMonth()+1;
  var d=date.getUTCDate();
  var E=date.getUTCDay();
  var H=date.getUTCHours();
  var m=date.getUTCMinutes();
  var s=date.getUTCSeconds();
  var yyyy,yy,MMM,MM,dd,hh,h,mm,ss,ampm,HH,H,KK,K,kk,k;
  // Convert real date parts into formatted versions
  var value=new Object();
  if (y.length < 4) {y=""+(y-0+1900);}
  value["y"]=""+y;
  value["yyyy"]=y;
  value["yy"]=y.substring(2,4);
  value["M"]=M;
  value["MM"]=LZ(M);
  value["MMM"]=MONTH_NAMES[M-1];
  value["NNN"]=MONTH_NAMES[M+11];
  value["d"]=d;
  value["dd"]=LZ(d);
  value["E"]=DAY_NAMES[E+7];
  value["EE"]=DAY_NAMES[E];
  value["H"]=H;
  value["HH"]=LZ(H);
  if (H==0){value["h"]=12;}
  else if (H>12){value["h"]=H-12;}
  else {value["h"]=H;}
  value["hh"]=LZ(value["h"]);
  if (H>11){value["K"]=H-12;} else {value["K"]=H;}
  value["k"]=H+1;
  value["KK"]=LZ(value["K"]);
  value["kk"]=LZ(value["k"]);
  if (H > 11) { value["a"]="PM"; }
  else { value["a"]="AM"; }
  value["m"]=m;
  value["mm"]=LZ(m);
  value["s"]=s;
  value["ss"]=LZ(s);
  while (i_format < format.length) {
    c=format.charAt(i_format);
    token="";
    while ((format.charAt(i_format)==c) && (i_format < format.length)) {
      token += format.charAt(i_format++);
      }
    if (value[token] != null) { result=result + value[token]; }
    else { result=result + token; }
    }
  return result;
  }

// ------------------------------------------------------------------
// Utility functions for parsing in getDateFromFormat()
// ------------------------------------------------------------------
function _isInteger(val) {
  var digits="1234567890";
  for (var i=0; i < val.length; i++) {
    if (digits.indexOf(val.charAt(i))==-1) { return false; }
    }
  return true;
  }
function _getInt(str,i,minlength,maxlength) {
  for (var x=maxlength; x>=minlength; x--) {
    var token=str.substring(i,i+x);
    if (token.length < minlength) { return null; }
    if (_isInteger(token)) { return token; }
    }
  return null;
  }

// ------------------------------------------------------------------
// getDateFromFormat( date_string , format_string )
//
// This function takes a date string and a format string. It matches
// If the date string matches the format string, it returns the
// getTime() of the date. If it does not match, it returns 0.
// ------------------------------------------------------------------
function getDateFromFormat(val,format) {
  val=val+"";
  format=format+"";
  var i_val=0;
  var i_format=0;
  var c="";
  var token="";
  var token2="";
  var x,y;
  var now=new Date();
  var year=now.getYear();
  var month=now.getMonth()+1;
  var date=1;
  var hh=now.getHours();
  var mm=now.getMinutes();
  var ss=now.getSeconds();
  var ampm="";

  while (i_format < format.length) {
    // Get next token from format string
    c=format.charAt(i_format);
    token="";
    while ((format.charAt(i_format)==c) && (i_format < format.length)) {
      token += format.charAt(i_format++);
      }
    // Extract contents of value based on format token
    if (token=="yyyy" || token=="yy" || token=="y") {
      if (token=="yyyy") { x=4;y=4; }
      if (token=="yy")   { x=2;y=2; }
      if (token=="y")    { x=2;y=4; }
      year=_getInt(val,i_val,x,y);
      if (year==null) { return 0; }
      i_val += year.length;
      if (year.length==2) {
        if (year > 70) { year=1900+(year-0); }
        else { year=2000+(year-0); }
        }
      }
    else if (token=="MMM"||token=="NNN"){
      month=0;
      for (var i=0; i<MONTH_NAMES.length; i++) {
        var month_name=MONTH_NAMES[i];
        if (val.substring(i_val,i_val+month_name.length).toLowerCase()==month_name.toLowerCase()) {
          if (token=="MMM"||(token=="NNN"&&i>11)) {
            month=i+1;
            if (month>12) { month -= 12; }
            i_val += month_name.length;
            break;
            }
          }
        }
      if ((month < 1)||(month>12)){return 0;}
      }
    else if (token=="EE"||token=="E"){
      for (var i=0; i<DAY_NAMES.length; i++) {
        var day_name=DAY_NAMES[i];
        if (val.substring(i_val,i_val+day_name.length).toLowerCase()==day_name.toLowerCase()) {
          i_val += day_name.length;
          break;
          }
        }
      }
    else if (token=="MM"||token=="M") {
      month=_getInt(val,i_val,token.length,2);
      if(month==null||(month<1)||(month>12)){return 0;}
      i_val+=month.length;}
    else if (token=="dd"||token=="d") {
      date=_getInt(val,i_val,token.length,2);
      if(date==null||(date<1)||(date>31)){return 0;}
      i_val+=date.length;}
    else if (token=="hh"||token=="h") {
      hh=_getInt(val,i_val,token.length,2);
      if(hh==null||(hh<1)||(hh>12)){return 0;}
      i_val+=hh.length;}
    else if (token=="HH"||token=="H") {
      hh=_getInt(val,i_val,token.length,2);
      if(hh==null||(hh<0)||(hh>23)){return 0;}
      i_val+=hh.length;}
    else if (token=="KK"||token=="K") {
      hh=_getInt(val,i_val,token.length,2);
      if(hh==null||(hh<0)||(hh>11)){return 0;}
      i_val+=hh.length;}
    else if (token=="kk"||token=="k") {
      hh=_getInt(val,i_val,token.length,2);
      if(hh==null||(hh<1)||(hh>24)){return 0;}
      i_val+=hh.length;hh--;}
    else if (token=="mm"||token=="m") {
      mm=_getInt(val,i_val,token.length,2);
      if(mm==null||(mm<0)||(mm>59)){return 0;}
      i_val+=mm.length;}
    else if (token=="ss"||token=="s") {
      ss=_getInt(val,i_val,token.length,2);
      if(ss==null||(ss<0)||(ss>59)){return 0;}
      i_val+=ss.length;}
    else if (token=="a") {
      if (val.substring(i_val,i_val+2).toLowerCase()=="am") {ampm="AM";}
      else if (val.substring(i_val,i_val+2).toLowerCase()=="pm") {ampm="PM";}
      else {return 0;}
      i_val+=2;}
    else {
      if (val.substring(i_val,i_val+token.length)!=token) {return 0;}
      else {i_val+=token.length;}
      }
    }
  // If there are any trailing characters left in the value, it doesn't match
  if (i_val != val.length) { return 0; }
  // Is date valid for month?
  if (month==2) {
    // Check for leap year
    if ( ( (year%4==0)&&(year%100 != 0) ) || (year%400==0) ) { // leap year
      if (date > 29){ return 0; }
      }
    else { if (date > 28) { return 0; } }
    }
  if ((month==4)||(month==6)||(month==9)||(month==11)) {
    if (date > 30) { return 0; }
    }
  // Correct hours value
  if (hh<12 && ampm=="PM") { hh=hh-0+12; }
  else if (hh>11 && ampm=="AM") { hh-=12; }
  var newdate=new Date(year,month-1,date,hh,mm,ss);
  return newdate.getTime();
  }

// ------------------------------------------------------------------
// parseDate( date_string [, prefer_euro_format] )
//
// This function takes a date string and tries to match it to a
// number of possible date formats to get the value. It will try to
// match against the following international formats, in this order:
// y-M-d   MMM d, y   MMM d,y   y-MMM-d   d-MMM-y  MMM d
// M/d/y   M-d-y      M.d.y     MMM-d     M/d      M-d
// d/M/y   d-M-y      d.M.y     d-MMM     d/M      d-M
// A second argument may be passed to instruct the method to search
// for formats like d/M/y (european format) before M/d/y (American).
// Returns a Date object or null if no patterns match.
// ------------------------------------------------------------------
function parseDate(val) {
  var preferEuro=(arguments.length==2)?arguments[1]:false;
  generalFormats=new Array('y-M-d','MMM d, y','MMM d,y','y-MMM-d','d-MMM-y','MMM d');
  monthFirst=new Array('M/d/y','M-d-y','M.d.y','MMM-d','M/d','M-d');
  dateFirst =new Array('d/M/y','d-M-y','d.M.y','d-MMM','d/M','d-M');
  var checkList=new Array('generalFormats',preferEuro?'dateFirst':'monthFirst',preferEuro?'monthFirst':'dateFirst');
  var d=null;
  for (var i=0; i<checkList.length; i++) {
    var l=window[checkList[i]];
    for (var j=0; j<l.length; j++) {
      d=getDateFromFormat(val,l[j]);
      if (d!=0) { return new Date(d); }
      }
    }
  return null;
  }
// Gradebook is grade center namespace
var Gradebook =
{
  getModel: function()
  {
    try
    {
      if (window.gbModel)
      {
        return window.gbModel; // in case scope is GC/Course Frameset
      }
      if (parent.gbModel)
      {
        return parent.gbModel;
      }
      return parent.parent.gbModel;
    }
    catch (ignore)
    {
        return null;
    }
  },

  clearModel: function()
  {
    parent.gbModel = null;
  }
};

var GradebookUtil =
{

  parseLocaleFloat : function( num )
  {
    // substitute for later calls to not have to Gradebook.getModel().getNumberFormatter()
    GradebookUtil.parseLocaleFloat = Gradebook.getModel().getNumberFormatter().parseLocaleFloat;
    return GradebookUtil.parseLocaleFloat( num );
  },

  toLocaleFloat : function( num )
  {
    GradebookUtil.toLocaleFloat = Gradebook.getModel().getNumberFormatter().getDisplayFloat;
    return GradebookUtil.toLocaleFloat( num );
  },

  round: function( num )
  {
    return Math.round( num * 100) / 100;
  },

  error : function( errorMsg )
  {
    // firebug/IE console
    if ( console && console.error )
    {
      console.error( errorMsg );
    }
  },

  log : function( logMsg )
  {
    // firebug/IE console
    if ( console && console.log )
    {
      console.log( logMsg );
    }
  },

  isIE: function ()
  {
    return navigator.userAgent.toLowerCase().indexOf("msie") >= 0;
  },

  isFFonMac: function()
  {
    return GradebookUtil.isMac() && GradebookUtil.isFirefox();
  },

  isFirefox: function()
  {
    return (navigator.userAgent.toLowerCase().indexOf("firefox") != -1);
  },

  isMac: function()
  {
    return (navigator.userAgent.toLowerCase().indexOf("mac") != -1);
  },

  getFloatLocaleFormatFromWindow: function()
  {
    var localeFloatFormat = { separator:'.', format:'' };
    if ( window.LOCALE_SETTINGS )
    {
      if ( LOCALE_SETTINGS.getString('number_format.decimal_point') )
      {
        localeFloatFormat.separator = LOCALE_SETTINGS.getString('number_format.decimal_point');
      }
      if ( LOCALE_SETTINGS.getString('float.allow.negative.format') )
      {
        localeFloatFormat.format = LOCALE_SETTINGS.getString( 'float.allow.negative.format' );
      }
    }
    else
    {
      var separator = page.bundle.getString('number_format.decimal_point');
      if ( separator )
      {
        localeFloatFormat.separator = separator;
      }
    }
    if ( !localeFloatFormat.format )
    {
      // for some reason the current locale does not define the format, so let's build one
      if ( localeFloatFormat.separator === ',' )
      {
        localeFloatFormat.format = '^[-]?[0-9]*(,[0-9]+)?$';
      }
      else
      {
        localeFloatFormat.format = '^[-]?[0-9]*(\\.[0-9]+)?$';
      }
    }
    return localeFloatFormat;
  },

  isValidFloat: function ( n )
  {
    if ( n instanceof Number || typeof( n ) == 'number' )
    {
      return true;
    }
    n = '' + n;
    var trimmedVal = n.strip();
    var floatLocaleFormat = null;
    var model = Gradebook.getModel();
    if ( model && model.getFloatLocaleFormat()  )
    {
      floatLocaleFormat = model.getFloatLocaleFormat();
    }
    else
    {
      // those settings would be the settings of the page where the javascript code
      // is executed, which might not be in the same locale as the course itself
      floatLocaleFormat = this.getFloatLocaleFormatFromWindow();
    }
    if (trimmedVal.endsWith( floatLocaleFormat.separator ))
    {
      trimmedVal += '0';
    }
    var re = new RegExp( floatLocaleFormat.format );
    var isValidNum = trimmedVal.search( re ) === 0;
    return isValidNum;
  },

  isGradeValueTooBig: function ( inputValue )
  {
    return inputValue >= 10000000000;
  },

  formatStudentName: function ( student )
  {
    var nameData = {first:student.first, last:student.last, user:student.user};
    return GradebookUtil.getMessage('userNameTemplate', nameData);
  },

  trimId: function( primaryKey )
  {
    if ( primaryKey.charAt(0) != '_' )
    {
      return primaryKey;
    }
    return primaryKey.slice(1, primaryKey.lastIndexOf('_') );
  },

  getMessage: function (key, args) {
    if ( Gradebook.getModel() ) {
      return Gradebook.getModel().getMessage(key, args);
    } else {
      return key;
    }
  },

  getElementsComputedStyle: function ( htmlElement, cssProperty, mozillaEquivalentCSS)
  {
    if ( arguments.length == 2 )
    {
      mozillaEquivalentCSS = cssProperty;
    }

    var el = $(htmlElement);
    if ( el.currentStyle )
    {
      return el.currentStyle[cssProperty];
    }
    else
    {
      return document.defaultView.getComputedStyle(el, null).getPropertyValue(mozillaEquivalentCSS);
    }
  },

  toViewportPosition: function(element)
  {
    return this._toAbsolute(element,true);
  },

  /**
   *  Compute the elements position in terms of the window viewport
   *  so that it can be compared to the position of the mouse (dnd)
   *  This is additions of all the offsetTop,offsetLeft values up the
   *  offsetParent hierarchy, ...taking into account any scrollTop,
   *  scrollLeft values along the way...
   *
   *  Note: initially there was 2 implementations, one for IE, one for others.
   *  Mozilla one seems to fit all though (tested XP: FF2,IE7, OSX: FF2, SAFARI)
   **/
  _toAbsolute: function(element,accountForDocScroll, topParent )
  {
    return this._toAbsoluteMozilla(element,accountForDocScroll,topParent);
  },

  /**
   *  Mozilla did not report all of the parents up the hierarchy via the
   *  offsetParent property that IE did.  So for the calculation of the
   *  offsets we use the offsetParent property, but for the calculation of
   *  the scrollTop/scrollLeft adjustments we navigate up via the parentNode
   *  property instead so as to get the scroll offsets...
   *
   **/
  _toAbsoluteMozilla: function(element,accountForDocScroll, topParent)
  {
    // possibly should be replaced by prototype viewportOffset
    var x = 0;
    var y = 0;
    var parent = element;
    while ( parent && ( !topParent || parent!=topParent ) )
    {
      x += parent.offsetLeft;
      y += parent.offsetTop;
      parent = parent.offsetParent;
    }

    parent = element;
    while ( parent &&
        parent != document.body &&
        parent != document.documentElement &&
        ( !topParent || parent!=topParent ) )
    {
      if ( parent.scrollLeft  )
      {
        x -= parent.scrollLeft;
      }
      if ( parent.scrollTop )
      {
        y -= parent.scrollTop;
      }
      parent = parent.parentNode;
    }

    if ( accountForDocScroll )
    {
      x -= this.docScrollLeft();
      y -= this.docScrollTop();
    }

    return { x:x, y:y };
  },

  docScrollLeft: function() {
    if ( window.pageXOffset )
    {
      return window.pageXOffset;
    }
    else if ( document.documentElement && document.documentElement.scrollLeft )
    {
      return document.documentElement.scrollLeft;
    }
    else if ( document.body )
    {
      return document.body.scrollLeft;
    }
    else
    {
      return 0;
    }
  },

  docScrollTop: function()
  {
    if ( window.pageYOffset )
    {
      return window.pageYOffset;
    }
    else if ( document.documentElement && document.documentElement.scrollTop )
    {
      return document.documentElement.scrollTop;
    }
    else if ( document.body )
    {
      return document.body.scrollTop;
    }
    else
    {
      return 0;
    }
  },

  getChildElementByClassName: function(parent, childTag, childClassName)
  {
    var children = parent.getElementsByTagName(childTag);
    if (!children || children.length === 0)
    {
      return null;
    }
    for (var i = 0; i < children.length; i++)
    {
      if (children[i].className.indexOf(childClassName) >= 0)
      {
        return children[i];
      }
    }
    return null;
  },

  // returns true if the text area length is less than maxLength.
  // text area length is greater than maxLength, alerts user, sets focus to text area and returns false
  validateMaxLength : function( textArea, label, maxlength )
  {
    var textLength = textArea.value.length;
    if ( maxlength < textLength )
    {
      if ( (textLength - maxlength) > 1 )
      {
        alert(JS_RESOURCES.getFormattedString('validation.maximum_length.plural', [label, maxlength, textLength - maxlength] ));
      }
      else
      {
        alert(JS_RESOURCES.getFormattedString('validation.maximum_length.singular', [label, maxlength] ));
      }
      textArea.focus();
      return false;
    }
    else
    {
      return true;
    }
  }

};


/**
 *  Gradebook data grid
 *
 *  PORTIONS OF THIS FILE ARE BASED ON RICO LIVEGRID 1.1.2
 *
 *  Copyright 2005 Sabre Airline Solutions
 *
 *  Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 *  file except in compliance with the License. You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software distributed under the
 *  License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 *  either express or implied. See the License for the specific language governing permissions
 *  and limitations under the License.
 *
 *  @author "Bill Richard"
 *  @version
 *
 *
 **/

Gradebook.GridModel = Class.create();

Gradebook.GridModel.prototype =
{

  initialize : function(gradebookService)
  {
    this.gradebookService = gradebookService;
    this.courseId = gradebookService.courseId;
    this.rows = [];
    this.colDefs = [];
    this.colOrderMap = [];
    this.customViews = [];
    this.listeners = [];
    this.accessibleMode = false;
    this.resizingWindow = false;
    this.minimumRows = 10;
    this.isolatedStudentId = '';
    this.floatLocaleFormat= null;
    // singleton on this document
    this._initMessages();
    this.gridColorScheme = null;
    // stuff that needs to be stored to survive page refresh but not used by the model
    this.store = {};
    window.gbModel = this;
  },

  getFloatLocaleFormat: function()
  {
    return this.floatLocaleFormat;
  },

  setFloatLocaleFormat: function( floatLocaleFormat )
  {
    this.floatLocaleFormat = floatLocaleFormat;
    NumberFormatter.needToConvert = ( this.floatLocaleFormat.separator == ',' );
  },

  getNumberFormatter: function()
  {
    return NumberFormatter;
  },

  getObject: function( name )
  {
    return this.store[ name ];
  },

  newObject: function( name )
  {
    var newObject = {};
    this.store[ name ] = newObject;
    return newObject;
  },

  setObject: function( name, object )
  {
    this.store[ name ] = object;
    return object;
  },

  removeObject: function( name )
  {
    delete this.store[ name ];
  },

  newArray: function( name )
  {
    this[ name ] = [];
    return this[ name ];
  },

  getCustomViews : function()
  {
    this.customViews.sort(function(a, b)
    {
      var aa = a.name.toLowerCase();
      var bb = b.name.toLowerCase();
      if (aa == bb)
      {
        return 0;
      }
      else if (aa < bb)
      {
        return -1;
      }
      else
      {
        return 1;
      }
    });
    return this.customViews;
  },

  // notify registered listeners that model data has changed
  fireModelChanged : function()
  {
    if (!this.messages && this.loadingLocalizedMessages)
    {
      // wait for the messages to be loaded before to do a reload
      window.setTimeout(this.fireModelChanged.bind(this), 50);
    }
    else
    {
      for ( var i = 0; i < this.listeners.length; i++)
      {
        this.listeners[i].modelChanged();
      }
    }
  },

  // notify registered listeners that model error has occured
  fireModelError : function(exception, serverReply)
  {
    for ( var i = 0; i < this.listeners.length; i++)
    {
      if (this.listeners[i].modelError)
      {
        this.listeners[i].modelError(exception, serverReply);
      }
    }
  },

  addModelListener : function(listener)
  {
    this.listeners.push(listener);
  },

  removeModelListeners : function()
  {
    this.listeners =
      [];
  },

  updateGrade : function(newValue, newTextValue, userId, colDefId)
  {
    this.gradebookService.updateGrade((this.updateGradeCallback).bind(this), this.version, newValue, newTextValue, userId, colDefId);
  },

  clearAll : function(isDelete, userId, colDefId)
  {
    this.gradebookService.clearAll((this.updateGradeCallback).bind(this), this.version, isDelete, userId, colDefId);
  },

  clearSelected : function(attemptIds, isDelete, userId, colDefId)
  {
    this.gradebookService.clearSelected((this.updateGradeCallback).bind(this), this.version, attemptIds, isDelete, userId, colDefId);
  },

  deleteColumn : function(colDefId)
  {
    this.gradebookService.deleteColumn(colDefId);
  },

  modifyColumn : function(colDefId, colType)
  {
    this.gradebookService.modifyColumn(colDefId, colType);
  },

  viewItemStats : function(itemId)
  {
    this.gradebookService.viewItemStats(itemId);
  },

  viewSingleStudentGrades : function(userId)
  {
    this.isolatedStudentId = userId;
    this.gradebookService.reloadGrid();
  },

  restoreFromSingleStudentView : function()
  {
    this.isolatedStudentId = '';
    this.gradebookService.reloadGrid();
  },

  viewStudentStats : function(userId)
  {
    this.gradebookService.viewStudentStats(userId);
  },

   runReport : function(userId)
  {
    this.gradebookService.runReport(userId);
  },

  hideColumn : function(colDefId)
  {
    // decrement numFrozenColumns if hiding a frozen column
    var idx = this.colDefMap[colDefId];
    for ( var i = 0; i < this.colOrderMap.length; i++)
    {
      if (this.colOrderMap[i] == idx)
      {
        if (i < this.numFrozenColumns && this.numFrozenColumns > 1)
        {
          this.numFrozenColumns--;
          this.gradebookService.updateNumFrozenColumns(this.numFrozenColumns);
        }
        break;
      }
    }
    this.gradebookService.hideColumn(colDefId);
  },

  setColumnStudentVisibility : function(colDefId, visible)
  {
    this.gradebookService.setColumnStudentVisibility((this.setColumnStudentVisibilityCallback).bind(this), colDefId, visible);
  },

  showGradeDetails : function(userId, colDefId, focusCellId)
  {
    this.gradebookService.showGradeDetails(userId, colDefId, focusCellId);
  },

  onAddComment : function(userId, colDefId)
  {
    this.gradebookService.loadComments(userId, colDefId, "studentComments", "instructorComments");
  },

  exemptGrade : function(userId, colDefId)
  {
    this.gradebookService.setExemption((this.updateGradeCallback).bind(this), this.version, userId, colDefId, true);
  },

  clearExemption : function(userId, colDefId)
  {
    this.gradebookService.setExemption((this.updateGradeCallback).bind(this), this.version, userId, colDefId, false);
  },

  setComments : function(userId, colDefId, studentComments, instructorComments)
  {
    this.gradebookService.setComments(userId, colDefId, studentComments, instructorComments);
  },

  getRowByUserId : function(userId)
  {
    var rowIndex = this.rowUserIdMap[userId];
    if ( rowIndex === undefined || this.rows[rowIndex][0].uid != userId)
    {
      return null;
    }
    return this.rows[rowIndex];
  },

  getScoreProvider : function( scoreProviderHandle )
  {
    return this.scoreProvidersMap[ scoreProviderHandle ];
  },

  _getGradesForItemId : function(itemId, includeUnavailable)
  {
    var grades = [];
    var colIndex = this.colDefMap[itemId];
    if (!colIndex)
    {
      GradebookUtil.error('GridModel _getGradesForItemId contains data for invalid column id: ' + itemId);
      return grades;
    }
    var rows = (includeUnavailable) ? this.rows : this.visibleRows;
    for ( var i = 0, len = rows.length; i < len; i++)
    {
      var data = rows[i][colIndex];
      if (!data.metaData)
      {
        data.metaData = rows[i][0];
      }
      if (includeUnavailable || data.metaData.isAvailable)
      {
        if (!data.colDef)
        {
          data.colDef = this.colDefs[colIndex];
        }
        grades.push(new Gradebook.GridCell(data));
      }
    }
    return grades;
  },

  getColDefById : function(itemId)
  {
    return this.colDefs[this.colDefMap[itemId]];
  },

  getColumnByIndex: function( index )
  {
    return this.colDefs[this.colOrderMap[index]];
  },

  setColumnStudentVisibilityCallback : function(retData)
  {
    if (!retData)
    {
      GradebookUtil.error('GridModel error updating column visibility');
      return;
    }
    this.getColDefById(retData.columnId).vis = retData.vis;
    this.fireModelChanged();
  },

  updateGradeCallback : function(retData)
  {
    if (!retData || retData.length === 0)
    {
      GradebookUtil.error('GridModel error updating grade');
      return;
    }
    var lastSavedDate = null;
    for ( var i = 0, len = retData.length; i < len; i++)
    {
      var data = retData[i];
      var colDefId = data.itemId;
      var userId = data.courseUserId;
      var score = data.score;
      var textInput = data.textInput;
      var row = this.getRowByUserId(userId);
      var colIndex = this.colDefMap[colDefId];
      if (!colIndex)
      {
        // ignore
        continue;
      }
      var gridCell = row[colIndex];
      gridCell.tv = textInput;
      if (textInput.length === 0 && score === 0)
      {
        gridCell.v = '-';
      }
      else
      {
        gridCell.v = score;
      }
      gridCell.or = (data.override) ? "y" : null;
      gridCell.x = (data.exempt) ? "y" : null;
      gridCell.ng = (data.needsGrading) ? "y" : null;
      gridCell.ip = (data.inProgress) ? "y" : null;
      gridCell.notExcluded = !data.excluded;
      gridCell.mp = data.points;
      gridCell.attemptsInfo = null;
      gridCell.numAtt = data.numOfAttempts;
      if ( lastSavedDate === null )
      {
        lastSavedDate = data.lastSavedDate;
      }
      gridCell.orBefAtt = data.overrideBeforeAttempt;
    }
    this.lastLogEntryTS = lastSavedDate;
    this.fireModelChanged();
  },

  setResizingWindow : function(f)
  {
    this.resizingWindow = f;
  },

  getResizingWindow : function()
  {
    return this.resizingWindow;
  },

  setMinimumRows : function(minRows)
  {
    if (minRows < 5)
    {
      minRows = 5;
    }
    if (minRows > 50)
    {
      minRows = 50;
    }
    this.minimumRows = minRows;
  },

  getMinimumRows : function()
  {
    return this.minimumRows;
  },

  getColorScheme: function( gradeCell )
  {
    // we get the color scheme by priority order
    // (in case for example the cell has a grade and is needs grading
    // then the grade range is used first)
    if ( gradeCell.isExempt() )
    {
      return "cs_ex";
    }
    var colorScheme = this.gridColorScheme;
    if ( colorScheme && gradeCell.isGraded() )
    {
      var normalizedPoints =  gradeCell.getNormalizedGrade();
      if ( normalizedPoints !== null )
      {
        normalizedPoints = normalizedPoints * 100;
        // lower bound >= value > upper bound
        for ( var i = 0; i < colorScheme.length; ++i )
        {
          var range = colorScheme[ i ];
          if ( range.u && normalizedPoints >= range.u )
          {
            continue;
          }
          if ( range.l && normalizedPoints < range.l )
          {
            continue;
          }
          return range.cid;
        }
      }
    }
    if ( gradeCell.needsGrading() )
    {
      return "cs_ng";
    }
    if ( gradeCell.attemptInProgress() )
    {
      return "cs_ip";
    }
    return "";
  },


  _reportException : function(e)
  {
    this.fireModelError(e, e.message);
  },

  _reportError : function(t)
  {
    this.fireModelError('error getting data from server', t.statusText);
  },

  getVisibleColDefIndex : function(id)
  {
    var colnum = this.colDefMap[id];
    if (colnum === undefined || this.colDefs[colnum] === undefined || !this.colDefs[colnum].gbvis)
    {
      return -1;
    }
    for ( var i = 0, len = this.colOrderMap.length; i < len; i++)
    {
      if (this.colOrderMap[i] == colnum)
      {
        return i;
      }
    }
    return -1;
  },

  updateUserVisibility : function(userId, visible)
  {
    this.gradebookService.updateUserVisibility(userId, visible);
  },

  _hasNewUsers : function(jsonBook)
  {
    if (!jsonBook || !jsonBook.rows)
    {
      return false;
    }
    for ( var i = 0; i < jsonBook.rows.length; i++)
    {
      if (!this.getRowByUserId(jsonBook.rows[i][0].uid))
      {
        return true;
      }
    }
    return false;
  },

  _containsUser : function(rows, userId)
  {
    for ( var i = 0; i < rows.length; i++)
    {
      if (rows[i][0].uid == userId)
      {
        return true;
      }
    }
    return false;
  },

  // called by view to get a window of row data
  // returns iterators to get row data in correct order while skipping hidden columns
  getRowIterators : function(startRow, numRows, startCol)
  {
    var rows = this.visibleRows;
    if (!startRow)
    {
      startRow = 0;
    }
    if (!startCol)
    {
      startCol = 0;
    }
    if (!numRows)
    {
      numRows = rows.length;
    }
    var endRow = startRow + numRows;

    if (startRow < 0 || startRow >= rows.length)
    {
      GradebookUtil.error('getRowIterators startRow out of range. Max is: ' + rows.length - 1 + ' startRow is: ' + startRow);
      return null;
    }
    if (numRows < 0 || numRows > rows.length)
    {
      GradebookUtil.error('getRowIterators numRows out of range. Max is: ' + rows.length + ' numRows is: ' + numRows);
      return null;
    }
    if (startCol < 0 || startCol >= this.colOrderMap.length)
    {
      GradebookUtil.error('getRowIterators startCol out of range. Max is: ' + this.colOrderMap.length + ' startCol is: ' + startCol);
      return null;
    }
    if (endRow > rows.length)
    {
      endRow = rows.length;
      GradebookUtil.error('Error: GridModel getRowIterators input args requesting too much data. startRow = ' + startRow + ' numRows = ' + numRows +
          ' rows.length = ' + rows.length);
      return null;
    }

    var results =
      [];
    var index = 0;
    for ( var i = startRow; i < endRow; i++)
    {
      results[index++] = new Gradebook.GridRowIterator(rows[i], this.colOrderMap, startCol, this.colDefs);
    }
    return results;
  },

  // called by view to get the column definitions
  // returns iterator to get definitions in correct order while skipping hidden columns
  getColDefIterator : function(startCol)
  {
    if (!startCol)
    {
      startCol = 0;
    }
    if (startCol < 0 || startCol >= this.colOrderMap.length)
    {
      GradebookUtil.error('getColDefIterator startCol out of range. Max is: ' + this.colOrderMap.length + ' startCol is: ' + startCol);
      return null;
    }
    return new Gradebook.ColDefIterator(this.colDefs, this.colOrderMap, startCol);
  },

  // called by view to determine how much vertical scroll is needed
  getNumRows : function()
  {
    if (this.visibleRows)
    {
      return this.visibleRows.length;
    }
    else
    {
      return 0;
    }
  },

  // called by view to determine how much horizontal scroll is needed
  getNumColDefs : function()
  {
    return this.colOrderMap.length;
  },

  // called by view to determine how many columns to freeze
  getNumFrozenColumns : function()
  {
    return this.numFrozenColumns;
  },

  getSortDir : function()
  {
    return this.sortDir;
  },

  // columnId is optional, it will return the sort index currently used if not specified
  // Also, if there is no defined sortColumnId and you pass in undefined then it will pick
  // the first column and use that to sort on.
  getSortIndex : function( columnId  )
  {
    var sortColumnId = columnId?columnId:this.sortColumnId;
    if ( !sortColumnId )
    {
      var fc = this.colOrderMap[0];
      if (fc)
      {
        var cd = this.colDefs[fc];
        if (cd)
        {
          sortColumnId = cd.id;
          if (!this.sortColumnId && sortColumnId)
          {
            this.sortColumnId = sortColumnId;
          }
        }
      }
      if (!sortColumnId)
      {
        return -1;
      }
    }
    var colnum = this.colDefMap[ sortColumnId ];
    if (colnum === undefined)
    {
      return -1;
    }
    else
    {
      var sortColumn;
      for( var i =0; i< this.colOrderMap.length; i++)
      {
        if( this.colOrderMap[i] == colnum)
        {
          sortColumn = i;
          break;
        }
      }
      if (sortColumn === undefined || this.colDefs[ sortColumn ] === undefined || this.colDefs[ sortColumn ].deleted == "Y")
      {
        return -1;
      }
      else
      {
        return sortColumn;
      }
    }
  },

  reSort : function()
  {
    if (this.sortColumnId === undefined || this.sortDir === undefined)
    {
      return;
    }
    var colnum = this.getSortIndex();
    if (colnum == -1)
    {
      return;
    }
    this.sort(colnum, this.sortDir);
  },

  setDefaultView : function(view)
  {
    this.defView = view;
    this.gradebookService.setDefaultView(view);
  },

  getDefaultView : function()
  {
    if (!this._isValidView(this.defView))
    {
      this.defView = 'fullGC';
    }
    return this.defView;
  },

  setCategoryFilter : function(category)
  {
    this.categoryFilter = category; // override category for current view
    this.checkedNoStudents( ); // clear selected when switching view/status
  },

  setStatusFilter : function(status)
  {
    if (status.startsWith("stat_"))
    {
      status = status.substr(5, status.length - 5);
    }
    this.statusFilter = status; // override status for current view
    this.checkedNoStudents( ); // clear selected when switching view/status
  },

  setInitialCurrentView : function(view)
  {
    this.initialView = view;
  },

  // set the current view to a fullGC, custom view, or grading period
  //   view param is:
  //     'fullGC' for full
  //     'cv_123' for custom views
  //     '456' for grading periods
  // if specified view is invalid, use default, if default is invalid, use full
  //
  setCurrentView : function(view)
  {
    this.categoryFilter = null; // clear category override
    this.statusFilter = null; // clear status override
    this.currentCustomView = null;
    this.currentGradingPeriodId = null;

    if (!this._isValidView(view))
    {
      view = this.defView;
    }
    if (!this._isValidView(view))
    {
      view = 'fullGC';
    }

    if (view == 'fullGC')
    {
      // use a custom view for full grade center to allow category/status overrides
      this.currentCustomView = Gradebook.CustomView.getFullGC(this);
    }
    else if (view.startsWith('cv_'))
    {
      var idx = this.customViewMap[view.substring(3)];
      this.currentCustomView = this.customViews[idx];
    }
    else if (view.startsWith('gp_'))
    {
      this.currentGradingPeriodId = view.substring(3);
    }
    this.currentView = view;
    this.checkedNoStudents( ); // clear selected when switching view
  },

  _isValidView : function(view)
  {
    if (!view)
    {
      return false;
    }
    if (view == 'fullGC')
    {
      return true;
    }
    if (view.startsWith('cv_') && this.customViewMap[ view.substring( 3 ) ] !== 'undefined' && this.customViewMap[ view.substring( 3 ) ] !== null )
    {
      var idx = this.customViewMap[view.substring(3)];
      return this.customViews[idx].evaluate();
    }
    if (view.startsWith('gp_'))
    {
      return this.gradingPeriodMap && this.gradingPeriodMap[view.substring(3)];
    }
    return false;
  },

  _applyCustomView : function()
  {
    var row;
    if (this.isolatedStudentId)
    {
      this.visibleRows =
        [];
      row = this.getRowByUserId(this.isolatedStudentId);
      this.visibleRows.push(row);
    }
    if (!this.currentCustomView)
    {
      return;
    }
    this.currentCustomView.evaluate(this);
    var userIds = this.currentCustomView.getUserIds();
    if (this.isolatedStudentId)
    {
      return;
    }
    this.visibleRows = [];
    // loop through custom view users and add to visibleRows
    for ( var i = 0, len = userIds.length; i < len; i++)
    {
      row = this.getRowByUserId(userIds[i]);
      if (row)
      {
        this.visibleRows.push(row);
      }
    }
  },

  getCustomView : function(cvId)
  {
    var idx = this.customViewMap[cvId];
    if (!idx)
    {
      return null;
    }
    else
    {
      return this.customViews[idx];
    }
  },

  getCurrentCustomView : function()
  {
    return this.currentCustomView;
  },

  getCurrentStatus : function()
  {
    if (!this.isStatusView())
    {
      return 'stat_ALL';
    }
    else if (this.statusFilter)
    {
      return this.statusFilter;
    }
    else
    {
      return this.currentCustomView.display.items;
    }
  },

  getCurrentCategory : function()
  {
    if (!this.isStatusView())
    {
      return 'c_all';
    }
    else if (this.categoryFilter)
    {
      return this.categoryFilter;
    }
    else if (this.currentCustomView.category == 'c_all')
    {
      return 'c_all';
    }
    else
    {
      return 'c_' + this.currentCustomView.aliasMap[this.currentCustomView.category];
    }
  },

  isStatusView : function()
  {
    return this.currentCustomView && this.currentCustomView.searchType == 'status';
  },

  getCurrentViewName : function()
  {
    if (this.currentCustomView)
    {
      return this.currentCustomView.name;
    }
    else if (this.currentGradingPeriodId)
    {
      return this.gradingPeriodMap[this.currentGradingPeriodId].name;
    }
    else
    {
      return "";
    }
  },

  getCurrentViewStatus : function()
  {
    var s = this.getCurrentStatus();
    if (s.startsWith("stat_"))
    {
      s = s.substr(5, status.length - 5);
    }
    if (s == "ALL")
    {
      return this.getMessage('all_statusesMsg');
    }
    else if (s == "NA")
    {
      return this.getMessage('not_attemptedMsg');
    }
    else if (s == "C")
    {
      return this.getMessage('completedMsg');
    }
    else if (s == "NG")
    {
      return this.getMessage('needs_gradingMsg');
    }
    else if (s == "IP")
    {
      return this.getMessage('in_progressMsg');
    }
    else if (s == "EM")
    {
      return this.getMessage('edited_manuallyMsg');
    }
  },

  sortColumns : function(sortBy)
  {
    if ( this.sortColAscending == undefined )
    {
      this.sortColAscending = true;
    }

    if (sortBy)
    {
      if (this.currentSortColumnBy == sortBy)
      {
        this.sortColAscending = !this.sortColAscending;
      }
      else
      {
        this.sortColAscending = true;
        this.currentSortColumnBy = sortBy;
      }
    }
    else if (!this.currentSortColumnBy)
    {
      this.currentSortColumnBy = 'pos';
    }
    var sortFunc = null;
    sortBy = this.currentSortColumnBy;
    if (sortBy == 'pos')
    {
      sortFunc = this._sortColByPosFunc.bind(this);
    }
    else if (sortBy == 'categories')
    {
      sortFunc = this._sortColByCategoriesFunc.bind(this);
    }
    else if (sortBy == 'dueDate')
    {
      sortFunc = this._sortColByDueDateFunc.bind(this);
    }
    else if (sortBy == 'creationdate')
    {
      sortFunc = this._sortColByCreationDateFunc.bind(this);
    }
    else if (sortBy == 'points')
    {
      sortFunc = this._sortColByPointsFunc.bind(this);
    }
    else if (sortBy == 'name')
    {
      sortFunc = this._sortColByNameFunc.bind(this);
    }

    var tempColDefs =
      [];

    var i, cd, len, idx;

    if (this.currentCustomView)
    {
      var colIds = this.currentCustomView.getDisplayItemIds();
      tempColDefs = this._getVisibleToAll(this.currentCustomView.includeHiddenItems, colIds);
      for (i = 0, len = colIds.length; i < len; i++)
      {
        cd = this.colDefs[this.colDefMap[colIds[i]]];
        tempColDefs.push(cd);
      }
    }
    else
    {
      // filter out colDefs that are: deleted, hidden, not in all grading periods
    // or not in current grading period
    for (i = 0, len = this.colDefs.length; i < len; i++)
    {
      cd = this.colDefs[i];
      if (cd.deleted || !cd.gbvis)
      {
        continue;
      }
      var cgp = this.currentGradingPeriodId;
      var ingp = (!cgp || cgp == cd.gpid || cgp == 'all' || (cgp == 'none' && !cd.gpid));
      if (cd.visAll || !cd.isGrade() || ingp)
      {
        tempColDefs.push(cd);
      }
    }
  }
  tempColDefs.sort(sortFunc);

  // compute colOrderMap based on the sorted columns
    this.colOrderMap = [];
    for (var i = 0; i < tempColDefs.length; i++)
    {
      this.colOrderMap[i] = this.colDefMap[tempColDefs[i].id];
    }
  },

  _getVisibleToAll : function(includeHidden, excludeIds)
  {
    var tempColDefs =
      [];
    for ( var i = 0, len = this.colDefs.length; i < len; i++)
    {
      var cd = this.colDefs[i];
      if (excludeIds.indexOf(cd.id) != -1)
      {
        continue;
      }
      var visAll = cd.visAll || !cd.isGrade();
      if (cd.deleted || !visAll || (!includeHidden && !cd.gbvis))
      {
        continue;
      }
      tempColDefs.push(cd);
    }
    return tempColDefs;
  },

  // if both a & b are NOT visible to all, returns null
  // if both a & b are visible to all, sorts by position
  // if a is visible to all, returns -1 so visible to all columns come first
  // if b is visible to all, returns 1 so visible to all columns come first
  _sortVisibleToAll : function(a, b)
  {
    var aVisAll = a.visAll || !a.isGrade();
    var bVisAll = b.visAll || !b.isGrade();
    if (!aVisAll && !bVisAll)
    {
      return null;
    }
    else if (aVisAll && bVisAll)
    {
      return a.pos - b.pos;
    }
    else if (aVisAll)
    {
      return -1;
    }
    else if (bVisAll)
    {
      return 1;
    }
  },

  _sortColDir : function(result)
  {
    return (this.sortColAscending) ? result : result * -1;
  },

  _sortColByPosFunc : function(a, b)
  {
    var sf = this._sortVisibleToAll(a, b);
    if (sf)
    {
      return sf;
    }
    var gpPosA = ( !a.gpid || a.gpid.blank() ) ? -1 : this.gradingPeriodMap[a.gpid].pos;
    var gpPosB = ( !b.gpid || b.gpid.blank() ) ? -1 : this.gradingPeriodMap[b.gpid].pos;
    var res;
    if (gpPosA == gpPosB)
    {
      res = a.pos - b.pos;
    }
    else if (gpPosA >= 0 && gpPosB >= 0)
    {
      res = gpPosA - gpPosB;
    }
    else if (gpPosB == -1)
    {
      res = -1;
    }
    else
    {
      res = 1;
    }
    return this._sortColDir(res);
  },

  _sortColByPointsFunc : function(a, b)
  {
    var sf = this._sortVisibleToAll(a, b);
    if (sf)
    {
      return sf;
    }
    var aa = a.points;
    var bb = b.points;
    var res;
    if (aa == bb)
    {
      res = a.cdate - b.cdate;
    }
    else if (aa < bb)
    {
      res = -1;
    }
    else
    {
      res = 1;
    }
    return this._sortColDir(res);
  },

  _sortColByNameFunc : function(a, b)
  {
    var sf = this._sortVisibleToAll(a, b);
    if (sf)
    {
      return sf;
    }
    var aa = a.name.toLocaleLowerCase();
    var bb = b.name.toLocaleLowerCase();
    var res;
    if (aa == bb)
    {
      res = a.cdate - b.cdate;
    }
    else if (aa < bb)
    {
      res = -1;
    }
    else
    {
      res = 1;
    }
    return this._sortColDir(res);
  },

  _sortColByDueDateFunc : function(a, b)
  {
    var sf = this._sortVisibleToAll(a, b);
    if (sf)
    {
      return sf;
    }
    var aa = a.due;
    var bb = b.due;
    var res;
    if (aa == bb)
    {
      res = a.cdate - b.cdate;
    }
    else if (aa === 0)
    {
      res = 1; // items with no due date, appear after items with due date
    }
    else if (bb === 0)
    {
      res = -1; // items with no due date, appear after items with due date
    }
    else if (aa < bb)
    {
      res = -1;
    }
    else
    {
      res = 1;
    }
    return this._sortColDir(res);
  },

  _sortColByCreationDateFunc : function(a, b)
  {
    var sf = this._sortVisibleToAll(a, b);
    if (sf)
    {
      return sf;
    }
    var res = a.cdate - b.cdate;
    return this._sortColDir(res);
  },

  _sortColByCategoriesFunc : function(a, b)
  {
    var sf = this._sortVisibleToAll(a, b);
    if (sf)
    {
      return sf;
    }
    var aa = a.getCategory();
    var bb = b.getCategory();
    var res;
    if (aa == bb)
    {
      res = a.cdate - b.cdate;
    }
    else if (aa < bb)
    {
      res = -1;
    }
    else
    {
      res = 1;
    }
    return this._sortColDir(res);
  },

  sort : function(colnum, sortdir, secondaryColumnId )
  {
    if (colnum < -1 || colnum >= this.colOrderMap.length)
    {
      GradebookUtil.error('sort colnum out of range. Max is: ' + this.colOrderMap.length + ' colnum is: ' + colnum);
      return;
    }
    this.sortDir = sortdir;
    var sortFunc;
    if (colnum == -1)
    {
      this.sortColumnId = null;
      if (sortdir == 'ASC')
      {
        sortFunc = this._sortCheckedASC.bind(this);
      }
      else
      {
        sortFunc = this._sortCheckedDESC.bind(this);
      }
    }
    else
    {
      var sortColumn = this.colOrderMap[colnum];
      var colDef = this.colDefs[sortColumn];
      this.sortColumnId = colDef.id;
      if(!secondaryColumnId)
      {
        if ( this.sortColumnId == "LN" )
        {
          secondaryColumnId = this.colDefMap[ "FN" ];
        }
        else if ( this.sortColumnId == "FN" )
        {
          secondaryColumnId = this.colDefMap[ "LN" ];
        }
      }
      sortFunc = colDef.getSortFunction( sortdir, secondaryColumnId?this.colDefs[ secondaryColumnId ]:null );
    }
    // Quicksort used in Chrome is not stable (as of May 28, 2012) so we need a measure to prevent random reordering of variables with equal values
    for ( var i = 0, len = this.visibleRows.length; i < len; i++)
    {
      this.visibleRows[i].customSortKey = i;
    }
    this.visibleRows.sort(sortFunc);
    /* getStudents( includeHidden ) when includeHidden is true needs to return all students,
     * and, ideally, we want those sorted in the same way they are in the grid.
     * So to achieve this, rows and visibleRows are kept in sync. Note that if they
     * are equal, then getStudents will use visibleRows so no need to sync.
     * This is not ideal as we do 2 sorts here. Possibly we could store the last used sort
     * function and apply when getStudents is called. It would not be perfect as it would
     * not retain secondary sort, but that might be enough (or retain the last 2 sort functions)?
     */
    if ( this.visibleRows.size() != this.rows.size() )
    {
      // Quicksort used in Chrome is not stable (as of May 28, 2012) so we need a measure to prevent random reordering of variables with equal values
      for ( var i = 0, len = this.rows.length; i < len; i++)
      {
        this.rows[i].customSortKey = i;
      }
      this.rows.sort(sortFunc);
      for ( var i = 0, len = this.rows.length; i < len; i++)
      {
        var c = this.rows[i][0];
        this.rowUserIdMap[c.uid] = i;
      }
    }
  },

  _sortCheckedASC : function(a, b)
  {
    var aa = a[0].isRowChecked ? 1 : 0;
    var bb = b[0].isRowChecked ? 1 : 0;
    if (aa == bb)
    {
      if (aa)
      {
        return 0;
      }
      else
      {
        return (a.customSortKey > b.customSortKey ? -1 : 1);
      }
    }
    if (aa < bb)
    {
      return -1;
    }
    return 1;
  },

  _sortCheckedDESC : function(a, b)
  {
    var aa = a[0].isRowChecked ? 1 : 0;
    var bb = b[0].isRowChecked ? 1 : 0;
    if (aa == bb)
    {
      if (aa)
      {
        return 0;
      }
      else
      {
        return (a.customSortKey > b.customSortKey ? 1 : -1);
      }
    }
    if (bb < aa)
    {
      return -1;
    }
    return 1;
  },

  // called by cumultive item authoring and reporting
  getColDefs : function(gradeColumnsOnly, includeHidden)
  {
    var colDefs = this.colDefs;
    var retColDefs =
      [];
    for ( var i = 0, len = colDefs.length; i < len; i++)
    {
      var c = colDefs[i];
      if (!c.deleted && (!gradeColumnsOnly || c.isGrade()) && (includeHidden || !c.isHidden()))
      {
        retColDefs.push(c);
      }
    }
    return retColDefs;
  },

  // called by grade detail page and report page
  getCurrentColDefs : function(includeCalculated)
  {
    var colDefs = this.colDefs;
    var retColDefs =
      [];
    for ( var i = 0, len = this.colOrderMap.length; i < len; i++)
    {
      var c = colDefs[this.colOrderMap[i]];
      if (c.isGrade() && (includeCalculated || !c.isCalculated()))
      {
        retColDefs.push(c);
      }
    }
    return retColDefs;
  },

  // called by grade detail page
  getNextColDefId : function(colDefs, colDefId)
  {
    for ( var i = 0; i < colDefs.length - 1; i++)
    {
      if (colDefs[i].getID() == colDefId)
      {
        return colDefs[i + 1].getID();
      }
    }
    return null;
  },

  // called by grade detail page
  getPrevColDefId : function(colDefs, colDefId)
  {
    for ( var i = 1; i < colDefs.length; i++)
    {
      if (colDefs[i].getID() == colDefId)
      {
        return colDefs[i - 1].getID();
      }
    }
    return null;
  },

  // called by grade detail, row visibility, etc.
  getStudents : function(includeHidden)
  {
    /* if includeHidden = true, it is still possible that visibleRows == rows.
     * We sort rows only if rows != visibleRows, according to the sort function
     */
    var rows = (includeHidden && this.visibleRows.size() != this.rows.size() ) ? this.rows : this.visibleRows;
    var students = [];
    var LAST_NAME_COL_IDX = 0;
    var FIRST_NAME_COL_IDX = 1;
    var USER_NAME_COL_IDX = 2;
    if (rows)
    {
      // NOTE: We are no longer re-sorting the rows here.  Instead we will honor whatever sort order
      // the user had previously chosen in the grid.  This makes the sorting of grading consistent
      // across different views.  (Confirmed change with Erika)
      for ( var i = 0; i < rows.length; i++)
      {
        var s = {};
        var row = rows[i];
        s.last = row[LAST_NAME_COL_IDX].v;
        s.sortval = row[LAST_NAME_COL_IDX].sortval;
        s.first = row[FIRST_NAME_COL_IDX].v;
        s.user = row[USER_NAME_COL_IDX].v;
        s.id = row[0].uid;
        s.hidden = row[0].isHidden;
        s.available = row[0].isAvailable;
        students.push(s);
      }
    }
    return students;
  },

  // called by cumulative item page
  getGradingPeriods : function()
  {
    return this.gradingPeriods;
  },

  // called by cumulative item page
  getCategories : function()
  {
    return this.categories;
  },

  // called by grade detail page
  getNextUserId : function(userId)
  {
    for ( var i = 0; i < this.visibleRows.length - 1; i++)
    {
      if (this.visibleRows[i][0].uid == userId)
      {
        return this.visibleRows[i + 1][0].uid;
      }
    }
    return null;
  },

  // called by grade detail page
  getPrevUserId : function(userId)
  {
    for ( var i = 1; i < this.visibleRows.length; i++)
    {
      if (this.visibleRows[i][0].uid == userId)
      {
        return this.visibleRows[i - 1][0].uid;
      }
    }
    return null;
  },

  // called by grade detail page; returns null if invalid colId
  getRawValue : function(colId, displayValue)
  {
    var colIndex = this.colDefMap[colId];
    if (colIndex === undefined)
    {
      return null;
    }
    var colDef = this.colDefs[colIndex];
    return colDef.getRawValue(displayValue);
  },

  // called by grade detail page; returns null if invalid colId
  getDisplayValue : function(colId, rawValue)
  {
    var colIndex = this.colDefMap[colId];
    if (colIndex === undefined)
    {
      return null;
    }
    var colDef = this.colDefs[colIndex];
    return colDef.getDisplayValue(rawValue);
  },

  // called by grade detail page; returns null if invalid colId
  getDisplayType : function(colId)
  {
    var colIndex = this.colDefMap[colId];
    if (colIndex === undefined)
    {
      return null;
    }
    var colDef = this.colDefs[colIndex];
    return colDef.getDisplayType();
  },

  // called by grade detail page; returns validate error or null if no error
  validate : function(colId, newValue)
  {
    var colIndex = this.colDefMap[colId];
    if (colIndex === undefined)
    {
      return null;
    }
    var colDef = this.colDefs[colIndex];
    return colDef.validate(newValue);
  },

  getCheckedStudentIds : function()
  {
    var rows = this.visibleRows;
    var students =
      [];
    for ( var i = 0, len = rows.length; i < len; i++)
    {
      if (rows[i][0].isRowChecked)
      {
        students.push(rows[i][0].uid);
      }
    }
    return students;
  },

  checkedAllStudents : function()
  {
    var rows = this.visibleRows;
    for ( var i = 0, len = rows.length; i < len; i++)
    {
      rows[i][0].isRowChecked = true;
    }
    this.fireModelChanged();

  },

  checkedNoStudents : function()
  {
    var rows = this.visibleRows;
    if ( rows )
    {
      for ( var i = 0, len = rows.length; i < len; i++)
      {
        rows[i][0].isRowChecked = false;
      }
      this.fireModelChanged();
    }
  },

  invertCheckedStudents : function()
  {
    var rows = this.visibleRows;
    for ( var i = 0, len = rows.length; i < len; i++)
    {
      rows[i][0].isRowChecked = !rows[i][0].isRowChecked;
    }
    this.fireModelChanged();
  },

  checkedRangeOfStudents : function(uid1, uid2)
  {
    var startId;
    var rows = this.visibleRows;
    for ( var i = 0, len = rows.length; i < len; i++)
    {
      var uid = rows[i][0].uid;
      if (!startId && (uid != uid1 && uid != uid2))
      {
        continue;
      }
      else if (!startId && uid == uid1)
      {
        startId = uid;
      }
      else if (!startId && uid == uid2)
      {
        startId = uid;
      }
      else if (uid == uid1 || uid == uid2)
      {
        break;
      }
      else
      {
        rows[i][0].isRowChecked = true;
      }
    }
    this.fireModelChanged();
  },

  clearAttempts : function(colId, clearOption, startDate, endDate)
  {
    this.gradebookService.clearAttempts(colId, clearOption, startDate, endDate);
  },

  updateGroups : function()
  {
    var crsId = this.courseId;
    if (crsId.indexOf("_") >= 0)
    {
      crsId = crsId.split("_")[1];
    }
    var gradeCenterContentFrame = window.frames.gradecenterframe; // Grade Center Frame in SSL mode
    if (!gradeCenterContentFrame)
    {
      gradeCenterContentFrame = window.frames.content; // regular course content frame
    }
    if (!gradeCenterContentFrame.GradebookDWRFacade)
    {
      gradeCenterContentFrame = window.frames.content.frames.main;
    }
    gradeCenterContentFrame.GradebookDWRFacade.getGroups(crsId, Gradebook.GridModel.prototype.updateGroupsCallback);
  },

  updateGroupsCallback : function(retData)
  {
    var groupsMap = [];
    var groups = [];
    var h = $H(retData);
    h.each(function(pair)
    {
      var g = {};
      g.id = pair.key;
      g.uids = pair.value;
      groupsMap[g.id] = groups.length;
      groups.push(g);
    });
    var model = Gradebook.getModel();
    model.groupsMap = groupsMap;
    model.groups = groups;
  },

  // used by reporting
  getReportData : function(reportDef)
  {
    var LAST_NAME_COL_IDX = 0;
    // get rows for students to include in report
    var userIds = null;
    if (reportDef.students == 'BYGROUPS')
    {
      if (!reportDef.groupIds)
      {
        GradebookUtil.error('GridModel error getReportData: no reportDef.groupIds');
        return null;
      }
      userIds = this._getUserIdsByGroupIds(reportDef.groupIds);
    }
    else if (reportDef.students == 'BYSTUDENT')
    {
      if (!reportDef.studentIds)
      {
        GradebookUtil.error('GridModel error getReportData: no reportDef.studentIds');
        return null;
      }
      userIds = reportDef.studentIds;
    }
    var rows = this._getRowsByUserIds(userIds);
    if (!reportDef.includeHiddenStudents)
    {
      rows = this._removeHiddenStudents(rows);
    }
    // get columns to include in report
    var colDefs;
    if ( reportDef.columns == 'GRID_VIEW' )
    {
      colDefs = this.getCurrentColDefs(true);
    }
    else if ( reportDef.columns == 'ALLITEMS' )
    {
      colDefs = this.getColDefs( true/*only grade columns*/, reportDef.includeHiddenColumns );
      colDefs.sort( this._sortColByPosFunc.bind(this) ); // sort by position
    }
    else
    {
      if (reportDef.columns == 'BYITEM')
      {
        colDefs = this._getColDefsById(reportDef.itemIds);
      }
      else if (reportDef.columns == 'BYGP')
      {
        colDefs = this._getColDefsByGradingPeriodId(reportDef.gradingPeriodIds);
      }
      else if (reportDef.columns == 'BYCAT')
      {
        colDefs = this._getColDefsByCategoryId(reportDef.categoryIds);
      }
      if (!reportDef.includeHiddenColumns)
      {
        colDefs = this._removeHiddenColumns(colDefs);
      }
      colDefs.sort( this._sortColByPosFunc.bind(this) ); // sort by position
    }

    //before printing the report, sort on student's last name,according to PM's requirement
    rows.sort(function(a, b)
    {
      var aa = a[LAST_NAME_COL_IDX].sortval;
      var bb = b[LAST_NAME_COL_IDX].sortval;
      if (aa == bb)
      {
        return 0;
      }
      else if (aa < bb)
      {
        return -1;
      }
      else
      {
        return 1;
      }
    });
    // create return data structure
    var reportData =
    {};
    reportData.columnInfoMap = [];
    reportData.studentGradeInfo = [];

    var i, len, len0;

    // add column data
    for (i = 0, len = colDefs.length; i < len; i++)
    {
      var cdef = colDefs[i];
      var cdata = {};
      reportData.columnInfoMap[cdef.id] = cdata;
      cdata.name = cdef.getName();
      if (reportDef.columnInfoDescription)
      {
        cdata.description = 'tbd'; // server will provide desc map
      }
      if (reportDef.columnInfoDueDate)
      {
        cdata.dueDate = cdef.getDueDate();
      }
      if (reportDef.columnInfoStatsMedian || reportDef.columnInfoStatsAverage)
      {
        var stats = cdef.getStats(true); // include unavailable students
        cdata.statsMedian = stats.median;
        cdata.statsAverage = stats.avg;
      }
    }

    // add student data
    for (i = 0, len0 = rows.length; i < len0; i++)
    {
      var row = rows[i];
      var rd =
      {};
      reportData.studentGradeInfo.push(rd);

      if (reportDef.firstName)
      {
        rd.firstName = this._getStudentAttribute(row, 'FN');
      }
      if (reportDef.lastName)
      {
        rd.lastName = this._getStudentAttribute(row, 'LN');
      }
      if (reportDef.studentId)
      {
        rd.studentId = this._getStudentAttribute(row, 'SI');
      }
      if (reportDef.userName)
      {
        rd.userName = this._getStudentAttribute(row, 'UN');
      }
      if (reportDef.lastAccessed)
      {
        rd.lastAccessed = this._getStudentAttribute(row, 'LA');
        if (rd.lastAccessed && rd.lastAccessed > 0)
        {
          var date = new Date();
          date.setTime(rd.lastAccessed);
          rd.lastAccessed = formatDate(date, 'MMM d, y');
        }
      }
      rd.grades = [];
      for ( var c = 0, len1 = colDefs.length; c < len1; c++)
      {
        var g =
        {};
        g.cid = colDefs[c].id;
        var gridCell = this._getGrade(row, colDefs[c]);
        if (gridCell.attemptInProgress() && !gridCell.isOverride())
        {
          g.grade = this.getMessage('inProgressMsg');
        }
        else if (gridCell.needsGrading() && !gridCell.isOverride())
        {
          g.grade = this.getMessage('needsGradingMsg');
        }
        else
        {
          g.grade = gridCell.getCellValue();
        }
        rd.grades.push(g);
      }
    }
    return reportData;
  },

  _getGrade : function(row, colDef)
  {
    var colIndex = this.colDefMap[colDef.id];
    if (!colIndex)
    {
      GradebookUtil.error('GridModel _getGrade invalid column id: ' + colDef.id);
      return null;
    }
    var data = row[colIndex];
    if (!data.metaData)
    {
      data.metaData = row[0];
    }
    if (!data.colDef)
    {
      data.colDef = colDef;
    }
    return new Gradebook.GridCell(data);
  },

  _getStudentAttribute : function(row, colDefId)
  {
    var colIndex = this.colDefMap[colDefId];
    if ( Object.isUndefined( colIndex ) )
    {
      GradebookUtil.error('GridModel _getStudentAttribute invalid column id: ' + colDefId);
      return null;
    }
    return row[colIndex].v;
  },

  _removeHiddenStudents : function(students)
  {
    var retStudents = [];
    for ( var i = 0, len = students.length; i < len; i++)
    {
      if (!students[i][0].isHidden)
      {
        retStudents.push(students[i]);
      }
    }
    return retStudents;
  },

  _removeHiddenColumns : function(colDefs)
  {
    var retColDefs =  [];
    for ( var i = 0, len = colDefs.length; i < len; i++)
    {
      if (!colDefs[i].isHidden())
      {
        retColDefs.push(colDefs[i]);
      }
    }
    return retColDefs;
  },

  _getColDefsById : function(itemIds)
  {
    var colDefs = [];
    for ( var i = 0, len = this.colDefs.length; i < len; i++)
    {
      if (itemIds.indexOf(this.colDefs[i].id) != -1)
      {
        colDefs.push(this.colDefs[i]);
      }
    }
    return colDefs;
  },

  _getColDefsByCategoryId : function(categoryIds)
  {
    var colDefs =
      [];
    for ( var i = 0, len = this.colDefs.length; i < len; i++)
    {
      if (categoryIds.indexOf(this.colDefs[i].catid) != -1)
      {
        colDefs.push(this.colDefs[i]);
      }
    }
    return colDefs;
  },

  _getColDefsByGradingPeriodId : function(gradingPeriodIds)
  {
    var colDefs =
      [];
    for ( var i = 0, len = this.colDefs.length; i < len; i++)
    {
      if (gradingPeriodIds.indexOf(this.colDefs[i].gpid) != -1)
      {
        colDefs.push(this.colDefs[i]);
      }
    }
    return colDefs;
  },

  _getRowsByUserIds : function(userIds)
  {
    var rows = this.rows;
    if (!userIds)
    {
      return rows;
    }
    var retRows =
      [];
    for ( var i = 0, len = rows.length; i < len; i++)
    {
      if (userIds.indexOf(rows[i][0].uid) != -1)
      {
        retRows.push(rows[i]);
      }
    }
    return retRows;
  },

  _getUserIdsByGroupIds : function(groupIds)
  {
    if (!this.groupsMap || !this.groups)
    {
      GradebookUtil.error('GridModel error getUserIdsByGroupIds: no groups');
      return null;
    }
    var userIds = [];
    for ( var i = 0; i < groupIds.length; i++)
    {
      var index = this.groupsMap[Number(groupIds[i])];
      if ( undefined === index )
      {
        GradebookUtil.error('GridModel error getUserIdsByGroupIds: no group for id: ' + groupIds[i]);
        continue;
      }
      var group = this.groups[index];
      for ( var g = 0; g < group.uids.length; g++)
      {
        if (userIds.indexOf(group.uids[g]) == -1)
        {
          userIds.push(String(group.uids[g]));
        }
      }
    }
    return userIds;
  },

  // called by student stats page
  getStudentStats : function(userId, currentViewOnly)
  {
    var studentStats =
    {};
    studentStats.catStats =
      [];
    var catMap =
      [];
    var i, catStat;

    // get columns, either all or current view
  var colDefs =
    [];
  var len = currentViewOnly ? this.colOrderMap.length : this.colDefs.length;
  for (i = 0; i < len; i++)
  {
    var idx = currentViewOnly ? this.colOrderMap[i] : i;
    var c = this.colDefs[idx];
    if (!c.deleted && c.isGrade() && !c.isCalculated())
    {
      colDefs.push(c);
    }
  }

  var row = this.getRowByUserId(userId);

  for (i = 0; i < colDefs.length; i++)
  {
    var colDef = colDefs[i];
    var catId = colDef.getCategoryID();
    catStat = catMap[catId];
    if (!catStat)
    {
      catStat =
      {};
      catStat.name = colDef.getCategory();
      catStat.qtyGraded = 0;
      catStat.qtyInProgress = 0;
      catStat.qtyNeedsGrading = 0;
      catStat.qtyExempt = 0;
      catStat.sum = 0;
      catStat.avg = 0;
      catMap[catId] = catStat;
      studentStats.catStats.push(catStat);
    }
    var grade = this._getGrade(row, colDef);
    var val = grade.getValue();
    var isNull = (val == '-');
    var isIP = grade.attemptInProgress();
    var isNG = grade.needsGrading();
    var isExempt = grade.isExempt();
    var isVal = (!isNull && !isIP && !isNG && !isExempt);
    if (isIP)
    {
      catStat.qtyInProgress++;
    }
    else if (isNG)
    {
      catStat.qtyNeedsGrading++;
    }
    else if (isExempt)
    {
      catStat.qtyExempt++;
    }

    if (isVal)
    {
      catStat.qtyGraded++;
      if (colDef.isCalculated())
      {
        val = parseFloat(val) / parseFloat(grade.getPointsPossible()) * 100.0;
      }
      catStat.sum += parseFloat(val);
    }
  }
  studentStats.numItemsCompleted = 0;
  var totNumExempt = 0;
  for (i = 0; i < studentStats.catStats.length; i++)
  {
    catStat = studentStats.catStats[i];
    if (catStat.sum > 0)
    {
      catStat.avg = catStat.sum / parseFloat(catStat.qtyGraded);
      catStat.avg = NumberFormatter.getDisplayFloat(catStat.avg.toFixed(2));
    }
    totNumExempt += catStat.qtyExempt;
    studentStats.numItemsCompleted += (catStat.qtyNeedsGrading + catStat.qtyGraded);
  }
  studentStats.numItems = colDefs.length - totNumExempt;
  return studentStats;
},

getAccessibleMode : function()
{
  return this.accessibleMode;
},

setAccessibleMode : function(accessibleMode)
{
  this.accessibleMode = accessibleMode;
},

setMessages : function(messages)
{
  this.messages = messages;
},

getMessage : function(key, args)
{
  if (this.messages)
  {
    if( args ) {
      var msgTemplate = new Template(this.messages[key]);
      return msgTemplate.evaluate(args);
    } else {
      return this.messages[key];
    }
  }
  else
  {
    return key;
  }
}

};

////////////////////////////Utility //////////////////////////////////////

Gradebook.GridRowIterator = Class.create();

Gradebook.GridRowIterator.prototype =
{
  initialize : function(dataArray, orderMap, startIndex, colDefs)
  {
    this.dataArray = dataArray;
    this.orderMap = orderMap;
    this.currentIndex = startIndex;
    this.colDefs = colDefs;
  },

  hasNext : function()
  {
    return this.currentIndex < this.orderMap.length;
  },

  next : function()
  {
    if (this.currentIndex >= this.orderMap.length)
    {
      GradebookUtil.error('GridRowIterator out of data. length = ' + this.orderMap.length);
      return null;
    }
    var idx = this.orderMap[this.currentIndex++];
    var data = this.dataArray[idx];
    // add colDef & metedata reference to cell data, if not already there
    if (!data.colDef)
    {
      data.colDef = this.colDefs[idx];
    }
    if (!data.metaData)
    {
      data.metaData = this.dataArray[0]; // first cell is extended with metadata
    }
    return data;
  }
};

Gradebook.ColDefIterator = Class.create();

Gradebook.ColDefIterator.prototype =
{
  initialize : function(dataArray, orderMap, startIndex)
  {
    this.dataArray = dataArray;
    this.orderMap = orderMap;
    this.currentIndex = startIndex;
  },
  hasNext : function()
  {
    return this.currentIndex < this.orderMap.length;
  },
  next : function()
  {
    if (this.currentIndex >= this.orderMap.length)
    {
      GradebookUtil.error('ColDefIterator out of data. length = ' + this.orderMap.length);
      return null;
    }
    return this.dataArray[this.orderMap[this.currentIndex++]];
  }
};

Gradebook.numberComparator = function(a, b)
{
  return a - b;
};

var NumberFormatter =
{

  // usually called from frameset scope and re-set when the locale format is set on the model
  needToConvert : false,
  
  thousandsSeparator : ( typeof LOCALE_SETTINGS === 'undefined' || LOCALE_SETTINGS.getString('number_format.thousands_sep') === null ) ? ',' : LOCALE_SETTINGS.getString('number_format.thousands_sep'),
  decimalSeparator   : ( typeof LOCALE_SETTINGS === 'undefined' || LOCALE_SETTINGS.getString('number_format.decimal_point') === null ) ? '.' : LOCALE_SETTINGS.getString('number_format.decimal_point'),

  toStringMin2Digits: function( num, maxPrecision )
  {
    if ( 2 == maxPrecision )
    {
      return NumberFormatter.getDisplayFloat( num.toFixed( 2 ) );
    }
    // now will try to get as little extra digits as needed, up to 5
    var roundBase = 100;
    var maxRoundBase = Math.pow( 10, maxPrecision );
    var mostPreciseRounding = Math.round( num * maxRoundBase ) / maxRoundBase;

    for ( var i = 2; i < maxPrecision; ++ i )
    {
      var floatRound =  Math.round( num * roundBase ) / roundBase;
      roundBase *= 10;
      if ( floatRound == mostPreciseRounding )
      {
        // adding any more digit will not add any more precision
        return NumberFormatter.getDisplayFloat( num.toFixed( i ) );
      }
    }
    return NumberFormatter.getDisplayFloat( num.toFixed( maxPrecision ) );
  },

  //takes an unlocalized number (either String or Number) and converts it to a localized string version
 	getDisplayFloat : function(f)
 	{
 	  f = '' + f;
 	  if ( NumberFormatter.thousandsSeparator !== ',' )
 	  {
 		  f = f.replace( ',', '[comma]' );
    }
 
    if ( NumberFormatter.decimalSeparator !== '.' )
    {
      f = f.replace( '.', NumberFormatter.decimalSeparator );
    }
 
    if ( NumberFormatter.thousandsSeparator !== ',' )
    {
      f = f.replace( '[comma]', NumberFormatter.thousandsSeparator );
    }

    return f;
  },

  //takes a localized String number and connverts it to an unlocalized String version
  getDotFloat : function(f)
  {
    f = '' + f;
    f = f.replace( NumberFormatter.thousandsSeparator, '' );
    if ( NumberFormatter.decimalSeparator !== '.' )
    {
      f = f.replace( NumberFormatter.decimalSeparator, '.' );
    }
    return f;
  },

  parseLocaleFloat: function ( num )
  {
    if ( !num )
    {
      return NaN;
    }
    var dotFloat = NumberFormatter.getDotFloat( num );
    return parseFloat( dotFloat );
  }
};
// called to load model with server data
Gradebook.GridModel.prototype.requestLoadData = function(forceFlush)
{
  this.lastUpdateTS = new Date().getTime();
  this.gradebookService.requestLoadData((this._loadDataFromJSON).bind(this), (this._reportError).bind(this), (this._reportException).bind(this), forceFlush);
};

// called to update model with server data
Gradebook.GridModel.prototype.requestUpdateData = function()
{
  var timeSinceLastUpdate = new Date().getTime() - this.lastUpdateTS;
  // don't update if window is resizing and we've reloaded in the last 5
  // minutes
  if (!this.usingCachedBook && this.resizingWindow && (timeSinceLastUpdate < 5 * 60 * 1000))
  {
    this.fireModelChanged();
    return;
  }
  this.lastUpdateTS = new Date().getTime();
  var customViewId = null;
  if (this.currentCustomView && this.currentCustomView.usesGroups())
  {
    customViewId = this.currentCustomView.id;
  }
  this.gradebookService.requestUpdateData(this.version, this.lastUserChangeTS, this.usersHash, this.scoreProvidersHash, customViewId, (this._updateDataFromJSON).bind(this),
      (this._reportError).bind(this), (this._reportException).bind(this));
};

function registerScoreProviderActionController( controller, ctrlJsName )
{
  var model = Gradebook.getModel();
  for (var i in model.scoreProviderActionsMap)
  {
    if ( model.scoreProviderActionsMap.hasOwnProperty( i ) )
    {
      var action = model.scoreProviderActionsMap[i];
      if (action.controlLogic && action.controlLogic.indexOf( ctrlJsName ) > -1)
      {
        action.controller = controller;
        return;
      }
    }
  }
}

// callback when initializing this gradebook model with server data
Gradebook.GridModel.prototype._loadDataFromJSON = function(reply)
{
  var jsonBook;
  try
  {
    if (typeof (JSON) === 'object' && typeof (JSON.parse) === 'function')
    {
      jsonBook = JSON.parse(reply.responseText);
    }
    else
    {
      jsonBook = eval('(' + reply.responseText + ')');
    }
  }
  catch (e)
  {
    this.fireModelError(e, reply.responseText);
    return;
  }
  if (jsonBook.cachedBook)
  {
    // user specific data is data added ontop of the cached data to replace
    // part of the cached data (since the cached data is per course, not per user)
    // right now there is only one per-user data: the edit content for item in score provider
    if ( jsonBook.currentUserData && jsonBook.currentUserData.scoreProvidersCurrentUser )
    {
      jsonBook.cachedBook.scoreProvidersCurrentUser = jsonBook.currentUserData.scoreProvidersCurrentUser;
    }
    jsonBook = jsonBook.cachedBook;
    this.usingCachedBook = true;
  }
  try
  {
    this.schemaMap = [];
    var i, len;
    for (i = 0; i < jsonBook.schemas.length; i++)
    {
      jsonBook.schemas[i] = this._createSchema(jsonBook.schemas[i].type, jsonBook.schemas[i]);
      this.schemaMap[jsonBook.schemas[i].id] = jsonBook.schemas[i];
    }
    this.colDefMap = [];
    for (i = 0; i < jsonBook.colDefs.length; i++)
    {
      jsonBook.colDefs[i] = this._createColDef(jsonBook.colDefs[i], this, this.schemaMap);
      this.colDefMap[jsonBook.colDefs[i].id] = i;
    }

    // embelish 1st cell of each row with some flags
    this.rowUserIdMap = [];
    if (jsonBook.rows)
    {
      for (i = 0, len = jsonBook.rows.length; i < len; i++)
      {
        var c = jsonBook.rows[i][0];
        c.isRowChecked = false;
        c.isHidden = false;
        c.isAvailable = c.avail;
        c.comput_err = false;
        this.rowUserIdMap[c.uid] = i;
      }
    }

    this.customViewMap = [];
    if (jsonBook.customViews)
    {
      for (i = 0; i < jsonBook.customViews.length; i++)
      {
        jsonBook.customViews[i] = new Gradebook.CustomView(jsonBook.customViews[i], this);
        this.customViewMap[jsonBook.customViews[i].id] = i;
      }
    }
    this.groupsMap = [];
    if (jsonBook.groups)
    {
      for (i = 0; i < jsonBook.groups.length; i++)
      {
        this.groupsMap[jsonBook.groups[i].id] = i;
      }
    }
    this._setScoreProviders( jsonBook );
    this.gridColorScheme = jsonBook.colorscheme;
    this._buildCategoryNameMap( jsonBook );
    Object.extend(this, jsonBook); // assign json properties to this object
    this._buildGradingPeriodMap();
    this._setStudentInfoLayout();
    this.setCurrentView(this.initialView);
    this._updateVisibleRows(jsonBook);
    this.sortColumns();
    if (this.colDefMap.LN !== undefined)
    {
      if (this.colDefs[this.colDefMap.LN].gbvis)
      {
        this.sort( this.getSortIndex( 'LN' ), 'ASC', this.getSortIndex( 'FN' ) );
      }
      else
      {
        this.sort( this.getSortIndex( undefined ), 'ASC' );
      }
    }
    this.lastLogEntryTS = jsonBook.lastLogEntryTS;

    if (!this.usingCachedBook)
    {
      this.initialView = null;
      this.fireModelChanged();
    }
    else
    {
      this.requestUpdateData();
    }
  }
  catch (e2)
  {
    this.fireModelError(e2);
  }
};

Gradebook.GridModel.prototype._setScoreProviders = function( jsonBook )
{
  if ( jsonBook.scoreProviders )
  {
    this.scoreProvidersMap = [];
    this.scoreProviderActionsMap = [];
    this.scoreProvidersHash = jsonBook.scoreProvidersHash;
    for ( i = 0; i < jsonBook.scoreProviders.length; i++)
    {
      this.scoreProvidersMap[jsonBook.scoreProviders[i].handle] = jsonBook.scoreProviders[i];
      var actions = jsonBook.scoreProviders[i].actions;
      if (actions)
      {
        for (var j = 0; j < actions.length; j++)
        {
          this.scoreProviderActionsMap[actions[j].id] = actions[j];
          if (actions[j].controlLogic)
          {
              $$('head')[0].appendChild( new Element('script', { type: 'text/javascript', src: actions[j].controlLogic } ) );
          }
        }
      }
    }
    if ( jsonBook.scoreProvidersCurrentUser )
    {
      for ( i = 0; i < jsonBook.scoreProvidersCurrentUser.length; i++)
      {
        var spu = jsonBook.scoreProvidersCurrentUser[ i ];
        if ( spu )
        {
          // statically handled for the time being since it is only a single per-user attribute
		  if(this.scoreProvidersMap[ spu.handle]== null)
		{
				this.scoreProvidersMap[ spu.handle ] = spu;
		}
          this.scoreProvidersMap[ spu.handle ].allowContentEdit = spu.allowContentEdit?true:false;
        }
      }
    }
  }
};

// callback when updating this gradebook model with server data
Gradebook.GridModel.prototype._updateDataFromJSON = function(reply)
{
  var jsonBook;
  try
  {
    if (typeof (JSON) === 'object' && typeof (JSON.parse) === 'function')
    {
      jsonBook = JSON.parse(reply.responseText);
    }
    else
    {
      jsonBook = eval('(' + reply.responseText + ')');
    }
  }
  catch (e)
  {
    this.fireModelError(e, reply.responseText);
    return;
  }
  try
  {
    // need to reinitialize if new users added to pick up existing grades
    // when a user is re-enabled
    if (this._hasNewUsers(jsonBook))
    {
      this.requestLoadData(true /*
                                 * force flush since extra users cannot be
                                 * loaded by delta
                                 */);
      return;
    }
    this.version = jsonBook.version;
    this.lastUserChangeTS = jsonBook.lastUserChangeTS;
    this.usersHash = jsonBook.usersHash;
    this.numFrozenColumns = jsonBook.numFrozenColumns;
    this.gradingPeriods = jsonBook.gradingPeriods;
    this.categories = jsonBook.categories;
    this._buildCategoryNameMap(jsonBook);
    this.studentInfoLayouts = jsonBook.studentInfoLayouts;
    this.pubColID = jsonBook.pubColID;
    this.defView = jsonBook.defView;

    var i, len;

    this._setScoreProviders( jsonBook );
    if (jsonBook.schemas)
    {
      for (i = 0; i < jsonBook.schemas.length; i++)
      {
        // create a new schema if one with same id does not already exists
        var schema = this.schemaMap[jsonBook.schemas[i].id];
        if (schema === undefined)
        {
          schema = this._createSchema(jsonBook.schemas[i].type, jsonBook.schemas[i]);
          this.schemaMap[jsonBook.schemas[i].id] = schema;
        }
        else
        {
          Object.extend(schema, jsonBook.schemas[i]);
        }
      }
    }
    if (jsonBook.groups)
    {
      if (!this.groupsMap || !this.groups || this.groups.length === 0)
      {
        this.groupsMap =
          [];
        this.groups = jsonBook.groups;
        for (i = 0; i < jsonBook.groups.length; i++)
        {
          this.groupsMap[jsonBook.groups[i].id] = i;
        }
      }
      else
      {
        for (i = 0; i < jsonBook.groups.length; i++)
        {
          var group = this.groupsMap[jsonBook.groups[i].id];
          if (group === undefined)
          {
            this.groupsMap[jsonBook.groups[i].id] = this.groups.length;
            this.groups.push(jsonBook.groups[i]);
          }
          else
          {
            this.groups[group] = jsonBook.groups[i];
          }
        }
      }
    }

    if (jsonBook.colDefs)
    {
      for (i = 0; i < jsonBook.colDefs.length; i++)
      {
        // create a new colDef if one with same id does not already exists
        var colIndex = this.colDefMap[jsonBook.colDefs[i].id];
        if (!colIndex)
        {
          if (jsonBook.colDefs[i].deleted)
          {
            continue;
          }
          this.colDefMap[jsonBook.colDefs[i].id] = this.colDefs.length;
          this.colDefs.push(this._createColDef(jsonBook.colDefs[i], this, this.schemaMap));
        }
        else
        {
          // we should actually discard the previous version and replace it with
          // the new one
          // however all cells hold a ref to the object making this
          // impractical. With incoming
          // refactoring that should not be an issue since col def will
          // always be looked up by
          // cell index in the row - right now only delete the src since it
          // is omitted from payload
          // when absent
          var colDef = this.colDefs[colIndex];
          colDef.comput_err = false;
          if (colDef.src)
          {
            delete colDef.src;
          }
          Object.extend(colDef, jsonBook.colDefs[i]);
          // clear all grades in column if computation error for column
          if (jsonBook.colDefs[i].comput_err)
          {
            var grades = this._getGradesForItemId(jsonBook.colDefs[i].id, true);
            for ( var g = 0; g < grades.length; g++)
            {
              grades[g].initialize(grades[g].colDef, grades[g].metaData);
            }
          }
          if (colDef.deleted)
          {
            this.colDefMap[colDef.id] = null;
          }
          if (colDef.sid)
          {
            colDef.primarySchema = this.schemaMap[colDef.sid];
          }
          if (colDef.ssid && colDef.ssid.length > 0)
          {
            colDef.secondarySchema = this.schemaMap[colDef.ssid];
          }
          else
          {
            colDef.secondarySchema = null;
          }
        }
      }
    }
    // need to add any new row data?
    if (this.rows && this.rows.length > 0)
    {
      var numNewCols = this.colDefs.length - this.rows[0].length;
      if (this.rows.length > 0 && numNewCols > 0)
      {
        for (i = 0; i < this.rows.length; i++)
        {
          for ( var c = 0; c < numNewCols; c++)
          {
            this.rows[i].push(
            {}); // add empty cell for each new column
          }
        }
      }
    }

    var tempArray;

    if (jsonBook.rows)
    {
      // users changed, need to resync
      if (jsonBook.type == "delta_with_user")
      {
        // remove rows from model that are not in json data
        tempArray = [];
        for (i = 0; i < this.rows.length; i++)
        {
          if (this._containsUser(jsonBook.rows, this.rows[i][0].uid))
          {
            tempArray.push(this.rows[i]);
          }
        }
        this.rows = tempArray;
      }
      this.rowUserIdMap = [];
      for (i = 0, len = this.rows.length; i < len; i++)
      {
        this.rowUserIdMap[this.rows[i][0].uid] = i;
      }

      // update rows
      for (i = 0; i < jsonBook.rows.length; i++)
      {
        var row = this.getRowByUserId(jsonBook.rows[i][0].uid);
        if (!row)
        {
          GradebookUtil.error('Can not update non-existing row for user id: ' + jsonBook.rows[i][0].uid);
        }
        else
        {
          this._updateRowDataFromJSON(row, jsonBook.rows[i], this.colDefs, this.colDefMap);
        }
      }
    }
    this._buildGradingPeriodMap();
    if (jsonBook.customViews)
    {
      for (i = 0; i < jsonBook.customViews.length; i++)
      {
        // create a new custom view if one with same id does not already exists
        var idx = this.customViewMap[jsonBook.customViews[i].id];
        if (idx === undefined)
        {
          this.customViewMap[jsonBook.customViews[i].id] = this.customViews.length;
          this.customViews.push(new Gradebook.CustomView(jsonBook.customViews[i], this));
        }
        else
        {
          this.customViews[idx] = new Gradebook.CustomView(jsonBook.customViews[i], this);
        }
      }
    }
    if ( jsonBook.colorscheme )
    {
      this.gridColorScheme = jsonBook.colorscheme;
    }
    // remove any custom views not in customViewIds
    if (this.customViews)
    {
      tempArray = [];
      this.customViewMap = [];
      for (i = 0; i < this.customViews.length; i++)
      {
        // Check for either the id as a number or the raw id - in chrome this is failing for me when I check as a number
        // because it is a string in that array..  checking for either as either match will be a good one and I'm not 
        // sure how it would have worked as Number() but do not want to risk removing it or spend the hours required to
        // track down all permutations that may get here that way.
        if (jsonBook.customViewIds.indexOf(Number(this.customViews[i].id)) != -1 || 
            jsonBook.customViewIds.indexOf(this.customViews[i].id) != -1)
        {
          this.customViewMap[this.customViews[i].id] = tempArray.length;
          tempArray.push(this.customViews[i]);
        }
      }
      this.customViews = tempArray;
    }
    this._setStudentInfoLayout();
    if (this.initialView || this.usingCachedBook)
    {
      this.setCurrentView(this.initialView);
      this.initialView = null;
    }
    this.lastLogEntryTS = jsonBook.lastLogEntryTS;
    this._updateVisibleRows(jsonBook);
    this.sortColumns();
    this.reSort();
    this.usingCachedBook = false;
    this.checkedNoStudents(); // do this last, it will fireModelChanged
  }
  catch (e2)
  {
    this.fireModelError(e2);
  }
};

Gradebook.GridModel.prototype._updateRowDataFromJSON = function(thisRow, jsonRow, colDefs, colDefMap)
{

  for ( var i = 0; i < jsonRow.length; i++)
  {
    var colIndex = colDefMap[jsonRow[i].c];
    colDefs[colIndex].comput_err = false;
    var currentCell = thisRow[colIndex];
    // reset any property that is not always part of the cell data
    if (currentCell.mp)
    {
      delete currentCell.mp;
    }
    if (currentCell.x)
    {
      delete currentCell.x;
    }
    if (currentCell.ax)
    {
      delete currentCell.ax;
    }
    if (currentCell.excluded)
    {
      delete currentCell.excluded;
    }
    if (currentCell.numAtt)
    {
      delete currentCell.numAtt;
    }
    if (currentCell.or)
    {
      delete currentCell.or;
    }
    if (currentCell.orBefAtt)
    {
      delete currentCell.orBefAtt;
    }
    if (currentCell.ip)
    {
      delete currentCell.ip;
    }
    if (currentCell.ng)
    {
      delete currentCell.ng;
    }
    if (currentCell.na)
    {
      delete currentCell.na;
    }
    delete currentCell.attemptsInfo;
    Object.extend(currentCell, jsonRow[i]);
  }
  thisRow[0].isAvailable = thisRow[0].avail;
};

Gradebook.GridModel.prototype._createColDef = function(jsonColDef, model, schemaMap)
{
  if (jsonColDef.type == "s")
  {
    return new Gradebook.StudentAttributeColDef(jsonColDef, model, schemaMap);
  }
  else
  {
    return new Gradebook.GradeColDef(jsonColDef, model, schemaMap);
  }
};

Gradebook.GridModel.prototype._createSchema = function(type, jsonSchema)
{
  if (type == "S")
  {
    return new Gradebook.NumericSchema(jsonSchema, this);
  }
  else if (type == "X")
  {
    return new Gradebook.TextSchema(jsonSchema, this);
  }
  else if (type == "P")
  {
    return new Gradebook.PercentageSchema(jsonSchema, this);
  }
  else if (type == "C")
  {
    return new Gradebook.CompleteIncompleteSchema(jsonSchema, this);
  }
  else if (type == "T")
  {
    return new Gradebook.LetterSchema(jsonSchema, this);
  }
  else
  {
    return null;
  }

};

Gradebook.GridModel.prototype._buildGradingPeriodMap = function()
{
  this.gradingPeriodMap =
    [];
  if (this.gradingPeriods)
  {
    for ( var i = 0, len = this.gradingPeriods.length; i < len; i++)
    {
      this.gradingPeriodMap[this.gradingPeriods[i].id] = this.gradingPeriods[i];
    }
    this.gradingPeriods.sort(function(a, b)
    {
      var aa = a.name.toLowerCase();
      var bb = b.name.toLowerCase();
      if (aa == bb)
      {
        return 0;
      }
      else if (aa < bb)
      {
        return -1;
      }
      else
      {
        return 1;
      }
    });
  }
};

Gradebook.GridModel.prototype._setStudentInfoLayout = function()
{
  // set pos & gbvis for student attribute columns from studentInfoLayouts
  for ( var i = 0; i < this.studentInfoLayouts.length; i++)
  {
    var colIndex = this.colDefMap[this.studentInfoLayouts[i].id];
    if (colIndex === undefined)
    {
      continue;
    }
    var colDef = this.colDefs[colIndex];
    colDef.gbvis = this.studentInfoLayouts[i].gbvis;
    colDef.pos = this.studentInfoLayouts[i].pos;
  }
};

Gradebook.GridModel.prototype._updateVisibleRows = function(jsonBook)
{
  var showAll = (!jsonBook.hiddenStudentIds || jsonBook.hiddenStudentIds.length === 0);
  this.visibleRows =
    [];
  var rows = this.rows;
  // loop through rows and set hidden flag for each row, add to visibleRows
  // if not hidden
  for ( var i = 0, len = rows.length; i < len; i++)
  {
    var row = rows[i];
    var isHidden = !showAll && (jsonBook.hiddenStudentIds.indexOf(row[0].uid) != -1 || jsonBook.hiddenStudentIds.indexOf(Number(row[0].uid)) != -1);
    row[0].isHidden = isHidden;
    if (!isHidden)
    {
      this.visibleRows.push(row);
    }
  }
  this._applyCustomView();

};

Gradebook.GridModel.prototype._buildCategoryNameMap = function(jsonBook)
{
  this.catNameMap =
    [];
  if (jsonBook.categories)
  {
    for ( var i = 0; i < jsonBook.categories.length; i++)
    {
      this.catNameMap[jsonBook.categories[i].id] = jsonBook.categories[i].name;
    }
  }
};

Gradebook.GridModel.prototype._initMessages = function()
{
  if (this.messages)
  {
    return;
  }
  this.loadingLocalizedMessages = true;
  this.gradebookService.requestLoadMessages((this._onMessageLoaded).bind(this), (this._reportError).bind(this), (this._reportException).bind(this));
};

Gradebook.GridModel.prototype._onMessageLoaded = function(reply)
{
  var messagesJSON = eval('(' + reply.responseText + ')');
  this.messages = messagesJSON.gradebook2Messages;
  delete this.loadingLocalizedMessages;
};
/**
 * Gradebook data grid
 *
 * PORTIONS OF THIS FILE ARE BASED ON RICO LIVEGRID 1.1.2
 *
 * Copyright 2005 Sabre Airline Solutions
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * @author "Bill Richard"
 * @version
 *
 *
 */

Gradebook.ColDef = Class.create();
Gradebook.ColDef.prototype =
{
  initialize : function(jsonObj, model, schemaMap)
  {
    this.model = model;
    Object.extend(this, jsonObj); // assign json properties to this object
  if (this.sid)
  {
    this.primarySchema = schemaMap[this.sid];
  }
  if (this.ssid)
  {
    this.secondarySchema = schemaMap[this.ssid];
  }
},

/**
 * In the case of headers, the colum definition is treated as a cell, so little trick here
 * to have a uniform api: getGridCell().getColumnDefinition() in all cases
 */
getColumnDefinition: function( )
{
  return this;
},

getSortFunction : function( sortdir, secondarySortColumn )
{
  this.secondarySortColumn = secondarySortColumn; // can be null, in that case no second sorting
  if (sortdir == 'ASC')
  {
    return this._sortASC.bind(this);
  } else
  {
    return this._sortDESC.bind(this);
  }
},

validate : function(newValue, matchPartial)
{
  if (!this.primarySchema)
  {
    return null;
  } else
  {
    return this.primarySchema.validate(newValue, matchPartial);
  }
},
_sortASC : function(a, b, isSecondary, fromSortDESC )
{
  isSecondary = isSecondary || ( !this.secondarySortColumn );
  var sortColumnIndex = this.model.colDefMap[ this.id ];
  var aa = a[ sortColumnIndex ].sortval !== undefined?a[ sortColumnIndex ].sortval:a[ sortColumnIndex ].v;
  var bb = b[ sortColumnIndex ].sortval !== undefined?b[ sortColumnIndex ].sortval:b[ sortColumnIndex ].v;

  // Quicksort used in Chrome is not stable (as of May 28, 2012) so we need a measure to prevent random reordering of variables with equal values
  if(fromSortDESC)
  {
    var equalReturnVal = (a.customSortKey > b.customSortKey ? -1 : 1);
  }
  else
  {
    var equalReturnVal = (a.customSortKey > b.customSortKey ? 1 : -1);
  }
  if (!aa && !bb)
  {
    return isSecondary?equalReturnVal:this.secondarySortColumn._sortASC( a, b, true, fromSortDESC);
  }
  if (!aa)
  {
    return -1;
  }
  if (!bb)
  {
    return 1;
  }
  if ( isNaN( aa ) || isNaN( bb ) )
  {
    aa = ( "" + aa ).toLocaleUpperCase();
    bb = ( "" + bb ).toLocaleUpperCase();
    var stringCompare = aa.localeCompare( bb );
    if ( stringCompare === 0 )
    {
      return isSecondary?equalReturnVal:this.secondarySortColumn._sortASC( a, b, true, fromSortDESC);
    }
    return stringCompare;
  }
  if (aa == bb)
  {
    return isSecondary?equalReturnVal:this.secondarySortColumn._sortASC( a, b, true, fromSortDESC);
  }
  if (aa < bb)
  {
    return -1;
  }
  return 1;
},

_sortDESC : function(a, b)
{
  return this._sortASC( b, a, null, true);
},

getEditValue : function(gridCell)
{
  if (!this.primarySchema)
  {
    return gridCell.getValue();
  }
  return this.primarySchema.getEditValue(gridCell);
},

// called by GridCell.getCellValue to get value for rendering in spreadsheet
  // uses primary (and optional secondary) schema to convert value to proper
  // display format
  getCellValue : function(gridCell)
  {
    if (!this.primarySchema)
    {
      return gridCell.getValue();
    }
    var cellVal = this.primarySchema.getCellValue(gridCell);
    if (this.secondarySchema)
    {
      var cellVal2 = this.secondarySchema.getCellValue(gridCell);
      cellVal += ' <span>(' + cellVal2 + ')</span>';
    }

    return cellVal;
  },

  // called by GridCell.getAltValue to get alt (mouse over) value for rendering
  // in spreadsheet
  // same as getCellValue unless there is a secondary schema
  getAltValue : function(gridCell)
  {
    if (gridCell.isExempt())
    {
      return this.model.getMessage('cmExemptGrade');
    }

    if (!this.primarySchema)
    {
      return this.getCellValue(gridCell);
    }
    var cellVal = this.primarySchema.getAltValue(gridCell);
    if (this.secondarySchema)
    {
      var cellVal2 = this.secondarySchema.getAltValue(gridCell);
      cellVal += ' (' + cellVal2 + ')';
    }
    return cellVal;
  },

  getSortValue : function(gridCell)
  {
    if ( gridCell.data && gridCell.data.sortval !== undefined )
    {
      return gridCell.sortval;
    }
    return gridCell.getValue();
  },

  getName : function()
  {
    return this.name;
  },

  getID : function()
  {
    return this.id;
  },

  getPoints : function()
  {
    return this.points;
  },

  getPointsForDisplay : function()
  {
    var formattedPoints = NumberFormatter.getDisplayFloat(this.points);
    if (this.isCalculated())
    {
      formattedPoints = GradebookUtil.getMessage( 'variesPerStudentMsg', { points: formattedPoints } );
    }
    return formattedPoints;
  },

  getAliasID : function()
  {
    return this.id;
  },

  getCategoryID : function()
  {
    return this.catid;
  },

  getCategory : function()
  {
    if (!this.catid)
    {
      return "";
    }
    if (!this.model.catNameMap)
    {
      return "";
    }
    var name = this.model.catNameMap[Number(this.catid)];
    if (name)
    {
      return name;
    }
    return "";
  },

  getCategoryAliasID : function()
  {
    return this.catid;
  },

  getGradingPeriodID : function()
  {
    return this.gpid;
  },

  getGradingPeriod : function()
  {
    if (!this.gpid || !this.model.gradingPeriodMap )
    {
      return "";
    }
    var gp = this.model.gradingPeriodMap[Number(this.gpid)];
    if ( gp )
    {
      return gp.name;
    }
    return "";
  },

  isHidden : function()
  {
    return !this.gbvis;
  },

  isScorable : function()
  {
    return this.scrble;
  },

  isPublic : function()
  {
    return (this.id == this.model.pubColID);
  },

  isVisibleToStudents : function()
  {
    return this.vis;
  },

  hideColumn : function()
  {
    this.gbvis = false;
    this.model.hideColumn( this.id );
  },

  canHide : function()
  {
    return true;
  },

  toggleColumnStudentVisibility : function()
  {
    this.model.setColumnStudentVisibility( this.id, !this.vis );
  },

  getDisplayType : function()
  {
    return this.primarySchema.type;
  },

  hasError : function()
  {
    return this.comput_err;
  },

  // called by model.getDisplayValue when external pages need to convert a
  // rawValue
  // This function passes this.points to schema.getDisplayValue.
  // This method should not be called for this colDef if this colDef is a
  // calculated
  // column, because we do not have access to the gridCell to get its max
  // points.
  // todo: determine how to handle error condition if this column is a calulated
  // col
  getDisplayValue : function(rawValue)
  {
    if (this.primarySchema)
    {
      return this.primarySchema.getDisplayValue(rawValue, this.points);
    }
    return rawValue;
  },

  getSecondaryDisplayValue : function(rawValue)
  {
    if (this.secondarySchema)
    {
      return this.secondarySchema.getDisplayValue(rawValue, this.points);
    }
    return;
  }

};

Gradebook.GradeColDef = Class.create();
Object.extend(Gradebook.GradeColDef.prototype, Gradebook.ColDef.prototype);
Object.extend(Gradebook.GradeColDef.prototype,
{
  initialize : function(jsonObj, model, schemaMap)
  {
    this.linkrefid = "";
    Gradebook.ColDef.prototype.initialize.call(this, jsonObj, model, schemaMap);
  },

  getRawValue : function(newValue)
  {
    var score = newValue;
    // compute score based on primary schema
    if (this.primarySchema)
    {
      var rawValue = this.primarySchema.getRawValue(newValue, this);
      score = parseFloat(rawValue);
      if (!GradebookUtil.isValidFloat(rawValue))
      {
        if (typeof (rawValue) == "string")
        {
          return rawValue;
        }
        score = 0;
      }
    }
    return score;
  },

  getSortValue : function(gridCell)
  {
    if ( this.primarySchema )
    {
      return this.primarySchema.getSortValue( gridCell );
    }
    else
    {
      return gridCell.getValue();
    }
  },

  updateGrade : function(newValue, userId)
  {
    var score = this.getRawValue(newValue);
    var textValue = newValue;
    this.model.updateGrade(score, textValue, userId, this.id);
  },

  // get the grade for this column in the given row, use shared instance of
  // gridcell A
  // use for sort comparisons only... does not support multiple simultaneous
  // instances
  _getGradeA : function(row)
  {
    if (!this.colIndex)
    {
      this.colIndex = this.model.colDefMap[this.id];
    }
    var data = row[this.colIndex];
    if (!data.metaData)
    {
      data.metaData = row[0];
    }
    if (!data.colDef)
    {
      data.colDef = this;
    }
    var gc = Gradebook.GradeColDef.gridCellA;
    if (!gc)
    {
      Gradebook.GradeColDef.gridCellA = new Gradebook.GridCell();
      gc = Gradebook.GradeColDef.gridCellA;
    }
    gc.setData(data);
    return gc;
  },

  // get the grade for this column in the given row, use shared instance of
  // gridcell B
  // use for sort comparisons only... does not support multiple simultaneous
  // instances
  _getGradeB : function(row)
  {
    if (!this.colIndex)
    {
      this.colIndex = this.model.colDefMap[this.id];
    }
    var data = row[this.colIndex];
    if (!data.metaData)
    {
      data.metaData = row[0];
    }
    if (!data.colDef)
    {
      data.colDef = this;
    }
    var gc = Gradebook.GradeColDef.gridCellB;
    if (!gc)
    {
      Gradebook.GradeColDef.gridCellB = new Gradebook.GridCell();
      gc = Gradebook.GradeColDef.gridCellB;
    }
    gc.setData(data);
    return gc;
  },

  _sortASC : function(a, b, isSecondary )
  {
    // if secondary sort is null, we rely on the JS engine stable sort to derive sub-ordering
    isSecondary = isSecondary || ( !this.secondarySortColumn );
    var gradeA = this._getGradeA(a);
    var gradeB = this._getGradeB(b);
    var aa = gradeA.getSortValue();
    var bb = gradeB.getSortValue();
    if (gradeA.colDef.primarySchema instanceof Gradebook.TextSchema)
    {
      var stringComparaison = aa.localeCompare( bb );
      if ( stringComparaison === 0 )
      {
        return isSecondary?0:this.secondarySortColumn._sortASC(a, b, true);
      }
      return stringComparaison;
    }
    var aaa = parseFloat(aa);
    var bbb = parseFloat(bb);
    var aNull = (aa == '-');
    var bNull = (bb == '-');
    var ax = gradeA.isExempt();
    var bx = gradeB.isExempt();
    var aIP = gradeA.attemptInProgress();
    var bIP = gradeB.attemptInProgress();
    var aNG = gradeA.needsGrading();
    var bNG = gradeB.needsGrading();
    var aOr = gradeA.isOverride();
    var bOr = gradeB.isOverride();
    var aNoScore = (aNull || isNaN(aaa) || ax || ( !aOr && ( aIP || aNG ) ) );
    var bNoScore = (bNull || isNaN(bbb) || bx || ( !bOr && ( bIP || bNG ) ) );
    var aVal = (ax) ? 1 : (aIP) ? 2 : (aNG) ? 3 : (aNull) ? 0 : aa;
    var bVal = (bx) ? 1 : (bIP) ? 2 : (bNG) ? 3 : (bNull) ? 0 : bb;
    if (aNoScore || bNoScore)
    {
      if (aNoScore && bNoScore)
      {
        if (aVal == bVal)
        {
          return isSecondary?0:this.secondarySortColumn._sortASC(a, b, true);
        }
        else
        {
          return aVal - bVal;
        }
      }
      if (aNoScore)
      {
        return -1;
      }
      else
      {
        return 1;
      }
    }
    else
    {
      if (aaa == bbb)
      {
        return isSecondary?0:this.secondarySortColumn._sortASC(a, b, true);
      }
      else
      {
        return aaa - bbb;
      }
    }
  },

  _sortDESC : function(a, b)
  {
    return this._sortASC( b, a );
  },

  isAllowAttemptGrading: function()
  {
    var scoreProvider = this.getScoreProvider();
    // default is true unless specified otherwise in the score provider
    return scoreProvider?scoreProvider.allowAttempGrading:true;
  },

  /**
   * Used to determine if an attempt is just a grade holder or if it
   * can be expected to actually contain data behind it. That is determined
   * by the score provider being attempt based or not. If no score provider
   * then it is assumed the attempt might contain payload.
   */
  isAttemptWithPayload: function( )
  {
    if ( this.isManual( ) )
    {
      return false;
    }
    var scoreProvider = this.getScoreProvider();
    return scoreProvider?scoreProvider.attemptBased:true;
  },

  isGrade : function()
  {
    return true;
  },

  isCalculated : function()
  {
    return this.type != "N";
  },

  isTotal : function()
  {
    return this.type == "T";
  },

  isWeighted : function()
  {
    return this.type == "W";
  },

  getType : function()
  {
    switch (this.type)
    {
      case "T":
        return 'total';
      case "W":
        return 'weighted';
      case "A":
        return 'average';
      case "M":
        return 'minMax';
    }
    return "grade";
  },

  isManual : function()
  {
    return this.manual;
  },

  isUserCreated : function()
  {
    return this.userCreated;
  },

  isAlignable : function()
  {
    return this.align && this.align == 'y';
  },

  isAttemptAverage : function()
  {
    return this.avg && this.avg == 'y';
  },

  isHideAttemptScore : function()
  {
    return this.hideAtt;
  },

  isTextSchema : function(schemaId)
  {
    var schema = this.model.schemaMap[schemaId];
    if (schema && (schema.type == "X"))
    {
      return true;
    }
    return false;
  },

  isAssessment : function()
  {
    return (this.src && this.src == 'resource/x-bb-assessment');
  },

  isAssignment : function()
  {
    return (this.src && this.src == 'resource/x-bb-assignment');
  },

  hasRubricAssociations : function()
  {
    return (this.hasRubrics && this.hasRubrics == "y");
  },

  getRubricIds : function()
  {
    return this.rubricIds;
  },

  supportsMenuItem : function( menuItemName )
  {
    if ( Object.isUndefined( this.unsupportedActionNames ) )
    {
      return true;
    }
    else
    {
      return !this.unsupportedActionNames.include( menuItemName );
    }
  },

  getScoreProvider : function()
  {
    if (!this.src)
    {
      return "";
    }
    return this.model.scoreProvidersMap[this.src];
  },

  isAllowMulti : function()
  {
    return (this.am && this.am == "y");
  },

  clearAttemptsByDate : function(startDate, endDate)
  {
    this.model.clearAttempts(this.id, 'BYDATE', startDate, endDate);
  },

  clearAttempts : function(option)
  {
    this.model.clearAttempts(this.id, option);
  },

  getFirstUserWithCurrentViewAttempt : function(anonymousMode)
  {
    var grades = this.model._getGradesForItemId(this.id, false /* includeUnavailable */);
    if (anonymousMode)
    {
      grades.sort(function()
      {
        return (Math.round(Math.random()) - 0.5);
      });
    }
    var filterType = this.model.getCurrentStatus().toUpperCase();
    if (!filterType)
    {
      filterType = "STAT_ALL";
    }
    if (filterType.startsWith("STAT_"))
    {
      filterType = filterType.substr(5, filterType.length - 5);
    }
    if (filterType == "ALL")
    {
      filterType = "NN"; // we can't grade null grades
    }

    // find first user that has a grade which passes the current filter
    for ( var i = 0; i < grades.length; i++)
    {
      if (grades[i].passesFilter(filterType))
      {
        if (grades[i].isOverride() && !grades[i].hasAttempts())
        {
          continue;
        } else
        {
          return grades[i].getUserId();
        }
      }
    }
    return null;
  },

  _gradeAttempts: function ( anonymousMode ) {
    var userId = this.getFirstUserWithCurrentViewAttempt( anonymousMode );
    if (userId === null){
      alert(this.model.getMessage('noUsersFoundAlertMsg'));
      return;
    }
    // get attempts for user
    var s = this.model.getCurrentStatus();
    if (s.startsWith("stat_"))
    {
      s = s.substr( 5, status.length - 5 );
    }
    var url = "/webapps/gradebook/do/instructor/getJSONAttemptData?itemId="+this.id+"&course_id="+this.model.courseId+"&userId="+userId+'&status='+s;
    this.model.gradebookService.makeAjaxRequest(url, function ( resp ){
      var attempts = resp.responseJSON;
      if (attempts === null || attempts.length === 0){
        alert(this.model.getMessage('noAttemptsFoundAlertMsg'));
        return;
      }
      var groupAttemptId = ( attempts[0].groupAttemptId !== 0 ) ? attempts[0].groupAttemptId : null;
      this.gradeAttempt( userId, attempts[0].aid, anonymousMode, groupAttemptId );
    }.bind(this));
  },

   gradeAttempt: function ( userId, attemptId, anonymousMode, groupAttemptId, stat, returnUrl, mode, source ) {

      var url = '/webapps/gradebook/do/instructor/performGrading';

      var status = stat ? stat : this.model.statusFilter;
      if (!status)
      {
        status = "stat_ALL";
      }
      if (status.startsWith("stat_"))
      {
        status = status.substr(5,status.length-5);  // remove starting "stat_"
      }
      var cancelGradeUrl = returnUrl ? returnUrl : '/webapps/gradebook/do/instructor/enterGradeCenter?course_id='+this.model.courseId;

      url = url.concat(
            "?course_id=", this.model.courseId,
            "&status=", status,
            "&viewInfo=", encodeURIComponent( this.model.getCurrentViewName() ),
            "&itemId=", this.id,
            "&courseMembershipId=", userId,
            "&category=", encodeURIComponent( this.getCategory() ),
            "&itemName=", encodeURIComponent( this.getName() ),
            "&source=", source ? source : "cp_gradebook",
            "&mode=", mode ? mode : "invokeFromGradeCenter",
            "&anonymousMode=", anonymousMode ? anonymousMode : "false",
            "&cancelGradeUrl=", encodeURIComponent( cancelGradeUrl ) );
    if ( groupAttemptId )
    {
      url += "&groupAttemptId=" + groupAttemptId;
    }
    if ( attemptId )
    {
      url += "&attemptId=" + attemptId;
    }

    this.postGradingForm( url );
   },

   /* There has been an occurrence in IE9/IE8 (not in compatibility mode) where the upper frame Element
    * did not seem to have the prototype constructor. This caused the code to choke. The problem seemed
    * to be limited to a hotfix branch, but we'll play it safe and just go the lengthier route of using
    * native DOM methods rather than using 'new gcFrame.Element' in the three instances below.
   */
   postGradingForm: function ( url ) {
      var gcFrame = (top.content.gradecenterframe) ? top.content.gradecenterframe : top.content;
      var gradingForm = document.createElement('form');
      gradingForm.setAttribute('method', 'post');
      gradingForm.setAttribute('action', url);
      gcFrame.document.body.insert({ bottom:gradingForm });
      var vo;
      var students = this.model.getStudents();
      var retStudents = [];
      for (var i = 0; i < students.length; i++)
      {
        vo = {};
        vo.name = GradebookUtil.formatStudentName( students[i] );
        vo.id = students[i].id;
        retStudents.push( vo );
      }
      var studentsInputElement = gcFrame.document.createElement('input');
      studentsInputElement.setAttribute('type','hidden');
      studentsInputElement.setAttribute('name','students');
      studentsInputElement.setAttribute('value','{"students":'+Object.toJSON(retStudents)+'}');
      gradingForm.insert({bottom:studentsInputElement});
      var items = this.model.getCurrentColDefs();
      var retItems = [];
      for (var j = 0; j < items.length; j++)
      {
          if (!items[j].isAssignment() && !items[j].isAssessment())
          {
            continue;
          }
          var txt = items[j].getName() + ' ('+items[j].getCategory() +')';
        vo = {};
        vo.name = txt;
        vo.id = items[j].getID();
        retItems.push( vo );
      }
      var itemsInputElement =  gcFrame.document.createElement('input');
      itemsInputElement.setAttribute('type','hidden');
      itemsInputElement.setAttribute('name','items');
      itemsInputElement.setAttribute('value','{"items":'+Object.toJSON(retItems)+'}');
      gradingForm.insert({bottom:itemsInputElement});
      gradingForm.submit();
   },

  hasContextMenuInfo : function()
  {
    return true;
  },
  getDueDate : function()
  {
    var dueDate = GradebookUtil.getMessage('noneMsg');
    //ldue is the date localized in server
    if ( this.ldue && this.ldue != 0 )
    {
      dueDate = this.ldue;
    }
    return dueDate;
  },

  // called by item stats page
  getStats : function(includeUnavailableStudents)
  {

    var grades = this.model._getGradesForItemId(this.id, includeUnavailableStudents);
    if (this.primarySchema instanceof Gradebook.TextSchema)
    {
      grades = [];
    }

    var values = [];
    var sum = 0;
    var stats = {};
    stats.count = 0;
    stats.minVal = null;
    stats.maxVal = null;
    stats.qtyNull = 0;
    stats.qtyInProgress = 0;
    stats.qtyNeedsGrading = 0;
    stats.qtyExempt = 0;

    for ( var i = 0; i < grades.length; i++)
    {
      var grade = grades[i];
      if (grade.isExcluded())
      {
        continue;
      }
      var val = grade.getValue();
      var isNull = (val == '-' || val === '' || null === val );
      var isIP = grade.attemptInProgress();
      var isNG = grade.needsGrading();
      var isExempt = grade.isExempt();
      var isVal = (!isNull && !isExempt);
      if (!grade.isOverride() && isIP)
      {
        // non-manually graded, in progress attempts are excluded from the statistics
        isVal = false;
      }

      if (isIP)
      {
        stats.qtyInProgress++;
      }
      else if (isNG)
      {
        stats.qtyNeedsGrading++;
      }
      else if (isExempt)
      {
        stats.qtyExempt++;
      }
      else if (isNull)
      {
        stats.qtyNull++;
      }

      if (isVal)
      {
        if (this.isCalculated())
        {
          val = (parseFloat(val) / parseFloat( grade.getPointsPossible() ) * 100.0);
        }
        values.push(val);
        sum += parseFloat(val);
        stats.minVal = ( null === stats.minVal ) ? val : Math.min(val, stats.minVal);
        stats.maxVal = ( null === stats.maxVal ) ? val : Math.max(val, stats.maxVal);
      }
    }
    stats.count = values.length;

    if (values.length === 0 || this.isHideAttemptScore())
    {
      stats.avg = '';
      stats.range = '';
      stats.minVal = '';
      stats.maxVal = '';
      stats.median = '';
      stats.variance = '';
      stats.stdDev = '';
    }
    else
    {
      stats.avg = sum / values.length;
      stats.range = stats.maxVal - stats.minVal;

      values.sort(Gradebook.numberComparator);
      if (values.length == 1)
      {
        stats.median = values[0];
      }
      else if (values.length % 2)
      {
        // number of values is odd, the median is the middle value
        stats.median = values[parseInt(values.length / 2, 10)];
      }
      else
      {
        // number of values is even, the median is the average of the two middle
        // values
        stats.median = (values[values.length / 2 - 1] + values[values.length / 2]) / 2;
      }
      stats.variance = this._computeVariance(values, stats.avg);
      stats.stdDev = Math.sqrt(stats.variance);

      stats.maxVal = this._formatFloat(stats.maxVal);
      stats.minVal = this._formatFloat(stats.minVal);
      stats.avg = this._formatFloat(stats.avg);
      stats.range = this._formatFloat(stats.range);
      stats.median = this._formatFloat(stats.median);
      stats.variance = this._formatFloat(stats.variance);
      stats.stdDev = this._formatFloat(stats.stdDev);
    }

    stats.gradeDistribution = this.primarySchema.getGradeDistribution(values, this.isCalculated() ? 100 : this.points, stats);
    return stats;
  },

  _formatFloat : function(f)
  {
    try
    {
      if (f)
      {
        return NumberFormatter.getDisplayFloat(f.toFixed(2));
      }
    }
    catch (e)
    {
      // ignore and return the current value
    }
    return f;
  },

  _computeVariance : function(values, average)
  {
    var sumXMeanSquare = 0;
    for ( var i = 0; i < values.length; i++)
    {
      var xMean = values[i] - average;
      sumXMeanSquare += (xMean * xMean);
    }
    return sumXMeanSquare / values.length;
  },

  getInfo : function()
  {
    var publicLabel;
    if (this.isPublic())
    {
      publicLabel = GradebookUtil.getMessage('isMsg');
    }
    else
    {
      publicLabel = GradebookUtil.getMessage('isNotMsg');
    }
    var includedInCalculationsLabel;
    if (this.isScorable())
    {
      includedInCalculationsLabel = GradebookUtil.getMessage('yesMsg');
    }
    else
    {
      includedInCalculationsLabel = GradebookUtil.getMessage('noMsg');
    }
    var points = this.getPointsForDisplay();
    var info = {};
    info.itemInfoId = this.getID();
    info.itemInfoName = this.name;
    info.itemInfoCategory = this.getCategory();
    info.itemInfoSchema = this.primarySchema.name;
    info.itemInfoPoints = (points === 0 ? "-" : points);
    info.itemInfoPublic = publicLabel;
    info.itemInfoIncludedInCalculations = includedInCalculationsLabel;
    info.itemInfoDueDate = this.getDueDate();
    return info;
  }
});

Gradebook.StudentAttributeColDef = Class.create();

Object.extend(Gradebook.StudentAttributeColDef.prototype, Gradebook.ColDef.prototype);

Object.extend(Gradebook.StudentAttributeColDef.prototype,
{
  initialize : function(jsonObj, model, schemaMap)
  {
    Gradebook.ColDef.prototype.initialize.call(this, jsonObj, model, schemaMap);
    this.vis = true;
  },

  isGrade : function()
  {
    return false;
  },

  isCalculated : function()
  {
    return false;
  },
  isTotal : function()
  {
    return false;
  },

  isWeighted : function()
  {
    return false;
  },

  getType : function()
  {
    return "student";
  },

  getCellValue : function(gridCell)
  {
    return gridCell.getValue();
  },

  getRawValue : function(newValue)
  {
    return newValue;
  },

  canHide : function()
  {
    return (this.model.colOrderMap[0] != this.model.colDefMap[this.id]);
  },

  hasContextMenuInfo : function()
  {
    return true;
  }
});
/*

  GridCell class wraps and provides functionality to a data cell in the grade center.

  Each HTML cell controller will contain a GridCell to allow manipulating the data cell
  that is currently assigned to it.
  When data cells are retrieved for processing they are wrapped in a GridCell.

  brichard
*/


Gradebook.GridCell = Class.create();

Gradebook.GridCell.prototype =
{
  initialize : function(data)
  {
    if (data)
    {
      this.setData(data);
    }
  },

  setData : function(data)
  {
    this.data = data;
    this.colDef = data.colDef;
    this.metaData = data.metaData;
    if (this.colDef.id == 'UN')
    {
      this.metaData.userNameDataCell = data;
    }
  },

  passesFilter : function(f)
  {
    var ng = this.needsGrading();
    var ip = this.attemptInProgress();
    var or = this.isOverride();
    var x = this.isExempt();
    var sv = this.getValue(this);
    var svn = sv == '-';
    var svnn = sv != '-';
    var na = svn && !ip && !ng && !this.colDef.isCalculated() && !this.isExcluded();
    var c = !ip && !ng && !x && svnn;
    var nn = ip || ng || or || svnn;
    if (f == 'IP')
    {
      return ip;
    }
    else if (f == 'NG')
    {
      return ng && !or;
    }
    else if (f == 'EM')
    {
      return or;
    }
    else if (f == 'X')
    {
      return x;
    }
    else if (f == "NA")
    {
      return na; // notAttempted
    }
    else if (f == "NN")
    {
      return nn; // not null
    }
    else if (f == "C")
    {
      return c || or; // completed/graded
    }
    else
    {
      return true; // all
    }
  },

  getUserId : function()
  {
    return this.metaData.uid;
  },

  getInstitutionUserId : function( )
  {
    return this.metaData.iuid;
  },

  getKey : function()
  {
    return this.colDef.id + '_' + this.metaData.uid;
  },

  getUserName : function()
  {
    return this.metaData.userNameDataCell.v;
  },

  isHidden : function()
  {
    return this.metaData.isHidden;
  },

  setHidden : function(h)
  {
    this.metaData.isHidden = h;
  },

  isRowChecked : function()
  {
    return this.metaData.isRowChecked;
  },

  canAddComment : function()
  {
    // Can add comments for: overridden, exempted, or graded cells
    return this.isOverride() || this.isExempt() ||
                        ( this.isPersisted() && !this.needsGrading() &&
                          !this.attemptInProgress() && this.isGraded() && !this.colDef.isAttemptAverage() );
  },

  isActivity : function()
  {
    return this.colDef.src && !this.colDef.getScoreProvider().attemptBased;
  },

  hasGradableAttempts : function()
  {
    return (!this.isActivity() && (this.colDef.src || this.colDef.extAttemptHandler) &&
        (this.hasAttempts() || this.data.ax /* has exempted attempt */));
  },

  isExcluded : function()
  {
    return this.data.excluded || (this.colDef.limitedAttendance && !this.isPersisted());
  },

  isPersisted : function()
  {
    return ("v" in this.data);
  },

  setRowChecked : function(c)
  {
    this.metaData.isRowChecked = c;
    this.colDef.model.fireModelChanged(); // updates the counter on the grid
  },

  isAvailable : function()
  {
    return this.metaData.isAvailable;
  },

  isGrade : function()
  {
    return (this.colDef.isGrade());
  },

  isOverride : function()
  {
    return (this.data.or && this.data.or == "y" && !this.colDef.isCalculated());
  },

  /*
   * Did the override occurred before the attempt creation? If so
   * we will show the needs grading icon.
   */
  isOverrideBeforeNeedsGrading: function()
  {
    return ( this.data.orBefAtt && this.data.orBefAtt == "y" );
  },

  needsGrading : function()
  {
    return (this.data.ng && this.data.ng && this.data.ng == "y");
  },

  attemptInProgress : function()
  {
    return (this.data.ip && this.data.ip && this.data.ip == "y");
  },

  isGraded : function()
  {
    var tv = this.getTextValue();
    return (tv != '-' && tv.length > 0);
  },

  isComplete : function()
  {
    if (this.colDef.primarySchema instanceof Gradebook.CompleteIncompleteSchema)
    {
      return this.isGraded();
    }
    else
    {
      return false;
    }
  },

  isExempt : function()
  {
    return (this.data.x && this.data.x == "y");
  },

  hasMultipleAttempts : function()
  {
    return (this.data.numAtt && this.data.numAtt == "M");
  },

  hasOneAttempt : function()
  {
    return (!this.data.numAtt || this.data.numAtt == "1");
  },

  hasAttempts : function()
  {
    return this.hasOneAttempt() || this.hasMultipleAttempts();
  },

  validate : function(newValue, matchPartial)
  {
    return this.colDef.validate(newValue, matchPartial);
  },

  getColumnDefinition: function( )
  {
    return this.colDef;
  },

  update : function(newValue)
  {
    this.colDef.updateGrade(newValue, this.getUserId());
  },

  clearAll : function(isDelete)
  {
    this.colDef.model.clearAll(isDelete, this.getUserId(), this.colDef.id);
  },

  clearSelected : function(attemptIds, isDelete)
  {
    this.colDef.model.clearSelected(attemptIds, isDelete, this.getUserId(), this.colDef.id);
  },

  // called by CellController.renderHTML to get value for spreadsheet
  getCellValue : function()
  {
    return this.colDef.getCellValue(this);
  },

  // called by GridCell.getAltValue to get alt (mouse over) value for rendering
  // in spreadsheet
  getAltValue : function()
  {
    if (this.isGrade() && !this.isGraded())
    {
      return GradebookUtil.getMessage('noGradeMsg');
    }
    return this.colDef.getAltValue(this);
  },

  // called by CellController.startEdit to get input value for editing
  getEditValue : function()
  {
    if ( !this.isGraded() )
    {
      return "";
    }
    return this.colDef.getEditValue(this);
  },

  getSortValue : function()
  {
    return this.colDef.getSortValue(this);
  },

  getNormalizedValue: function()
  {
    if ( this.data.v !== undefined && this.data.v !== null  && this.getPointsPossible() )
    {
      return this.data.v / this.getPointsPossible();
    }
    return NaN;
  },

  getPointsPossible : function()
  {
    if (this.data.mp)
    {
      return this.data.mp;
    }
    else if (this.colDef.points)
    {
      return this.colDef.points;
    }
    else
    {
      return 0;
    }
  },

  getTextValue : function()
  {
    if (this.data.tv)
    {
      return this.data.tv;
    }
    else
    {
      return '-';
    }
  },

  getValue : function()
  {
    // do not use if ( this.data.v ) since it will prevent 0 to display properly
    if ( this.data.v !== undefined && this.data.v !== null )
    {
      return this.data.v;
    }
    else
    {
      return '-';
    }
  },

  getNormalizedGrade: function()
  {
    if (this.data.v !== undefined && this.data.v !== null)
    {
      var pointsPossible = this.getPointsPossible();
      if ( pointsPossible > 0 )
      {
        return this.data.v / pointsPossible;
      }
    }
    return null;
  },

  canEdit : function()
  {
    return (this.isGrade() && !this.isExcluded() && !this.colDef.isCalculated() && !this.colDef.isHideAttemptScore());
  },

  loadAttemptsInfo : function(callbackFunction)
  {
    var currentCell = this;
    this.colDef.model.gradebookService.loadAttemptsInfo(this.getUserId(), this.colDef.id, function(attempts)
    {
      currentCell.loadAttemptsInfoCallback.call(currentCell, attempts, callbackFunction);
    });
  },

  loadAttemptsInfoCallback : function(attempts, callbackFunction)
  {
    this.data.attemptsInfo =
      [];
    for ( var i = 0; i < attempts.length; ++i)
    {
      this.data.attemptsInfo.push(new Gradebook.AttemptInfo(this, attempts[i]));
    }
    callbackFunction(this);
  },

  getMenuDynItems : function()
  {
    var dynItems = [];
    var gradeCell = this;
    for ( var i = 0; i < this.data.attemptsInfo.length; ++i)
    {
      var attemptId = gradeCell.data.attemptsInfo[i].id;
      var groupAttemptId = gradeCell.data.attemptsInfo[i].groupAttemptId;
      // note that we cannot create a function as a direct closure here
      // since it would rely on this function scope which actually changes
      // as we iterate i.e. all functions will point to the same scope which
      // ends
      // up being the scope as at the last iteration.
      // To 'freeze' the scope we create a new local scope calling another
      // function using current parameters.
      //Don't display the 'not_attempted' attempts
      var attemptInfo = this.data.attemptsInfo[ i ];
      if ( attemptInfo.status != "na" )
      {
        dynItems.push(
        {
          id : "attemptDynItem",
          title : "",
          name : attemptInfo.getText(),
          onclick : this.getGotoAttemptFunction( attemptId, groupAttemptId )
        } );

        dynItems[i].title = this.removeMarkup(dynItems[i].name);
      }
    }

    return dynItems;
  },

  removeMarkup : function (text)
  {
    while ( text.indexOf( "<" ) > -1 )
    {
      text = text.substr( 0, text.indexOf( '<' ) ) + text.substr( text.indexOf( '>') + 1 );
    }

    return text;
  },

  getGotoAttemptFunction : function(attemptId, groupAttemptId)
  {
    var gradeCell = this;
    var currentAttemptId = attemptId;
    var currentGroupAttemptId = groupAttemptId;
    return function()
    {
      gradeCell.gotoAttempt.call(gradeCell, attemptId, groupAttemptId);
    };
  },

  gotoAttempt : function(attemptId, groupAttemptId)
  {
    if (this.colDef.groupActivity && !groupAttemptId)
    {
      this.showGradeDetails();
      return;
    }

    this.colDef.gradeAttempt( this.getUserId(), attemptId, false, groupAttemptId );
  },

  gotoActivity : function()
  {
    this.gotoAttempt();
  },

  hasContextMenuInfo : function(cellController)
  {
    if (this.isGrade())
    {
      return !this.isExcluded() && !this.colDef.isCalculated();
    }
    else
    {
      return true;
    }
  },

  hideUser : function()
  {
    this.colDef.model.updateUserVisibility( this.getUserId(), false );
  }

};

Gradebook.AttemptInfo = Class.create();

Object.extend(Gradebook.AttemptInfo.prototype,
{

  initialize : function(gradeCel, attemptData)
  {
    this.gradeCel = gradeCel;
    this.id = attemptData.id;
    this.date = attemptData.date;
    this.score = attemptData.score;
    this.status = attemptData.status;
    this.exempt = attemptData.exempt;
    if (attemptData.groupAttemptId)
    {
      this.groupAttemptId = attemptData.groupAttemptId;
      this.groupName = attemptData.groupName;
      this.override = attemptData.override;
      this.groupScore = attemptData.groupScore;
      this.groupStatus = attemptData.groupStatus;
    }
  },

  getScoreDisplayValue : function()
  {
    if (this.status)
    {
      if (this.status == "ip")
      {
        return this.gradeCel.colDef.model.gridImages.attemptInProgress;
      }
      return this.gradeCel.colDef.model.gridImages.needsGrading;
    }
    var primaryValue = this.gradeCel.colDef.getDisplayValue(this.score);
    var secondaryValue = this.gradeCel.colDef.getSecondaryDisplayValue(this.score);
    if (secondaryValue)
    {
      primaryValue += " (" + secondaryValue + ")";
    }
    return primaryValue;
  },

  getGroupScoreDisplayValue : function()
  {
    if (this.groupStatus)
    {
      if (this.groupStatus == "ip")
      {
        return this.gradeCel.colDef.model.gridImages.attemptInProgress;
      }
      return this.gradeCel.colDef.model.gridImages.needsGrading;
    }
    var primaryValue = this.gradeCel.colDef.getDisplayValue(this.groupScore);
    var secondaryValue = this.gradeCel.colDef.getSecondaryDisplayValue(this.groupScore);
    if (secondaryValue)
    {
      primaryValue += " (" + secondaryValue + ")";
    }
    return primaryValue;
  },

  getText : function()
  {
    var exemptIcon = "";
    if (this.exempt)
    {
      var altText = this.gradeCel.colDef.model.getMessage('exemptAttemptMsg');
      exemptIcon = "<img src='/images/ci/gradebook/exempt.gif' alt='" + altText + "' title='" + altText + "'>";
    }
    if (!this.groupAttemptId)
    {
      if (!Gradebook.GridCell.attemptTemplate)
      {
        Gradebook.GridCell.attemptTemplate = new Template(this.gradeCel.colDef.model.getMessage('attemptInfoMsg'));
      }
      return Gradebook.GridCell.attemptTemplate.evaluate(
      {
        date : this.date,
        score : this.getScoreDisplayValue(),
        exempt : exemptIcon
      });
    }
    if (!this.override)
    {
      if (!Gradebook.GridCell.groupAttemptTemplate)
      {
        Gradebook.GridCell.groupAttemptTemplate = new Template(this.gradeCel.colDef.model.getMessage('groupAttemptInfoMsg'));
      }
      return Gradebook.GridCell.groupAttemptTemplate.evaluate(
      {
        date : this.date,
        score : this.getScoreDisplayValue(),
        groupName : this.groupName,
        exempt : exemptIcon
      });
    }
    if (!Gradebook.GridCell.groupAttemptOverrideTemplate)
    {
      Gradebook.GridCell.groupAttemptOverrideTemplate = new Template(this.gradeCel.colDef.model.getMessage('groupAttemptInfoWithOverrideMsg'));
    }
    return Gradebook.GridCell.groupAttemptOverrideTemplate.evaluate(
    {
      date : this.date,
      score : this.getScoreDisplayValue(),
      groupName : this.groupName,
      groupScore : this.getGroupScoreDisplayValue(),
      exempt : exemptIcon
    });
  }

});
/**
 * Gradebook data grid
 *
 * PORTIONS OF THIS FILE ARE BASED ON RICO LIVEGRID 1.1.2
 *
 * Copyright 2005 Sabre Airline Solutions
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * @author "Bill Richard"
 * @version
 *
 *
 */

Gradebook.NumericSchema = Class.create();
Gradebook.NumericSchema.prototype =
{
  initialize : function(jsonObj, model)
  {
    this.model = model;
    Object.extend(this, jsonObj); // assign json properties to this object
  },

  getGradeDistribution : function(grades, points, stats)
  {
    return Gradebook.PercentageSchema.prototype.getGradeDistribution(grades, points, stats);
  },

  // called by ColDef.getCellValue to get value for spreadsheet
  getCellValue : function(gridCell)
  {
    // for grades, we show a precision up to 5, otherwise show the historic 2 digits precision
    var maxPrecision = ( gridCell.colDef.isCalculated()?2:5 );
    return this.getDisplayValue( gridCell.getValue(), gridCell.getPointsPossible(), maxPrecision );
  },
  // called by ColDef.getCellValue to get alt value for spreadsheet
  getAltValue : function(gridCell)
  {
    return this.getCellValue( gridCell );
  },

  // this is the value that appears in the input box when editing
  getEditValue : function(gridCell)
  {
    return this.getCellValue(gridCell);
  },

  getSortValue : function(gridCell)
  {
    return gridCell.getValue();
  },

  // called by: this.getCellValue to get value for spreadsheet or
  // by colDef.getDisplayValue when external pages need to convert a rawValue
  getDisplayValue : function(rawValue, points, maxPrecision )
  {
    if (rawValue == '-' || rawValue.length === 0)
    {
      return rawValue;
    }
    if ( 2 == maxPrecision )
    {
      return NumberFormatter.getDisplayFloat( parseFloat(rawValue).toFixed(2) );
    }
    else
    {
      if ( !maxPrecision )
      {
        maxPrecision = 5;
      }
      return NumberFormatter.toStringMin2Digits( parseFloat( rawValue ), maxPrecision );
    }
  },

  getRawValue : function(displayValue, colDef)
  {
    return NumberFormatter.getDotFloat(displayValue);
  },

  validate : function(newValue, matchPartial)
  {
    if (!newValue || newValue == "0" || newValue == "-")
    {
      return null;
    }
    if (!GradebookUtil.isValidFloat( newValue ))
    {
      return GradebookUtil.getMessage('invalidNumberErrorMsg');
    }
    if ( GradebookUtil.isGradeValueTooBig( newValue ) )
    {
      return GradebookUtil.getMessage('gradeValueTooBigErrorMsg');
    }
    var val = '' +newValue;
    var decimal = (typeof LOCALE_SETTINGS === 'undefined' || LOCALE_SETTINGS.getString('number_format.decimal_point') === null ) ? '.' : LOCALE_SETTINGS.getString('number_format.decimal_point');
    var idx = val.indexOf( decimal );
    if (idx > -1 && (val.length - idx - 1) > 5)
    {
      return GradebookUtil.getMessage('tooManyDecimalPlacesErrorMsg');
    }
    else
    {
      return null;
    }
  }
};

Gradebook.TextSchema = Class.create();
Gradebook.TextSchema.prototype =
{
  initialize : function(jsonObj, model)
  {
    this.model = model;
    Object.extend(this, jsonObj); // assign json properties to this object
},

getGradeDistribution : function(grades, points, stats)
{
  return null;
},

// this is the value that appears in the input box when editing
  getEditValue : function(gridCell)
  {
    return this.getCellValue(gridCell);
  },

  // called by ColDef.getCellValue to get value for spreadsheet
  getCellValue : function(gridCell)
  {
    return this.getDisplayValue(gridCell.getTextValue(), gridCell.getPointsPossible());
  },
  getAltValue : function(gridCell)
  {
    return this.getCellValue( gridCell );
  },

  getSortValue : function(gridCell)
  {
    return gridCell.getTextValue().toUpperCase();
  },

  // called by: this.getCellValue to get value for spreadsheet or
  // by colDef.getDisplayValue when external pages need to convert a rawValue
  getDisplayValue : function(rawValue, points)
  {
    return rawValue;
  },

  getRawValue : function(displayValue, colDef)
  {
    return displayValue;
  },

  validate : function( newValue, matchPartial )
  {
    //Prevent submission of text that is longer than 32 characters to prevent a database error
    if (newValue.length > 32)
    {
      return GradebookUtil.getMessage('textValueTooLongErrorMsg');
    }

    return null;
  }

};

Gradebook.PercentageSchema = Class.create();
Gradebook.PercentageSchema.prototype =
{
  initialize : function(jsonObj, model)
  {
    this.model = model;
    Object.extend(this, jsonObj); // assign json properties to this object
  },

  // called by ColDef.getStats
  getGradeDistribution : function(grades, points, stats)
  {
    var i, len;
    var dist = [];
    var range = [];
    range.count = 0;
    range.text = GradebookUtil.getMessage('lessThanZeroMsg');
    dist.push(range);
    for (i = 0; i < 10; i++)
    {
      range = [];
      range.count = 0;
      range.low = (i * 10);
      range.high = (i * 10) + ((i < 9) ? 9 : 10);
      var args = {0:range.low, 1:range.high};
      range.text = GradebookUtil.getMessage('rangeIndicatorMsg', args);
      dist.push(range);
    }
    range = [];
    range.count = 0;
    range.text = GradebookUtil.getMessage('greaterThanHundredMsg');
    dist.push(range);
    for (i = 0, len = grades.length; i < len; i++)
    {
      var percent = (points) ? (parseFloat(grades[i]) / parseFloat(points) * 100.0) : parseFloat(grades[i]);
      if (percent == 100)
      {
        percent -= 0.1; // 100 should fall into 90-100 bin
      }
      var index = parseInt(percent / 10.0, 10) + 1;
      if (percent < 0)
      {
        index = 0;
      }
      if (percent > 100)
      {
        index = 11;
      }
      dist[index].count++;
    }
    dist.reverse();
    return dist;
  },

  // called by ColDef.getCellValue to get value for spreadsheet
  getCellValue : function(gridCell)
  {
    return this.getDisplayValue(gridCell.getValue(), gridCell.getPointsPossible());
  },
  // called by ColDef.getCellValue to get value for spreadsheet
  getAltValue : function(gridCell)
  {
    return this.getCellValue( gridCell );
  },


  // this is the value that appears in the input box when editing
  getEditValue : function(gridCell)
  {
    return this.getCellValue(gridCell);
  },

  getSortValue : function(gridCell)
  {
    return gridCell.getNormalizedValue();
  },

  // called by: this.getCellValue to get value for spreadsheet or
  // by colDef.getDisplayValue when external pages need to convert a rawValue
  getDisplayValue : function(rawValue, points)
  {
    if (parseFloat(points) === 0.0 || rawValue == '-' || rawValue.length === 0)
    {
      return rawValue;
    }
    var percent = parseFloat(rawValue) / parseFloat(points) * 100.0;
    return NumberFormatter.getDisplayFloat(parseFloat(percent).toFixed(2)) + '%';
  },

  getRawValue : function(displayValue, colDef)
  {
    var points = (colDef.points) ? colDef.points : 100;
    displayValue = displayValue.replace('%', '');
    displayValue = NumberFormatter.getDotFloat(displayValue);
    return ( parseFloat(displayValue) * parseFloat(points) ) / 100.0;
  },

  validate : function(newValue, matchPartial)
  {
    newValue = newValue.replace('%', '');
    if (!newValue || newValue == "0" || newValue == "-")
    {
      return null;
    }
    if (!GradebookUtil.isValidFloat( newValue ))
    {
      return GradebookUtil.getMessage('invalidNumberErrorMsg');
    }
    if ( GradebookUtil.isGradeValueTooBig( newValue ) )
    {
      return GradebookUtil.getMessage('gradeValueTooBigErrorMsg');
    }
    var val = '' +newValue;
    var decimal = (typeof LOCALE_SETTINGS === 'undefined' || LOCALE_SETTINGS.getString('number_format.decimal_point') === null ) ? '.' : LOCALE_SETTINGS.getString('number_format.decimal_point');
    var idx = val.indexOf( decimal );
    if (idx > -1 && (val.length - idx - 1) > 4)
    {
      return GradebookUtil.getMessage('tooManyDecimalPlacesErrorMsg');
    }
    else
    {
      return null;
    }
  }

};

Gradebook.CompleteIncompleteSchema = Class.create();
Gradebook.CompleteIncompleteSchema.prototype =
{
  initialize : function(jsonObj, model)
  {
    this.model = model;
    Object.extend(this, jsonObj); // assign json properties to this object
},

// called by ColDef.getStats
  getGradeDistribution : function(grades, points, stats)
  {
    var dist =
      [];
    var range =
      [];
    range.count = stats.qtyNull;
    range.text = GradebookUtil.getMessage('incompleteMsg');
    dist.push(range);
    range =
      [];
    range.count = grades.length;
    range.text = GradebookUtil.getMessage('completeMsg');
    dist.push(range);
    dist.reverse();
    return dist;
  },

  // called by ColDef.getCellValue to get value for spreadsheet
  getCellValue : function(gridCell)
  {
    return this.getDisplayValue(gridCell.getTextValue(), gridCell.getPointsPossible());
  },
  
  getAltValue : function(gridCell)
  {
    var rawValue = this.getCellValue(gridCell) + ""; //convert to string since we're checking the length
    if (rawValue != '-' && rawValue.length > 0)
    {
      return GradebookUtil.getMessage('completedMsg');
    }
    else
    {
      return '-';
    } 
  },

  // this is the value that appears in the input box when editing
  getEditValue : function(gridCell)
  {
    return gridCell.getValue();
  },

  getSortValue : function(gridCell)
  {
    var tv = gridCell.getTextValue().toUpperCase();
    if (tv == '-')
    {
      return '-';
    }
    else
    {
      return gridCell.getValue();
    }
  },

  // called by: this.getCellValue to get value for spreadsheet or
  // by colDef.getDisplayValue when external pages need to convert a rawValue
  getDisplayValue : function(rawValue, points)
  {
	rawValue += ""; //convert to String since we're checking the length
    if (rawValue != '-' && rawValue.length > 0)
    {
      return '<img border="0" width="16" height="16" src="/images/ci/icons/checkmark_ia.gif" alt="' + GradebookUtil.getMessage('completedMsg') + '">';
    }
    else
    {
      return '-';
    }
  },

  getRawValue : function(displayValue, colDef)
  {
    return displayValue;
  },

  validate : function(newValue, matchPartial)
  {
    if (!newValue || newValue == "0" || newValue == "-")
    {
      return null;
    }
    // todo: determine what is allowed. I.E. is "-" allowed?
    // allow empty string or number
    // return (newValue.length == 0 || parseFloat(newValue));
    if (!GradebookUtil.isValidFloat(newValue))
    {
      return GradebookUtil.getMessage('invalidNumberErrorMsg');
    }
    else
    {
      return null;
    }
  }
};

Gradebook.LetterSchema = Class.create();
Gradebook.LetterSchema.prototype =
{
  initialize : function(jsonObj, model)
  {
    this.model = model;
    Object.extend(this, jsonObj); // assign json properties to this object
},

// called by ColDef.getStats
  getGradeDistribution : function(grades, points, stats)
  {
    var dist = [];
    var symMap = [];
    this.symbols.each(function(s)
    {
      var range =
        [];
      range.count = 0;
      range.text = s.sym;
      symMap[s.sym] = dist.length;
      dist.push(range);
    });
    for ( var i = 0, len = grades.length; i < len; i++)
    {
      var val = this.getDisplayValue(grades[i], points);
      var index = symMap[val];
      if ( index >= 0 )
      {
        dist[index].count++;
      }
    }
    return dist;
  },

  // called by ColDef.getCellValue to get value for spreadsheet
  getCellValue : function(gridCell)
  {
    // Pass in the raw value, not the text value so we can convert it to the current grading schema text properly
    // (I.e. if you have a grading schema A/B/C and enter A then getTextValue will give you 'A' but then if you
    // change the grading schema to be FOO/FUM you will still see 'A' here if we use textValue whereas using the value
    // will use whatever A mapped to as a value and convert it to FOO/FUM as appropriate)
    return this.getDisplayValue(gridCell.getValue(), gridCell.getPointsPossible());
  },
  getAltValue : function(gridCell)
  {
    return this.getCellValue( gridCell );
  },

  // this is the value that appears in the input box when editing
  getEditValue : function(gridCell)
  {
    return this.getCellValue(gridCell);
  },

  getSortValue : function(gridCell)
  {
    return gridCell.getNormalizedValue();
  },

  // called by: this.getCellValue to get value for spreadsheet or
  // by colDef.getDisplayValue when external pages need to convert a rawValue
  getDisplayValue : function(rawValue, points)
  {

    if (parseFloat(points) === 0.0 || rawValue == '-' || rawValue.length === 0)
    {
      return rawValue;
    }
    if ( isNaN( rawValue ) )
    {
      // see if raw value is one of the symbols
      var matchingSymbol;
      rawValue = rawValue.toUpperCase();
      this.symbols.each(function(s)
      {
        if (rawValue == s.sym.toUpperCase())
        {
          matchingSymbol = s.sym;
          throw $break; // needed to get out of each loop
        }
      });
      if (matchingSymbol)
      {
        return matchingSymbol;
      }
      return rawValue;
    }
    var retVal = rawValue;
    var percent = parseFloat(rawValue) / parseFloat(points) * 100.0;
    this.symbols.each(function(s)
    {
      if (percent >= s.lb && percent <= s.ub)
      {
        retVal = s.sym;
        throw $break; // needed to get out of each loop
      }
    });
    return retVal;
  },

  getRawValue : function(displayValue, colDef)
  {

    // What it SHOULD be doing is:
    // Column created with Letter as primary display and secondary display of % -
    // worth 10 points
    // Enter A - go to schema and determine that A = 95% use 95% to determine
    // score of 9.5 - store 9.5 and display A
    // Enter 9 - determine the 9 is 90% (item is out of 10) 90% is an A - store 9
    // and display A

    var points = (colDef.points) ? colDef.points : 100;
    displayValue = '' + displayValue;
    displayValue = displayValue.replace('%', '');
    var score = displayValue.toUpperCase();
    this.symbols.each(function(s)
    {
      if (score == s.sym.toUpperCase())
      {
        score = (parseFloat(s.abs) / 100.0) * points;
        throw $break; // needed to get out of each loop
      }
    });
    return score;
  },

  validate : function(newValue, matchPartial)
  {
    if (!newValue || newValue == "0" || newValue == "-")
    {
      return null;
    }
    // allow numeric value for letter schemas too
    if (GradebookUtil.isValidFloat(newValue))
    {
      return null;
    }
    var retVal = GradebookUtil.getMessage('invalidLetterErrorMsg');
    newValue = newValue.toUpperCase();
    this.symbols.each(function(s)
    {
      if (newValue == s.sym.toUpperCase() || (matchPartial && s.sym.toUpperCase().startsWith(newValue)))
      {
        retVal = null;
        throw $break; // needed to get out of each loop
      }
    });
    return retVal;
  }
};
/**
 * Gradebook data grid
 *
 * PORTIONS OF THIS FILE ARE BASED ON RICO LIVEGRID 1.1.2
 *
 * Copyright 2005 Sabre Airline Solutions
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 *
 * @author "Bill Richard"
 * @version
 *
 *
 */

// Gradebook.GridModel -----------------------------------------------------
Gradebook.CustomView = Class.create();
Gradebook.CustomView.prototype =
{
  initialize : function(jsonObj, model)
  {
    this.model = model;
    Object.extend(this, jsonObj); // assign json properties to this object
  },

  // evaluate this custom view; determine userIds & itemIds for view
  // returns false if the formula cannot be evaluated, else true
  evaluate : function()
  {
    try
    {
      if (this.definition)
      {
        var ext = eval('({' + this.definition + '})');
        Object.extend(this, ext);
        this.definition = null;
      }
      this.userIds =
        [];
      this.colIds =
        [];
      this.aliasMap =
        [];
      for ( var i = 0, len = this.aliases.length; i < len; i++)
      {
        this.aliasMap[this.aliases[i].key] = this.aliases[i].val;
      }
      if (this.formula)
      {
        this._evaluateAdvanced();
        this._computeDisplayItems();
      }
      else if (this.searchType == 'status')
      {
        this._evaluateStatus();
      }
      else
      {
        this._evaluateBasic();
        this._computeDisplayItems();
      }
      return true;
    }
    catch (e)
    {
      var errorMsg = GradebookUtil.getMessage( 'custViewRenderErrorMsg', { name: this.name } );
      alert( errorMsg );
      return false;
    }
  },

  usesGroups : function()
  {
    for ( var i = 0, len = this.aliases.length; i < len; i++)
    {
      if (this.aliases[i].key.startsWith('gr'))
      {
        return true;
      }
    }
    return false;
  },

  getUserIds : function()
  {
    return this.userIds;
  },

  getDisplayItemIds : function()
  {
    return this.colIds;
  },

  _computeDisplayItems : function()
  {
    // map aliased ids to real ids
    if (this.display.ids)
    {
      this.display.unAliasedIds =
        [];
      for ( var i = 0, len = this.display.ids.length; i < len; i++)
      {
        var id = this.aliasMap[this.display.ids[i]];
        if (!id)
        {
          throw 'missing alias';
        }
        this.display.unAliasedIds.push(id);
      }
    }
    var colDefs = this.model.getColDefs(false, this.display.showhidden);
    var dispType = this.display.items.toUpperCase();
    if (dispType == "BYITEM")
    {
      this.colIds = this._getItemsById();
    }
    else if (dispType == "INCRI")
    { // in criteria
      this.colIds = this._getItemsInCriteria();
    }
    else if (dispType == "BYCAT")
    { // by category
      this.colIds = this._getItemsByCategoryId(colDefs);
    }
    else if (dispType == "BYGP")
    { // by grading period
      this.colIds = this._getItemsByGradingPeriodId(colDefs);
    }
    else if (dispType == "ALLITEM")
    {
      this.colIds = this._getAllItems(colDefs);
    }
    else if (dispType == "IVS")
    {
      this.colIds = this._getItemsByVisibilityToStudents(colDefs, true);
    }
    else if (dispType == "INVS")
    {
      this.colIds = this._getItemsByVisibilityToStudents(colDefs, false);
    }
    else if (dispType == "NOITEM")
    {
      this.colIds =
        [];
    }
  },

  _getItemsById : function()
  {
    return this.display.unAliasedIds;
  },

  _getItemsInCriteria : function()
  {
    var itemIds =
      [];
    // get items that are used in criteria; which are in aliases
    for ( var i = 0, len = this.aliases.length; i < len; i++)
    {
      if (this.aliases[i].key.startsWith('I_'))
      {
        itemIds.push(this.aliases[i].val);
      }
    }
    return itemIds;
  },

  _getItemsByCategoryId : function(colDefs)
  {
    var itemIds =
      [];
    // get items that have category id in display.ids
    for ( var i = 0, len = colDefs.length; i < len; i++)
    {
      if (this.display.unAliasedIds.indexOf(colDefs[i].catid) != -1)
      {
        itemIds.push(colDefs[i].id);
      }
    }
    return itemIds;
  },

  _getItemsByGradingPeriodId : function(colDefs)
  {
    var itemIds =
      [];
    // get items that have grading period id in display.ids
    for ( var i = 0, len = colDefs.length; i < len; i++)
    {
      if (this.display.unAliasedIds.indexOf(colDefs[i].gpid) != -1)
      {
        itemIds.push(colDefs[i].id);
      }
    }
    return itemIds;
  },

  _getItemsByVisibilityToStudents : function(colDefs, vis)
  {
    var itemIds =
      [];
    // get items that have grading period id in display.ids
    for ( var i = 0, len = colDefs.length; i < len; i++)
    {
      if (colDefs[i].vis == vis)
      {
        itemIds.push(colDefs[i].id);
      }
    }
    return itemIds;
  },

  _getAllItems : function(colDefs)
  {
    var itemIds =
      [];
    for ( var i = 0, len = colDefs.length; i < len; i++)
    {
      itemIds.push(colDefs[i].id);
    }
    return itemIds;
  },

  _evaluateStatus : function()
  {
    var i, len, id;
    if (this.students.userIds && this.students.userIds[0] == "all")
    {
      var showstuhidden = this.students.showstuhidden;
      var modelStudents = this.model.getStudents(showstuhidden);
      for (i = 0, len = modelStudents.length; i < len; i++)
      {
        this.userIds.push(modelStudents[i].id);
      }
    }
    else if (this.students.userIds)
    {
      var uids = this.students.userIds;
      for (i = 0, len = uids.length; i < len; i++)
      {
        id = this.aliasMap[uids[i]];
        if (!id)
        {
          throw 'missing alias';
        }
        this.userIds.push(id);
      }
    }
    else if (this.students.groupIds)
    {
      var groupIds =
        [];
      for (i = 0, len = this.students.groupIds.length; i < len; i++)
      {
        id = this.aliasMap[this.students.groupIds[i]];
        if (!id)
        {
          throw 'missing alias';
        }
        groupIds.push(id);
      }
      var getUserIdsByGroupIdsFunc = this.model._getUserIdsByGroupIds.bind(this.model);
      this.userIds = getUserIdsByGroupIdsFunc(groupIds);
    }
    else
    {
      throw 'no userIds or groupIds in smart view';
    }
    var colDefs = this.model.getColDefs(false, this.display.showhidden);
    this.colIds =
      [];
    var catid;
    if (this.model.categoryFilter)
    {
      var cf = this.model.categoryFilter;
      catid = cf.startsWith('c_') ? cf.substr(2, cf.length - 2) : cf;
    }
    else if (this.category == 'c_all')
    {
      catid = 'all';
    }
    else
    {
      catid = this.aliasMap[this.category];
    }
    for (i = 0, len = colDefs.length; i < len; i++)
    {
      if (colDefs[i].catid == catid || catid == "all" && colDefs[i].isGrade())
      {
        this.colIds.push(colDefs[i].id);
      }
    }

    var filterType;
    if (this.model.statusFilter)
    {
      var sf = this.model.statusFilter;
      filterType = sf.startsWith('stat_') ? sf.substr(5, sf.length - 5) : sf;
    }
    else
    {
      filterType = this.display.items;
    }
    if (filterType == "ALL")
    {
      return; // no filtering needed
    }
    if (this.colIds.length === 0)
    {
      this.userIds =
        [];
      return;
    }

    var rowFlags =
      [];
    var colFlags =
      [];
    var temp_userIds =
      [];
    var temp_colIds =
      [];
    var r, c, rlen, clen;

    for (r = 0, len = this.userIds.length; r < len; r++)
    {
      rowFlags.push(false);
    }
    for (c = 0, len = this.colIds.length; c < len; c++)
    {
      colFlags.push(false);
    }

    // evaluate filter to determine which user/col to include.
    for (r = 0, rlen = this.userIds.length; r < rlen; r++)
    {

      var row = this.model.getRowByUserId(this.userIds[r]);
      for (c = 0, clen = this.colIds.length; c < clen; c++)
      {

        var colIndex = this.model.colDefMap[this.colIds[c]];
        var colDef = this.model.colDefs[colIndex];
        var grade = this._getGrade(row, colDef);

        if (grade.passesFilter(filterType))
        {
          if (!rowFlags[r])
          {
            rowFlags[r] = true;
            temp_userIds.push(this.userIds[r]);
          }
          if (!colFlags[c])
          {
            colFlags[c] = true;
            temp_colIds.push(this.colIds[c]);
          }
        }
      }
    }
    this.userIds = temp_userIds;
    this.colIds = temp_colIds;
  },

  _getGrade : function(row, colDef)
  {
    var colIndex = this.model.colDefMap[colDef.id];
    var data = row[colIndex];
    if (!data.metaData)
    {
      data.metaData = row[0];
    }
    if (!data.colDef)
    {
      data.colDef = colDef;
    }
    if (!this.gridCell)
    {
      this.gridCell = new Gradebook.GridCell();
    }
    this.gridCell.setData(data);
    return this.gridCell;
  },

  _evaluateBasic : function()
  {
    var i, len;
    if (this.students.userIds && this.students.userIds[0] != "all")
    {
      var uids = this.students.userIds;
      for (i = 0, len = uids.length; i < len; i++)
      {
        var id = this.aliasMap[uids[i]];
        if (!id)
        {
          throw 'missing alias';
        }
        this.userIds.push(id);
      }
    }
    else
    { // all students
      var showstuhidden = this.students.showstuhidden;
      var modelStudents = this.model.getStudents(showstuhidden);
      for (i = 0, len = modelStudents.length; i < len; i++)
      {
        this.userIds.push(modelStudents[i].id);
      }
    }
  },

  _evaluateAdvanced : function()
  {
    var i, len;
    // lazily compute postfix formula & criteriaMap
    if (!this.postFixFormula)
    {
      this.postFixFormula = this.infix2postfix(this.formula);
    }
    if (!this.criteriaMap)
    {
      this.criteriaMap =
        [];
      for (i = 0, len = this.criteria.length; i < len; i++)
      {
        this.criteriaMap[this.criteria[i].fid] = i;
      }
    }
    // test each row and add to userIds if it passes formula
    var rows = this.model.rows;
    for (i = 0, len = rows.length; i < len; i++)
    {
      if (this._evaluateFormulaForRow(rows[i]))
      {
        this.userIds.push(rows[i][0].uid);
      }
    }
  },

  _evaluateFormulaForRow : function(row)
  {
    // only one criteria in formula
    if (this.postFixFormula.length == 1)
    {
      return this._evalCriteria(this.postFixFormula[0], row);
    }
    // evaluate postfix formula:
    // * push non-operators on stack
    // * when operators are encountered:
    // pop two operands off stack
    // evaluate operands (criteria)
    // apply operator to the two evaluated operands
    // store result on stack
    // * pop & return final result
    var stack =
      [];
    for ( var i = 0, len = this.postFixFormula.length; i < len; i++)
    {
      var tok = this.postFixFormula[i];
      switch (tok)
      {
        case "AND":
        case "OR":
          if (stack.length < 2)
          {
            throw (this.model.getMessage('custViewStackEmptyMsg') + tok);
          }
          var op2 = stack.pop();
          var op1 = stack.pop();
          var firstValue = op1;
          if (typeof (op1) == 'string')
          {
            firstValue = this._evalCriteria(op1, row);
          }
          var secondValue = op2;
          if (typeof (op2) == 'string')
          {
            secondValue = this._evalCriteria(op2, row);
          }
          if (tok == "AND")
          {
            stack.push((firstValue && secondValue));
          }
          else if (tok == "OR")
          {
            stack.push((firstValue || secondValue));
          }
          break;
        default:
          stack.push(tok);
          break;
      }
    }
    if (stack.length != 1)
    {
      throw this.model.getMessage('custViewUnableToEvaluateMsg');
    }
    else
    {
      return stack.pop();
    }
  },

  _getAliasOrId : function(id)
  {
    if (id.startsWith('I_') || id.startsWith('c_') || id.startsWith('gp_') || id.startsWith('gr_') || id.startsWith('st_'))
    {
      return this.aliasMap[id];
    }
    else
    {
      return id;
    }
  },

  _evalCriteria : function(fid, row)
  {
    // look up criteria by fid
    var crit = this.criteria[this.criteriaMap[fid]];
    var colId = this._getAliasOrId(crit.cid);
    if (!colId)
    {
      throw 'missing alias';
    }
    var colDefMap = this.model.colDefMap;
    var colIdx = colDefMap[colId];
    if (colId == 'SV' || colId == 'GM')
    {
      colIdx = 0;
    }
    if (colIdx === undefined || colIdx === null)
    {
      throw 'missing alias';
    }
    var colDef = this.model.colDefs[colIdx];
    var gridCell = this._getGrade(row, colDef);
    var evalFunc = this._getEvalCriteriaFunc(crit);
    return evalFunc(crit, gridCell);
  },

  _evalAvailableCriteria : function(crit, gridCell)
  {
    var avail = (gridCell.isAvailable()) ? "A" : "U";
    return crit.value == avail;
  },

  _evalStatusCriteria : function(crit, gridCell)
  {
    return gridCell.passesFilter(crit.value);
  },

  _evalStudentVisibleCriteria : function(crit, gridCell)
  {
    var avail = (gridCell.isHidden()) ? "H" : "V";
    return crit.value == avail;
  },

  _evalGroupMembershipCriteria : function(crit, gridCell)
  {
    // There may be 1 or more values passed. We allow multiple selection of Groups
    var result = (crit.cond == "eq") ? false : true;
    var groupNames = crit.value.split(",");
    for ( var i = 0, len = groupNames.length; i < len; i++)
    {
      var groupId = this.aliasMap[groupNames[i]];
      if (!groupId)
      {
        throw 'missing alias';
      }
      var userId = gridCell.getUserId();
      var inGroup = this._userIsInGroup(userId, groupId);
      result = ((crit.cond == "eq") ? result || inGroup : result && !inGroup);
    }
    return result;
  },

  _evalLastAccessedCriteria : function(crit, gridCell)
  {
    var cellVal = new Date(gridCell.getValue()).getTime();

    if (crit.cond == "eq")
    {
      var numMSecPerDay = 1000 * 60 * 60 * 24;
      var v1 = parseInt(cellVal / numMSecPerDay, 10);
      var v2 = parseInt(crit.value / numMSecPerDay, 10);
      return (v1 == v2);
    }
    else if (crit.cond == "be")
    {
      return (cellVal < crit.value);
    }
    else if (crit.cond == "af")
    {
      return (cellVal > crit.value);
    }
  },

  _defaultEvalCriteria : function(crit, gridCell)
  {
    var cellVal = gridCell.getValue();
    var critVal;
    var isSchemaCIC = gridCell.colDef.primarySchema instanceof Gradebook.CompleteIncompleteSchema;
    //the customView with Complete/Incomplete Schema takes null/empty grades as Incomplete
    // LRN-49079 cells with manually overridden grades are also considered in a graded status
    if ( !isSchemaCIC &&
         ( gridCell.attemptInProgress() || gridCell.needsGrading() ||
         ( gridCell.isGrade() && !gridCell.isGraded() ) || gridCell.isExempt() ) )
    {
      return false;
    }
    var operator = crit.cond;
    // '-' will end up NaN
    if ( crit.value != '-')
    {
      critVal = gridCell.colDef.getRawValue( crit.value );
    }
    else
    {
      critVal = '-';
    }
    if (this._isNumber(cellVal) && this._isNumber(critVal) && crit.ctype != 'st')
    {
      var dblCellVal = this._toNumber(cellVal);
      var dblCritVal = this._toNumber(critVal);
      var dblCritVal2 = crit.value2 ? this._toNumber(gridCell.colDef.getRawValue(crit.value2)) : 0;
      if (operator == "eq")
      {
        return (dblCellVal == dblCritVal);
      }
      else if (operator == "neq")
      {
        return (dblCellVal != dblCritVal);
      }
      else if (operator == "gt")
      {
        return (dblCellVal > dblCritVal);
      }
      else if (operator == "lt")
      {
        return (dblCellVal < dblCritVal);
      }
      else if (operator == "le")
      {
        return (dblCellVal <= dblCritVal);
      }
      else if (operator == "ge")
      {
        return (dblCellVal >= dblCritVal);
      }
      else if (operator == "bet")
      {
        return ((dblCritVal <= dblCellVal) && (dblCellVal <= dblCritVal2));
      }
    }
    else if ( typeof (critVal) == "string" )
    {
      var cellTextValue = gridCell.getTextValue();
      //if data.tv is not empty
      if ( cellTextValue != '-' && cellTextValue !== undefined && cellTextValue !== null &&
          typeof ( cellTextValue ) == "string")
      {
        // replace gridCell.getValue() with gridCell.getTextValue()
        cellVal = cellTextValue.toUpperCase();
      }
      else
      {
        // LRN-46192 gridCell.tv is undefined for username, lastname, firstname and studentid columns, so use gridCell.v instead
        cellVal = cellVal.toUpperCase();
      }
      critVal = critVal.toUpperCase();
      if (operator == "eq")
      {
        if ( isSchemaCIC )
        {
          var gradeNotEmpty = cellTextValue != '-' && cellTextValue.length > 0 ;
          cellVal= gradeNotEmpty ? "C" : "IC";
        }
        return (cellVal == critVal);
      }
      else if (operator == "neq")
      {
        return (cellVal != critVal);
      }
      else if (operator == "bw")
      {
        return (cellVal.startsWith(critVal));
      }
      else if (operator == "con")
      {
        return (cellVal.indexOf(critVal) != -1);
      }
    }
    else
    {
      throw (this.model.getMessage('custViewDataTypeMismatchMsg') + ' ' + crit.fid);
    }
  },

  _getEvalCriteriaFunc : function(crit)
  {
    if (!this.evalCriteriaFuncMap)
    {
      this.evalCriteriaFuncMap =
        [];
      this.evalCriteriaFuncMap.AV = this._evalAvailableCriteria.bind(this);
      this.evalCriteriaFuncMap.SV = this._evalStudentVisibleCriteria.bind(this);
      this.evalCriteriaFuncMap.LA = this._evalLastAccessedCriteria.bind(this);
      this.evalCriteriaFuncMap.GM = this._evalGroupMembershipCriteria.bind(this);
    }
    var func = this.evalCriteriaFuncMap[crit.cid];
    if (!func)
    {
      if (crit.cond == 'se' )
      {
        func = this._evalStatusCriteria.bind(this);
      }
      else
      {
        func = this._defaultEvalCriteria.bind(this);
      }
    }
    return func;
  },

  _userIsInGroup : function(userId, groupId)
  {
    //userId = Number(userId);
    var groups = this.model.groups;
    for ( var i = 0, len = groups.length; i < len; i++)
    {
      if (groups[i].id == groupId)
      {
        return (groups[i].uids.indexOf(userId) != -1);
      }
    }
    return false;
  },

  getValidationError : function(f, criteriaLst)
  {
    try
    {
      var postFix = this.infix2postfix(f, criteriaLst);
      return null;
    }
    catch (e)
    {
      return e;
    }
  },

  infix2postfix : function(formula, criteriaLst)
  {
    var f = formula;
    f = f.gsub(/\(/, ' ( '); // add spaces around parens
    f = f.gsub(/\)/, ' ) '); // add spaces around parens
    var a = $w(f); // split into array
    var stack =
      [];
    var out =
      [];
    var tok;
    for ( var i = 0, len = a.length; i < len; i++)
    {
      tok = a[i].toUpperCase();
      switch (tok)
      {
        case "AND":
        case "OR":
          while (this._isOperator(stack[stack.length - 1]))
          {
            out.push(stack.pop());
          }
          stack.push(tok.toUpperCase());
          break;
        case "(":
          stack.push(tok);
          break;
        case ")":
          var foundStart = false;
          while (stack.length > 0)
          {
            tok = stack.pop();
            if (tok == "(")
            {
              foundStart = true;
              break;
            }
            else
            {
              out.push(tok);
            }
          }
          if (stack.length === 0 && !foundStart)
          {
            throw (this.model.getMessage('custViewMismatchedParensMsg') + ' ' + this.name);
          }
          break;
        default:
          if (criteriaLst && criteriaLst.indexOf(tok) == -1)
          {
            throw this.model.getMessage('criteriaNotFoundMsg');
          }
          out.push(tok);
          break;
      }
    }
    while (stack.length > 0)
    {
      tok = stack.pop();
      if (tok == '(')
      {
        throw (this.model.getMessage('custViewMismatchedParensMsg') + ' ' + this.name);
      }
      out.push(tok);
    }
    return out;
  },

  _isOperator : function(s)
  {
    return (s == 'OR' || s == 'AND');
  },
  _isNumber : function(s)
  {
    return (isNaN(parseFloat(s)) ? false : true);
  },

  _toNumber : function(s)
  {
    if (typeof (s) == "number")
    {
      return s;
    }
    else
    {
      var n = parseFloat(s);
      return n.valueOf();
    }
  }

};

Gradebook.CustomView.getFullGC = function(model)
{
  var json =
  {};
  json.name = model.getMessage('fullGradeCenterMsg');
  json.id = 'fullGC';
  json.definition = "\"searchType\":\"status\",\"category\":\"c_all\",\"students\":{\"userIds\":[\"all\"],\"showstuhidden\":false}, \"display\":{ \"items\":\"ALL\",\"showhidden\":false}";
  json.aliases =
    [];
  return new Gradebook.CustomView(json, model);
};
var frameset = {};

frameset.getTopFrameHeight = function()
{
  return $('navFrame').getHeight();
};

frameset.setTopFrameHeight = function( height )
{
  $('navFrame').setStyle({height: height + 'px'});
  frameset.onResize();
};

frameset.onResize = function(ev)
{
  var windowHeight = document.viewport.getHeight();
  var topFrameHeight = $('navFrame').getHeight();
  var contentFrame = $('contentFrame');
  contentFrame.hide();
  contentFrame.setStyle({height: (windowHeight - topFrameHeight) + 'px'});
  contentFrame.show();
};

frameset.openHelpWindow = function( helpUrl )
{
  var features='width=900, height=675, toolbar=yes, location=yes, menubar=yes, scrollbars=yes, status=yes, resizable=yes';
  newWindow=window.open(helpUrl,'_blank',features);
  if(newWindow != null){
    newWindow.focus();
  }

  return false;
};

var globalNavMenu = {

  // how long after the menu loses focus to wait, before closing it
  MENU_CLOSE_TIMER_INTERVAL: 1000,

  // the id of the timer responsible for closing the menu
  menuCloseTimerId : null,

  // the key code for the space key
  KEY_SPACE: 32,

  ACTIVE_SECTION_KEY: "globalNavMenu:activeSection",

  /**
   * Starts a timer that closes the menu after a short interval.
   */
  initiateMenuClose : function () {
    globalNavMenu.menuCloseTimerId = setTimeout ( function() { globalNavMenu.toggleMenu(false); }, globalNavMenu.MENU_CLOSE_TIMER_INTERVAL );
  },


  /**
   * Called when the menu loses focus.
   *
   * @param event An onmouseout event
   */
  menuAbandoned: function (event) {

    // figure out where the mouse has moved to
    var target = event.toElement || event.relatedTarget;

    // if it hasn't moved anywhere within the confines of the menu or its invoking link,
    // start the process of closing it
    if ( target && target != $("global-nav-flyout") && !target.up("#global-nav-flyout") && target != $("global-nav") && !target.up("#global-nav") ) {
      globalNavMenu.initiateMenuClose();
    }
  },


  /**
   * Called when the menu gains focus
   */
  menuEntered: function () {

    // if the menu is scheduled to be closed, cancel the close
    if ( globalNavMenu.menuCloseTimerId ) {
      clearTimeout(globalNavMenu.menuCloseTimerId);
      globalNavMenu.menuCloseTimerId = null;
    }

  },


  /**
   * Initialize the menu.
   */
  init : function( toolActivityEnabled )
  {
    // initialize the tool_service
    if ( toolActivityEnabled )
    {
      top.tool_service.register ( "globalnavmenu", globalNavMenu.activityListener );
    }

    globalNavMenu.attachEventHandlers();
  },

  attachEventHandlers : function ()
  {
    // Since the global nav menu should open only as tall as the current size of the browser window
    // (so that users do not have to scroll to access the left-hand-side tools when there are lots of 
    // them), close the global nav menu when the user resizes the browser window. Make an exception for mobile
    // browsers (ok, just Safari for now) since one cannot intentionally resize a window (though resize 
    // events do fire indirectly as a consequence of user actions such as orientation change) in a mobile (iOS)
    // device.
    if ( !Prototype.Browser.MobileSafari )
    {
      Event.observe( window, "resize", function() { globalNavMenu.toggleMenu( false ); } );
    }

    Event.observe( window, "beforeunload", function() { globalNavMenu.toggleMenu( false ); } );

    // for ie only, we invoke the menu when the link is focused, because that's the only way
    // to get it to open with the accesskey -- IE fires a focus event, not a click event,
    // when the menu's access key is pressed
    if ( Prototype.Browser.IE ) {
      $("global-nav-link").observe( "focus", globalNavMenu.onNavLinkClick );
    }
    else {
      $("global-nav-link").observe( "click", globalNavMenu.onNavLinkClick );
    }

    // watch for focus entering/exiting the menu or the menu header
    $("global-nav-link").observe( "mouseout", globalNavMenu.menuAbandoned );
    $("global-nav-link").observe( "mouseover", globalNavMenu.menuEntered );
    $("global-nav-flyout").observe( "mouseout", globalNavMenu.menuAbandoned );
    $("global-nav-flyout").observe( "mouseover", globalNavMenu.menuEntered );
    $("global-nav-flyout").observe( "click", welcomeOverlay.closeOverlay );    

    // watch for menu rail shortcut clicks
    $$("#global-list-tools a").each( function( shortcut )  {
      if ( !shortcut.onclick ) {
        shortcut.observe( "click", globalNavMenu.onShortcutClick );
      }
    });

    // attach event handlers to section headers
    $$(".accordion_toggle").each( function( sectionHeader ) {

      // open/close the section when its header is clicked
      sectionHeader.observe( "click", globalNavMenu.onSectionClick );

      // watch for keyboard events on the section headers
      sectionHeader.observe( "keydown", function (event) {

        var contentArea = this.down();
        
        var sectionId = contentArea.readAttribute( "data-section-id" );
        var sectionUri = contentArea.readAttribute( "data-section-uri" );

        var sectionContent = $(sectionId+'-content');
        var sectionTitle = $(sectionId+'-title');
        
        // TODO is there a more generic way to do this
        var key = event.keyCode;
        
        switch (key) {
          
          // open the section
          case Event.KEY_RETURN:
          case Event.KEY_RIGHT:
          case globalNavMenu.KEY_SPACE:
            
            if ( !sectionContent.visible() ) {
              globalNavMenu.openSection( sectionContent, sectionUri );
            }
            
            globalNavMenu.focusFirstSectionLink(sectionContent);
            
            event.stop();
            break;
            
          // move focus to the next section header
          case Event.KEY_DOWN:

            var nextToggle = sectionTitle.next(".accordion_toggle");

            // if there's another section below us
            if ( nextToggle ) {
              nextToggle.focus();
            }

            // otherwise, we're at the bottom of the section area
            else {
              $('topframe.home.label').focus();
            }

            event.stop();

            break;
            
          // focus the previous section header
          case Event.KEY_UP:
            var previousToggle = sectionTitle.previous(".accordion_toggle");

            if ( previousToggle ) {
              previousToggle.focus();
            }

            event.stop();

            break;
            
          case Event.KEY_LEFT:
            
            // if the section is open, close it
            if ( sectionContent.visible() ) {
              globalNavMenu.closeSection( sectionContent );
            }

            // otherwise, focus the first section in the rail
            else {
              globalNavMenu.focusFirstShortcut();
            }

            event.stop();

            break;
            
        }

      });
                  
    });

    
    // attach event handlers to the bottom buttons 
    $$(".bottom-buttons a").each( function ( bottomButton ) {

      // keyboard navigation for the bottom buttons
      bottomButton.observe( "keydown", function(event) {
      
        var key = event.keyCode;

        switch (key) {

          // down takes you to the next button over
          case Event.KEY_DOWN:
            var nextButton = this.up("li").next();
            if (nextButton) nextButton.down("a").focus();
            event.stop();
            break;

          // up takes you to the previous button, or the previous section if we're already 
          // at the leftmost extent of the button area
          case Event.KEY_UP:

            // if this is the first button, jump back up the last section
            if ( this == $$(".bottom-buttons a:first").first() )  {
              
              var lastSection = $$(".accordion-wrapper div.accordion_toggle:last").first();
              if ( lastSection ) lastSection.focus();

            } 

            // otherwise, move to the previous button
            else {              
              this.up(0).previous('li', 0).down('a', 0).focus();
            }

            event.stop();

            break;   
            
          case Event.KEY_TAB:

            // if this is the last button, close the menu
            if ( this == $$(".bottom-buttons a:last").first() )  {
              globalNavMenu.keyboardCloseMenu();
              event.stop();
            }
            
            break;
            
        };

      });

    });
    

    // attach event handlers to the rail shortcuts
    $$(".mybb-tools a").each( function( sectionHeader ) {

      // keyboard navigation for shortcuts
      sectionHeader.observe( "keydown", function( event ) {

        var key = event.keyCode;

        switch (key) {

          // down takes you to the next shortcut
          case Event.KEY_DOWN:
            var nextShortcut = this.up(0).next("li");
            if ( nextShortcut ) nextShortcut.down("a", 0).focus();
            event.stop();
            break;

          // previous takes you to the previous shortcut
          case Event.KEY_UP:
            var previousShortcut = this.up(0).previous("li", 0);
            if ( previousShortcut ) previousShortcut.down("a").focus();
            event.stop();
            break;

          // right moves to the menu sections
          case Event.KEY_RIGHT:
            $$(".accordion-wrapper div:first").first().focus();
            event.stop();
            break;   
        }

      });

    });

    // keyboard navigation for the menu header
    $("global-nav-link").observe( "keydown", function(event) {

      var key = event.keyCode;

      switch (key) {

        // space toggles the menu
        case globalNavMenu.KEY_SPACE:
          globalNavMenu.toggleMenu();
          break;

        // down opens the menu
        case Event.KEY_DOWN:
          globalNavMenu.toggleMenu(true);
          break;

        // up closes the menu
        case Event.KEY_UP:
          globalNavMenu.toggleMenu(false);
          break;

        // tab focuses the first shortcut, if the menu's open
        case Event.KEY_TAB:

          if ( $("global-nav-flyout").visible() ) {
            globalNavMenu.focusFirstShortcut();
            event.stop();
          }

          break;
      }

    });

    // keyboard navigation for the menu
    $("global-nav-flyout").observe( "keydown", function(event) {

      var key = event.keyCode;

      switch (key) {

        // escape closes the menu
        case Event.KEY_ESC:
          globalNavMenu.keyboardCloseMenu();
          break;

      }

    });
    
  },


  /**
   * Hide/show the menu.
   *
   * @param show Whether to hide or show the menu.
   */
  toggleMenu: function ( show, preview )
  {
    
    var menu = $("global-nav-flyout");
    var menuLink = $("global-nav-link");
    var menuImage = $("global-toggle-img");

    var isPreview = preview && "true" === preview;
    
    // if the caller didn't express a preference, toggle the menu display 
    if ( show === undefined ) show = !menu.visible();
    
    if ( show && !menu.visible() ) {
      menuLink.addClassName("active");
      menu.setAttribute( 'aria-expanded', 'true');
      menu.show();

      menuImage.setAttribute( 'src','/images/ci/mybb/arrowUp-topnav.png' );
      menuImage.setAttribute( 'alt', page.bundle.getString( "globalnav.menu.collapse" ) );

      if ( !isPreview )
      {
        UserDataDWRFacade.getStringTempScope( globalNavMenu.ACTIVE_SECTION_KEY, globalNavMenu.handleActiveSection );
        globalNavMenu.resizeMenu();
      }
      
      // this is an awful hack. it's here because (a) the event that open the menu goes on to steal any focus we try to apply
      // when the menu opens; and (b) we can't stop the event because it's used to trigger the display of the welcome overlay.
      // bah.
      setTimeout(globalNavMenu.focusFirstShortcut, 200);
      
    }

    else if ( menu.visible() )
    {
      if ( !isPreview )
      {
        globalNavMenu.saveActiveSection();
      }

      if ( $('global-more-tools') && $('global-more-tools').visible() )
      {
        $('global-more-tools').hide();
      }

      menuLink.removeClassName("active");
      menu.setAttribute( 'aria-expanded', 'false');
      menu.hide();

      menuImage.setAttribute( 'src','/images/ci/mybb/arrowDown-topnav.png' );
      menuImage.setAttribute( 'alt',page.bundle.getString( "globalnav.menu.expand" ) );
    }

  },

  /**
   * Called when the menu link is clicked.
   */
  onNavLinkClick : function( event ) 
  { 
    var preview = $("global-nav").readAttribute("data-preview") ;
    globalNavMenu.toggleMenu ( !$("global-nav-flyout").visible(), preview );

    // note: we would like to stop propagation of this event -- it causes us focus issues -- but we
    // can't, because it's needed for the welcome menu overlay
    
    // need to prevent page jumping behavior on preview pages
    // tried javascript:void(0), href="globalNavMenu.onNavLinkClick()" but they either don't work or mess up menu closer
    // on some browsers. event propagation is needed on real menu. hence hack.
    if ( "true" === preview )
    {
      Event.stop( event );
    }
  },

  
  resizeMenu : function()
  {
    var winHeight = document.viewport.getHeight();

    var nav = $('global-nav-flyout');
    var navOffset = nav.viewportOffset().top;

    // new height of the entire global nav - min( 600px, the height of the viewport - offset )
    var newHeight = 600;
    if ( newHeight > winHeight - navOffset )
    {
      newHeight = winHeight - navOffset;
    }
    nav.setStyle( { height: newHeight +'px' } );

    // the height of all of the toggles + the bottomButtons
    var totalToggleHeight = $('bottomButtons' ).getHeight();
    $$('#vertical_container > .accordion_toggle').each(function(e){
      if ( newHeight > totalToggleHeight + e.getHeight() )
      {
        totalToggleHeight += e.getHeight();
      }
    });

    // the height of the accordion content sections (this affects the height of the global nav)
    // set the accordions to fit in the remaining space
    var accordionContentHeight = newHeight - totalToggleHeight + "px";
    $$('#vertical_container > .accordion_content').invoke('setStyle', { height: accordionContentHeight });

    // resize the sideNav
    globalNavMenu.resizeRail();
  },

  resizeRail : function()
  {
    // if window has been resized with non empty more tools box, we need to redraw the box according to new viewport size
    // so move all shortcuts out back to shortcut list first to start over
    if ( $$('#global-more-tools > li').size() > 0 )
    {
      $$('#global-more-tools > li').each( function( shortcut )
      {
        $('global-more-link').insert( { before : shortcut } );
      });
    }

    var shortcuts = $$('#global-list-tools > li');
    // more link is always hidden
    if ( shortcuts && shortcuts.length > 1 )
    {
      var globalHeight = $('global-nav-flyout').getHeight();
      var listHeight = $('global-list-tools').getHeight();

      //if the sidenav is larger than the menu
      if( listHeight > globalHeight)
      {
        //resize the sidenav
        $('global-nav-tools').setStyle( { height : globalHeight +'px'});
        $('global-more-link').show();

        // start from the second to last list item (this avoids the More link, which is the last item in the list)
        // if the tools menu is larger than the global nav, insert the items that overflow into a separate list
        // a while loop? are you kidding? somebody save me from myself.

        var i = shortcuts.size()-2;
        while ( listHeight > globalHeight && i >= 0 )
        {
          // move one shortcut to more box then remeasure sidenav height
          $( 'global-more-tools' ).insert( { top: shortcuts[i] } );
          listHeight = $('global-list-tools').getHeight();
          i--;
        }
      }

      if( $$('#global-more-tools > li').size() === 0 )
      {
        $('global-more-link').hide();
      }
    }
  },

  drawMoreBox : function()
  {
    // need to show it first to get heights
    var more = $('global-more-tools');
    more.show();

    var items = $$('#global-more-tools > li').size();
    var gridSize = Math.sqrt(items);
    gridSize = Math.ceil(gridSize);

    var item = $$('#global-more-tools li')[0];
    var itemHeight = item.getHeight() + item.style.paddingTop + item.style.paddingBottom;
    gridSize *= itemHeight;

    more.setStyle({height: gridSize +'px', width: gridSize +'px'});
  },

  onMoreClick : function( event )
  {
    var e = event || window.event;
    var eventElement = Event.element( e );

    if ( eventElement.up( '.more-link' ) )
    {
      var moreToolsBox = $('global-more-tools');
      if ( !moreToolsBox.visible() )
      {
        globalNavMenu.drawMoreBox();
      }
      else
      {
        moreToolsBox.hide();
      }
    }

    eventElement.up().toggleClassName( 'active' );

    return false;
  },

  onShortcutClick : function( event )
  {

    var e = event || window.event;
    Event.stop( e );

    globalNavMenu.toggleMenu ( false );
    welcomeOverlay.closeOverlay();
    top.frames.content.location = this.href;
    return false;

  },

  onSectionClick : function( event )
  {
    var e = event || window.event;
    Event.stop( e );

    var contentArea = this.down();

    var sectionId = contentArea.readAttribute( "data-section-id" );
    var sectionUri = contentArea.readAttribute( "data-section-uri" );

    var sectionContentDiv = $(sectionId+'-content');

    if ( sectionContentDiv.visible() )
    {
      globalNavMenu.closeSection ( sectionContentDiv );
    }
    else
    {
      globalNavMenu.openSection ( sectionContentDiv, sectionUri );
    }
    return false;
  },

  closeSection: function ( sectionContentDiv )
  {
    var allowCaching = "true" === sectionContentDiv.readAttribute( "data-allow-caching" );

    if ( sectionContentDiv.visible() )
    {
      // no caching allowed - wipe out contents
      if ( !allowCaching )
      {
        sectionContentDiv.innerHTML = "";
      }

      sectionContentDiv.setAttribute( 'aria-expanded', 'false' );
      sectionContentDiv.setAttribute( 'aria-hidden', 'true' );

      sectionContentDiv.hide();
      
    }
  },

  openSection: function ( sectionContentDiv, sectionUri )
  {
    $$('.accordion_content').each( function( s ){
      globalNavMenu.closeSection( s );
    });


    var allowCaching = "true" === sectionContentDiv.readAttribute( "data-allow-caching" );

    sectionContentDiv.setAttribute( 'aria-expanded', 'true' );
    sectionContentDiv.setAttribute( 'aria-hidden', 'false' );

    
    if ( !allowCaching || sectionContentDiv.empty() )
    {
      sectionContentDiv.addClassName("section-loading");
      sectionContentDiv.show();

      new Ajax.Request( sectionUri,
                        {  method: 'get',
                           asynchronous: true,
                           
                           onSuccess: function(transport) {
                             var result = transport.responseText;
                             if ( result ) {
                               sectionContentDiv.insert( { top: result } );
                               globalNavMenu.attachSectionContentEventHandlers (sectionContentDiv);
                               globalNavMenu.focusFirstSectionLink(sectionContentDiv);
                             }

                             sectionContentDiv.removeClassName("section-loading");
                           }
                        });
    }
        
    else
    {
      sectionContentDiv.show();
    }
  },

  
  attachSectionContentEventHandlers: function(sectionContent) {
  
    // TBD I wonder whether we should be doing this at the menu level; or, rather, whether
    // we should be doing it more generically
    sectionContent.select("a").each ( function (anchor) {
      
      anchor.observe( "keydown", function(event)  {
        
        var key = event.keyCode;
  
        var accordionContentContainer = this.up(".accordion_content");
  
        switch (key) {
  
          case Event.KEY_LEFT:
  
            var sectionId = accordionContentContainer.readAttribute("data-section-id");
  
            // close the accordion section and put focus on the toggle
            globalNavMenu.closeSection( $(sectionId + "-content") );
            accordionContentContainer.previous().focus();
            event.stop();
            break;
  
        }
        
      });
      
    });
    
  },
  
  handleActiveSection : function( sectionId )
  {
    var sectionContentDiv = $(sectionId+"-content");
    if ( sectionId.blank() || !sectionContentDiv )
    {
      sectionContentDiv = $$("div.accordion_content").first();
    }

    var sectionUri = sectionContentDiv.readAttribute("data-section-uri");

    globalNavMenu.openSection( sectionContentDiv, sectionUri );
  },

  saveActiveSection : function()
  {
    var activeSectionId = null;
    $$('.accordion_content').each( function( s ){
      if ( s.visible() )
      {
        activeSectionId = s.readAttribute("data-section-id");
        return;
      }
    });

    if ( activeSectionId )
    {
      UserDataDWRFacade.setStringTempScope( globalNavMenu.ACTIVE_SECTION_KEY, activeSectionId );
    }
    else
    {
      UserDataDWRFacade.removeStringTempScope( globalNavMenu.ACTIVE_SECTION_KEY );
    }
  },

  updateTotalCount : function () {

    var total = top.tool_service.getActivityCounts().values().inject( 0, function ( acc, count ) {
      return acc + count;
    });

    var globalAvatar = $("global-avatar");

    // display the total, or hide the badge, depending on whether we have any activity
    if ( total > 0 )  {

      var badgeTotalElement = $("badgeTotal");
      var badgeCountElement = $("badgeTotalCount");

      // update the badge
      var badgeValue = top.tool_service.formatCount(total, top.tool_service.MAX_COUNT);
      badgeCountElement.innerHTML = badgeValue;
      badgeTotalElement.setStyle( { visibility : 'visible'} );

    }

    else  {

      $("badgeTotal").setStyle( { visibility : 'hidden'} );

    }

  },


  activityListener : {

    activityCountsUpdated : function () {

      if ( top.tool_service.getActivityCounts() ) {

        top.tool_service.getActivityCounts().each ( function ( pair ) {


          // if the tool has any activity, display its badge
          if  ( pair.value > 0 ) {
            globalNavMenu.showToolActivityValue( pair.key, pair.value );
          }

          // ... otherwise hide it
          else {
            globalNavMenu.removeToolActivityValue( pair.key );
          }

        });

        globalNavMenu.updateTotalCount();

      }

      else {
        $("badgeTotal").setStyle( { visibility : 'hidden'} );
      }

    },

    activityCountUpdated : function ( toolId ) {

      var badgeValue = top.tool_service.getActivityCountForTool(toolId);

      if ( badgeValue && badgeValue > 0 ) {
        globalNavMenu.showToolActivityValue( toolId, badgeValue );
      }

      else {
        globalNavMenu.removeToolActivityValue( toolId );
      }

      globalNavMenu.updateTotalCount();

    }

  },

  // used by course section : course_menu_section.jsp
  goToUrl: function( targetUrl )
  {

    // hide the menu
    globalNavMenu.toggleMenu( false );

    // replace the entire page
    window.top.location.href = targetUrl;
    return false;
  },


  /**
   * Inserts the tool activity value in the badge element.
   *
   * @param toolId         The tool whose activity count we're updating
   * @param activityCount  The activity count
   */
  showToolActivityValue: function( toolId, activityCount ) {

    var badge = $(toolId + "::badge");

    // update the badge
    if ( badge ) {

      var badgeValue = top.tool_service.formatCount(activityCount, top.tool_service.MAX_TOOL_COUNT);
      badge.innerHTML = badgeValue;
      badge.show();

      // update hidden screen reader label to include activity data      
      var shortcut = $(toolId + "_AXLabel");
      shortcut.innerHTML = shortcut.getAttribute("data-tool-title") + " - " + page.bundle.getString("tool.activity.description");
    }

  },

  /**
   * Removes tool actvity values from the UI.
   *
   * @param The tool whose activity count we're updating.
   */
  removeToolActivityValue: function( toolId ) {

    var badge = $(toolId + "::badge");

    if ( badge ) {
      badge.innerHTML = ""; // necessary to prevent JAWS/IE from announcing the value, even when it's hidden: known issue with JAWS and hidden <spans> inside <a> tags
      badge.hide();
      
      // wipe out screen reader label
      var shortcut = $(toolId + "_AXLabel");
      shortcut.innerHTML = "";
    }

  },
  

  focusFirstShortcut: function() {

    var firstShortcut = $$(".mybb-tools a:first").first();

    if ( firstShortcut ) {
      try 
      {
        firstShortcut.focus();
      } 
      catch (e)
      {
        // Ignore - in IE you cannot set focus on an element that isn't visible and this may not be visible right now.
        // TODO: investigate why we are trying to focus on a not-visible element.
      }
    }

  },


  focusFirstSectionLink: function ( container ) {
    
    // next try to focus on the first non-hidden link
    var links = container.select ("a[class!='hideoff']" );
    
    if ( links && links.length > 0 ) {
      $( links[ 0 ] ).focus();
    }
    
  },
  
  
  keyboardCloseMenu: function() {

    // temporarily suppress the on-focus-open behavior of IE, because we don't want the menu to pop
    // back open as soon as it's closed
    if ( Prototype.Browser.IE ) {
      $("global-nav-link").stopObserving( "focus", globalNavMenu.onNavLinkClick );
    }
    
    globalNavMenu.toggleMenu(false);
    $("global-nav-link").focus();

    // re-instate on-focus-open
    if ( Prototype.Browser.IE ) {
      window.setTimeout ( function() { $("global-nav-link").observe( "focus", globalNavMenu.onNavLinkClick ) }, 50 );
    }
    
  }
  
};
var BrowserSpecific =
{
  registerListeners: function()
  {
    if( Prototype.Browser.IE )
    {
      var inputs = $A(document.getElementsByTagName('input'));
       //Enter key submit handling added only for IE browser.
      if( inputs )
      {
        inputs.each(
                      function( input )
                      {
                        if(input.type === 'text' && !page.util.hasClassName(input,'noFormSubmitIE'))
                        {
                          Event.observe( input, "keypress",
                                         this.checkEnterKeyToSubmit.bindAsEventListener( this, input )
                                        );
                        }
                      }.bind( this )
                   );
      }
   }
 },
 checkEnterKeyToSubmit: function(event, input)
 {
   //if generated character code is equal to ascii 13 (if enter key)
   if(event.keyCode == 13 && input.form)
   {
     var submitButtons = $(input.form).getInputs('submit');
     if(submitButtons && submitButtons.size() > 0)
     {
       submitButtons.first().click();
     }
     Event.stop(event);
   }
   else
   {
     return true;
   }
 },
 // Fix FireFox bug which converts absolute links pasted into a VTBE into relative ones which
 // start with a variable number of "../".
 // https://bugzilla.mozilla.org/show_bug.cgi?id=613517
 handleFirefoxPastedLinksBug: function( baseUrl, vtbeText )
 {
   if ( !baseUrl || !vtbeText )
   {
     return vtbeText;	
   }

   if ( Prototype.Browser.Gecko )
   {
     if( !$( baseUrl.empty() ) && !$( vtbeText.empty() ) )
     {
       //e.g. extract out "http://localhost:80" from "http://localhost:80/webapps/Bb-wiki-BBLEARN/"
       // port is optional
       var absoluteUrlPrefix = baseUrl.match(/https?:[\d]*\/\/[^\/]+/);
       // e.g."../../../bbcswebdav/xid-2202_1" into "http://localhost:80/bbcswebdav/xid-2202_1"
       vtbeText = vtbeText.replace(/(\.\.\/)+(sessions|bbcswebdav|courses|@@)/g, absoluteUrlPrefix + "/" + "$2");
     }
   }
   return vtbeText;
 },

  disableEnterKeyInTextBoxes: function (document)
  {
    var inputs = $A(document.getElementsByTagName('input'));
    if( inputs )
    {
      inputs.each
      (
        function( input )
        { //must add special className for IE textboxes
          if( Prototype.Browser.IE )
          {
            input.addClassName( 'noFormSubmitIE' );
          }
          Event.observe( input, 'keypress', this.disableEnterKey );
        }.bind( this )
      );
    }
  },

  disableEnterKey: function( event )
  {
    if( event.keyCode != Event.KEY_RETURN )
    {
      return;
    }
    Event.stop( event );
    return;
  }
};
/** The collection of classes and methods that comprise the QuickLinks core implementation. */
var quickLinks =
{
    constants :
    {
        /** Constant identifier for identifying frame communications specific to this function */
        APP_CONTEXT : 'QuickLinks',

        /** Hotkey for the Quick Links UI */
        APP_HOTKEY :
        {
            accesskey : 'l',
            modifiers :
            {
                shift : true,
                alt : true
            }
        },

        // Constants for various window actions
        SET : 'set',
        ADD : 'add',
        REMOVE : 'remove',
        SHOW : 'show',
        ACTIVATE : 'activate',
        REMOVE_ALL : 'removeAll',
        DEFINE_KEY : 'defineKey',

        /** The order in which we process windows */
        WINDOW_ORDER_FOR_HEADERS :
        {
            mybbCanvas : 1,
            WFS_Files : 2,
            content : 3,
            WFS_Navigation : 4,
            nav : 5,
            'default' : 100
        },

        /** ARIA roles that we consider 'landmarks' */
        ARIA_LANDMARK_ROLES :
        {
            application : true,
            banner : true,
            complementary : true,
            contentinfo : true,
            form : true,
            main : true,
            navigation : true,
            search : true
        }
    },

    vars :
    {
        /** reference to lightbox object */
        lightbox : null,

        /** cached quick link data */
        data : $H(),

        /** Messages must originate from one of these sources */
        trustedProviders : $H(),

        // Cached references to HTML elements
        lightboxLandmarkList : null,
        lightboxLandmarkSection : null,
        lightboxHeaderList : null,
        lightboxHeaderSection : null,
        lightboxHotkeyList : null,
        lightboxHotkeySection : null,

        /** The instance of helper for the window containing this script */
        helper : null
    },

    /** Initialization of the UI/core implementation */
    initialize : function( trustedProviders )
    {
      // Initialize a lightbox to show collected links
      quickLinks.vars.lightbox = new lightbox.Lightbox(
      {
          title : page.bundle.getString( 'quick_links.lightbox_title' ),
          contents :
          {
            id : 'quickLinksLightboxDiv'
          },
          'dimensions' :
          {
              w : 800,
              h : 600
          }
      } );

      // Add trusted content providers from whom we accept messages
      if ( trustedProviders )
      {
        trustedProviders.each( function( tp )
        {
          if ( tp )
          {
            quickLinks.vars.trustedProviders.set( tp, true );
          }
        } );
      }
      quickLinks.vars.trustedProviders.set( quickLinks.util.getCurrentOrigin(), true );

      // Add listener for frame communications
      Event.observe( window.top, 'message', quickLinks.messageHelper.onMessageReceived );

      // When link is active, modify the wrapping div
      var wrapperDiv = $( 'quick_links_wrap' );
      Event.observe( $( 'quick_links_lightbox_link' ), 'focus', function( event )
      {
        this.addClassName( 'quick_link_wrap_focus' );
      }.bind( wrapperDiv ) );
      Event.observe( $( 'quick_links_lightbox_link' ), 'blur', function( event )
      {
        this.removeClassName( 'quick_link_wrap_focus' );
      }.bind( wrapperDiv ) );

      // Cache references to some elements
      quickLinks.vars.lightboxLandmarkList = $( 'quick_links_landmark_list' );
      quickLinks.vars.lightboxHeaderList = $( 'quick_links_heading_list' );
      quickLinks.vars.lightboxHotkeyList = $( 'quick_links_hotkey_list' );
      quickLinks.vars.lightboxLandmarkSection = $( 'quick_links_landmarks_section' );
      quickLinks.vars.lightboxHeaderSection = $( 'quick_links_headings_section' );
      quickLinks.vars.lightboxHotkeySection = $( 'quick_links_hotkeys_section' );
    },

    /** Factory method that creates a Helper for frames that require it */
    createHelper : function()
    {
      // If this is not a popup and this is not a top-level window without the quick links UI link
      // (for instance if someone opened one of the frames in a separate tab)
      if ( !window.opener && ( window.top !== window || $( 'quick_links_lightbox_link' ) ) )
      {
        if ( !quickLinks.vars.helper )
        {
          quickLinks.vars.helper = new quickLinks.Helper();
        }
      }
    },

    /**
     * Add a hot key definition.
     * 
     * @param hotkey is an object with keys label, accesskey, and modifiers. modifiers is an object with one or more of
     *          the keys -- control, shift, and alt -- set to a value expression that evaluates to true.
     * @param sourceId may be null and will default to the string used for all other quicklinks from the current window.
     */
    addHotKey : function( sourceId, hotkey )
    {
      if ( hotkey )
      {
        quickLinks.messageHelper.postMessage( window.top,
        {
            sourceId : sourceId || quickLinks.util.getCurrentWindowId(),
            context : quickLinks.constants.APP_CONTEXT,
            action : quickLinks.constants.ADD,
            hotkeys : [ hotkey ]
        }, quickLinks.util.getCurrentOrigin() );
      }
    },

    /**
     * Add hot key definition. See #addHotKey.
     * 
     * @param hotkeys hotkeys is an array of hotkey definitions as described in #addHotKey.
     */
    addHotKeys : function( sourceId, hotkeys )
    {
      if ( hotkeys )
      {
        quickLinks.messageHelper.postMessage( window.top,
        {
            sourceId : sourceId || quickLinks.util.getCurrentWindowId(),
            context : quickLinks.constants.APP_CONTEXT,
            action : quickLinks.constants.ADD,
            hotkeys : hotkeys
        }, quickLinks.util.getCurrentOrigin() );
      }
    },

    /**
     * Removes all content for the specified source. If sourceId evaluates to false, all content for the window that
     * calls this method will be removed.
     */
    removeAll : function( sourceId )
    {
      quickLinks.messageHelper.postMessage( window.top,
      {
          sourceId : sourceId,
          context : quickLinks.constants.APP_CONTEXT,
          action : quickLinks.constants.REMOVE_ALL
      }, quickLinks.util.getCurrentOrigin() );
    },

    /** A set of functions that deal with inter-window communication */
    messageHelper :
    {
        /** The handler for messages sent to window.top from other windows (or self) */
        onMessageReceived : function( event )
        {
          var data = quickLinks.messageHelper.translateData( event.data );
          if ( data && data.context === quickLinks.constants.APP_CONTEXT &&
               quickLinks.vars.trustedProviders.get( event.origin ) )
          {
            if ( data.action === quickLinks.constants.SET )
            {
              quickLinks.dataHelper.setQuickLinks( event.source, event.origin, data );
              quickLinks.messageHelper.postHotkey( event.source );
            }
            else if ( data.action === quickLinks.constants.SHOW )
            {
              quickLinks.lightboxHelper.toggleLightbox( data.sourceId, data.activeElementId, event.origin );
            }
            else if ( data.action === quickLinks.constants.REMOVE_ALL )
            {
              if ( data.sourceId )
              {
                quickLinks.vars.data.unset( data.sourceId );
              }
              else
              {
                // Remove all content from calling window
                quickLinks.vars.data.values().each( function( value )
                {
                  if ( value.window === event.source )
                  {
                    quickLinks.vars.data.unset( value.sourceId );
                  }
                } );
              }
            }
            else if ( data.action === quickLinks.constants.ADD )
            {
              quickLinks.dataHelper.addQuickLinks( event.source, event.origin, data );
            }
            else if ( data.action === quickLinks.constants.REMOVE )
            {
              quickLinks.dataHelper.removeQuickLinks( data );
            }
          }
        },

        /** Posts the supplied message to the target window */
        postMessage : function( w, data, target )
        {
          if ( w.postMessage )
          {
            if ( Prototype.Browser.IE && data && typeof ( data ) !== 'string' )
            {
              data = Object.toJSON( data );
            }
            w.postMessage( data, target );
          }
        },

        /** Handle IE's behavior of passing objects as strings */
        translateData : function( data )
        {
          if ( Prototype.Browser.IE && typeof ( data ) === 'string' && data.isJSON() )
          {
            data = data.evalJSON();
          }
          return data;
        },

        /** Sends a message the supplied window instance about the hot-key defined for the QuickLinks UI */
        postHotkey : function( w )
        {
          quickLinks.messageHelper.postMessage( w,
          {
              sourceId : quickLinks.util.getCurrentWindowId(),
              context : quickLinks.constants.APP_CONTEXT,
              action : quickLinks.constants.DEFINE_KEY,
              key : quickLinks.constants.APP_HOTKEY
          }, '*' );
        },

        /** Posts a message requesting the activation of the specified element */
        activateElement : function( sourceId, targetElementId, origin, isQuickLink )
        {
          // Reset focus
          quickLinks.vars.lightbox.cfg.onClose = null;
          quickLinks.vars.lightbox.cfg.focusOnClose = null;

          // Close lightbox
          quickLinks.lightboxHelper.closeLightbox();

          var windowEntry = quickLinks.vars.data.get( sourceId );

          // Focus on the target window
          windowEntry.window.focus();

          // Send a message to that window
          if ( windowEntry )
          {
            quickLinks.messageHelper.postMessage( windowEntry.window,
            {
                sourceId : quickLinks.util.getCurrentWindowId(),
                context : quickLinks.constants.APP_CONTEXT,
                action : quickLinks.constants.ACTIVATE,
                id : targetElementId,
                isQuickLink : isQuickLink
            }, origin );
          }
        }
    },

    /** A set of functions that deal with the management of the quick links data */
    dataHelper :
    {
        /** Create a hash for the hotkey definition */
        getHotKeyHash : function( key )
        {
          var result = key.accesskey;
          if ( key.modifiers )
          {
            result += key.modifiers.alt ? '-A' : '';
            result += key.modifiers.control ? '-C' : '';
            result += key.modifiers.shift ? '-S' : '';
          }
          return result;
        },

        /** Remove supplied quick links */
        removeQuickLinks : function( data )
        {
          var value = quickLinks.vars.data.get( data.sourceId );
          if ( value )
          {
            quickLinks.dataHelper.removeSelectionsById( value.headers, data.headers );
            quickLinks.dataHelper.removeSelectionsById( value.landmarks, data.landmarks );

            var selection =
            {};
            if ( data.hotkeys && value.hotkeys )
            {
              data.hotkeys.each( function( hotkey )
              {
                selection[ hotkey.id || quickLinks.dataHelper.getHotKeyHash( hotkey ) ] = true;
              } );
            }
            quickLinks.dataHelper.removeSelectionsById( value.hotkeys, selection );
          }
        },

        /** Remove those values from 'master' whose 'id' values exist in the 'selections' object */
        removeSelectionsById : function( master, selections )
        {
          if ( master && selections )
          {
            master = master.filter( function( i )
            {
              return i.id && !selections[ i.id ];
            } );
          }
          return master;
        },

        /** Overwrite any existing quick links */
        setQuickLinks : function( sourceWindow, origin, data )
        {
          quickLinks.vars.data.set( data.sourceId,
          {
              'window' : sourceWindow,
              sourceId : data.sourceId,
              origin : origin,
              headers : data.headers || [],
              landmarks : data.landmarks || [],
              hotkeys : quickLinks.dataHelper.normalizeHotKeys( data.hotkeys ) || []
          } );
        },

        /** Normalize the hotkey definition by adding the hash as an id if an id was not provided */
        normalizeHotKeys : function( hotkeys )
        {
          if ( hotkeys )
          {
            hotkeys.each( function( hotkey )
            {
              if ( !hotkey.id )
              {
                hotkey.id = quickLinks.dataHelper.getHotKeyHash( hotkey.key );
              }
            } );
          }
          return hotkeys;
        },

        /** Add quick links */
        addQuickLinks : function( sourceWindow, sourceOrigin, data )
        {
          var value = quickLinks.vars.data.get( data.sourceId );
          if ( !value )
          {
            value =
            {
                'window' : sourceWindow,
                sourceId : data.sourceId,
                origin : sourceOrigin,
                headers : [],
                landmarks : [],
                hotkeys : []
            };
            quickLinks.vars.data.set( data.sourceId, value );
          }
          if ( data.headers )
          {
            value.headers = value.headers.concat( data.headers );
          }
          if ( data.landmarks )
          {
            value.landmarks = value.landmarks.concat( data.landmarks );
          }
          if ( data.hotkeys )
          {
            value.hotkeys = value.hotkeys.concat( quickLinks.dataHelper.normalizeHotKeys( data.hotkeys ) );
          }
        }
    },

    /** A set of functions that deal with the management of the lightbox UI */
    'lightboxHelper' :
    {
        /** Toggles the QuickLinks lightbox state */
        toggleLightbox : function( targetWindowId, activeElementId, origin )
        {
          if ( lightbox.getCurrentLightbox() === quickLinks.vars.lightbox )
          {
            quickLinks.lightboxHelper.closeLightbox();
          }
          else
          {
            quickLinks.lightboxHelper.openLightbox( targetWindowId, activeElementId, origin );
          }
        },

        /** Opens the QuickLinks lightbox */
        openLightbox : function( targetWindowId, activeElementId, origin )
        {
          quickLinks.lightboxHelper.closeAllLightboxes();

          if ( targetWindowId && activeElementId && origin )
          {
            quickLinks.vars.lightbox.cfg.focusOnClose = null;
            quickLinks.vars.lightbox.cfg.onClose = function()
            {
              quickLinks.messageHelper.activateElement( targetWindowId, activeElementId, origin, false );
            }.bind( window.top );
          }
          else
          {
            quickLinks.vars.lightbox.cfg.onClose = null;
            quickLinks.vars.lightbox.cfg.focusOnClose = document.activeElement;
          }

          quickLinks.lightboxHelper.populateLightbox();
          quickLinks.vars.lightbox.open();
        },

        /** Closes the QuickLinks lightbox */
        closeLightbox : function()
        {
          quickLinks.lightboxHelper.clearLightboxContents();
          quickLinks.vars.lightbox.close();
        },

        /**
         * Close all open lightboxes. This will work only for lightboxes created using the core lightbox.js library and
         * opened from a frame that shares the same origin as window.top
         */
        closeAllLightboxes : function( w )
        {
          if ( !w )
          {
            w = window.top;
          }
          try
          {
            // Security errors appear in console even if we catch all exceptions, so try to avoid them
            if ( ( quickLinks.util.getCurrentOrigin() === quickLinks.util.getWindowOrigin( w ) ) && w.lightbox &&
                 w.lightbox.closeCurrentLightbox )
            {
              w.lightbox.closeCurrentLightbox();
            }
          }
          catch ( e )
          {
            // Ignore all exceptions -- probably caused by window of different origin
          }
          for ( var i = 0, iMax = w.frames.length; i < iMax; ++i )
          {
            quickLinks.lightboxHelper.closeAllLightboxes( w.frames[ i ] );
          }
        },

        /** Empties all content from the QuickLinks lightbox */
        clearLightboxContents : function()
        {
          quickLinks.vars.lightboxHeaderList.innerHTML = '';
          quickLinks.vars.lightboxLandmarkList.innerHTML = '';
          quickLinks.vars.lightboxHotkeyList.innerHTML = '';
        },

        /** Add known Quick Links to the lightbox UI after checking that they are still available on the page */
        populateLightbox : function()
        {
          if ( quickLinks.vars.data )
          {
            // Clear existing content
            quickLinks.lightboxHelper.clearLightboxContents();

            var keys = quickLinks.vars.data.keys();
            keys.sort( function( a, b )
            {
              var aWeight = quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ a ] ||
                            quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ 'default' ];
              var bWeight = quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ b ] ||
                            quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ 'default' ];
              return aWeight - bWeight;
            } );

            keys.each( function( key )
            {
              var value = quickLinks.vars.data.get( key );
              if ( value.window.closed )
              {
                delete quickLinks.vars.data[ key ];
                return;
              }

              if ( value.landmarks )
              {
                value.landmarks.each( quickLinks.lightboxHelper.populateLandmark.bind( value ) );
              }
              if ( value.headers )
              {
                value.headers.each( quickLinks.lightboxHelper.populateHeader.bind( value ) );
              }
              if ( value.hotkeys )
              {
                value.hotkeys.each( quickLinks.lightboxHelper.populateHotkey.bind( value ) );
              }
            } );

            // Display only sections that have content
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxHeaderList,
                                                    quickLinks.vars.lightboxHeaderSection );
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxLandmarkList,
                                                    quickLinks.vars.lightboxLandmarkSection );
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxHotkeyList,
                                                    quickLinks.vars.lightboxHotkeySection );
          }
        },

        /** Figure out if the element has content and display the corresponding section */
        checkSection : function( el, section )
        {
          if ( el.empty() )
          {
            section.hide();
          }
          else
          {
            section.show();
          }
        },

        /** Adds a single landmark to the lightbox UI */
        populateLandmark : function( landmark )
        {
          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxLandmarkList.appendChild( li );

          var a = $( document.createElement( 'a' ) );
          li.appendChild( a );
          a.innerHTML = landmark.label;
          a.setAttribute( 'href', '#' );
          a.setAttribute( 'onclick', 'quickLinks.messageHelper.activateElement("' + this.sourceId + '", "' +
                                     landmark.id + '", "' + this.origin + '", true)' );
          var title = page.bundle.getString( 'quick_links.link.title', this.sourceId, landmark.label, landmark.type );
          a.setAttribute( 'title', title );
        },

        /** Adds a single header to the lightbox UI */
        populateHeader : function( heading )
        {
          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxHeaderList.appendChild( li );
          li.setAttribute( 'class', 'quick_links_header_' + heading.type.toLowerCase() );

          var a = $( document.createElement( 'a' ) );
          li.appendChild( a );
          a.innerHTML = heading.label;
          a.setAttribute( 'href', '#' );
          a.setAttribute( 'onclick', 'quickLinks.messageHelper.activateElement("' + this.sourceId + '", "' +
                                     heading.id + '", "' + this.origin + '", true)' );
          var title = page.bundle.getString( 'quick_links.link.title', this.sourceId, heading.label, heading.type );
          a.setAttribute( 'title', title );
        },

        /** Adds a single hot-key definitions to the lightbox UI */
        populateHotkey : function( hotkey )
        {
          var span;
          var plus = ' ' + page.bundle.getString( 'quick_links.hotkey.combination_divider' ) + ' ';

          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxHotkeyList.appendChild( li );

          var div = $( document.createElement( 'div' ) );
          li.appendChild( div );
          div.setAttribute( 'class', 'keycombo' );

          if ( hotkey.key.modifiers )
          {
            if ( hotkey.key.modifiers.shift )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.shift' );

              div.appendChild( document.createTextNode( plus ) );
            }

            if ( hotkey.key.modifiers.control )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.control' );

              div.appendChild( document.createTextNode( plus ) );
            }

            if ( hotkey.key.modifiers.alt )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.alt' );

              div.appendChild( document.createTextNode( plus ) );
            }
          }

          span = $( document.createElement( 'span' ) );
          div.appendChild( span );
          span.setAttribute( 'class', 'presskey alpha' );
          span.innerHTML = hotkey.key.accesskey;

          div.appendChild( document.createElement( 'br' ) );
          div.appendChild( document.createTextNode( hotkey.label ) );
        }
    },

    /** General helper functions that don't belong elsewhere */
    'util' :
    {
        /** Whether the current frame/page has a Course menu */
        isCoursePage : function()
        {
          return $( 'courseMenuPalette_paletteTitleHeading' ) ? true : false;
        },

        /** Whether the current frame/page is on the Content Collection tab */
        isContentSystemPage : function()
        {
          return quickLinks.util.getCurrentWindowId() === 'WFS_Files';
        },

        /** Returns the origin string for the current window as understood by the window.postMessage API */
        getCurrentOrigin : function()
        {
          return quickLinks.util.getWindowOrigin( window );
        },

        /** Returns the origin string for the supplied window as understood by the window.postMessage API */
        getWindowOrigin : function( w )
        {
          var url = w.location.href;
          return url.substring( 0, url.substring( 8 ).indexOf( '/' ) + 8 );
        },

        /** A name identifying the current window. Not guaranteed to be unique. */
        getCurrentWindowId : function()
        {
          if ( !window.name )
          {
            window.name = Math.floor( ( Math.random() * 10e6 ) + 1 );
          }
          return window.name;
        },

        /** @return "mac" if the client is running on a Mac and "win" otherwise */
        isMacClient : function()
        {
          return navigator.platform.toLowerCase().startsWith( "mac" );
        },

        /** The modifiers for access keys for the current platform/browser */
        getDefaultModifiers : function()
        {
          return ( quickLinks.util.isMacClient() ) ?
          {
              control : true,
              alt : true
          } :
          {
              shift : true,
              alt : true
          };
        },

        /** Whether this aria role is a 'landmark' */
        isAriaLandmark : function( el )
        {
          var role = el.getAttribute( 'role' );
          return role && quickLinks.constants.ARIA_LANDMARK_ROLES[ role.toLowerCase() ];
        }
    },

    /**
     * Class used by all internally-sourced windows (anything that has a page tag that inherits from BasePageTag) to
     * communicate with quickLinks core
     */
    Helper : Class.create(
    {
        /** Constructor */
        initialize : function( config )
        {
          // Default values for configuration parameters.
          this.config = Object.extend(
          {
            trustedServer : quickLinks.util.getCurrentOrigin()
          }, config );

          Event.observe( window, 'message', this.onMessageReceived.bindAsEventListener( this ) );
          Event.observe( window, 'beforeunload', this.removeQuickLinks.bindAsEventListener( this ) );

          // Allow some time for other initialization to occur
          setTimeout( this.sendQuickLinks.bind( this ), 500 );
        },

        /** When window is unloaded */
        removeQuickLinks : function( event )
        {
          quickLinks.removeAll();
        },

        /** The handler for messages received from other window instances */
        onMessageReceived : function( event )
        {
          var data = quickLinks.messageHelper.translateData( event.data );
          if ( data && data.context === quickLinks.constants.APP_CONTEXT && event.origin === this.config.trustedServer )
          {
            if ( data.action === quickLinks.constants.ACTIVATE && data.id )
            {
              this.activateElement( $( data.id ), data.isQuickLink );
            }
            else if ( data.action === quickLinks.constants.DEFINE_KEY && data.key )
            {
              this.defineQuickLinksHotKey( event, data );
            }
          }
        },

        /** Defines the hotkey for the QuickLink UI */
        defineQuickLinksHotKey : function( event, data )
        {
          if ( this.keyDownHandler )
          {
            Event.stopObserving( document, 'keydown', this.keyDownHandler );
            this.keyDownHandler = null;
          }

          var source = event.source;
          var origin = event.origin;
          var key = data.key;

          this.keyDownHandler = function( ev )
          {
            var keyCode = ev.keyCode || ev.which;
            if ( ( String.fromCharCode( keyCode ).toLowerCase() === key.accesskey ) &&
                 ( !key.modifiers.shift || ev.shiftKey ) && ( !key.modifiers.alt || ev.altKey ) &&
                 ( !key.modifiers.control || ev.ctrlKey ) )
            {
              quickLinks.messageHelper.postMessage( source,
              {
                  sourceId : quickLinks.util.getCurrentWindowId(),
                  context : quickLinks.constants.APP_CONTEXT,
                  action : quickLinks.constants.SHOW,
                  activeElementId : document.activeElement ? $( document.activeElement ).identify() : null
              }, origin );
              ev.stop();
              return false;
            }
          }.bindAsEventListener( this );
          Event.observe( document, 'keydown', this.keyDownHandler );
        },

        /** Activates the specified element (focus or click as applicable) */
        activateElement : function( el, isQuickLink )
        {
          if ( el )
          {
            // Allow the element to accept focus temporarily
            var tabidx = el.getAttribute( 'tabindex' );
            if ( isQuickLink && !tabidx && tabidx !== 0 )
            {
              el.setAttribute( 'tabIndex', 0 );
            }

            // Pulsate for a few seconds if the element is visible
            if ( isQuickLink && el.visible() )
            {
              try
              {
                Effect.Pulsate( el );
              }
              catch ( e )
              {
                // Ignore all errors
              }
            }

            // Focus on the element
            el.focus();

            // Remove the tabindex so that we don't stop at this element later
            if ( isQuickLink && !tabidx && ( tabidx !== 0 ) )
            {
              el.setAttribute( 'tabIndex', Prototype.Browser.IE ? '-1' : '' );
            }
          }
        },

        /** Discovers quick links in the current window and sends them to the top window */
        sendQuickLinks : function()
        {
          var helper = this;

          var hotkeys = this.getElements( 'a[accesskey]', false, 'title' );
          if ( window.self === window.top )
          {
            hotkeys.push(
            {
                label : page.bundle.getString( 'quick_links.link_title' ),
                key : quickLinks.constants.APP_HOTKEY
            } );
          }
          var headers = this.getElements( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ], true );
          if ( quickLinks.util.isCoursePage() || quickLinks.util.isContentSystemPage() )
          {
            headers = this.modifyHeaderOrder( headers );
          }
          var landmarks = this.getElements( '[role]', false, 'role', 'title', quickLinks.util.isAriaLandmark
              .bind( this ) );

          quickLinks.messageHelper.postMessage( window.top,
          {
              sourceId : quickLinks.util.getCurrentWindowId(),
              context : quickLinks.constants.APP_CONTEXT,
              action : quickLinks.constants.SET,
              headers : headers,
              landmarks : landmarks,
              hotkeys : hotkeys
          }, this.config.trustedServer );
        },

        /**
         * Find elements matching the supplied pattern, using the value of the attribute labelAttribute as the label.
         * Returns an array of Objects with each having the properties id, type, label, and key.
         */
        getElements : function( pattern, inspectAncestors, labelAttribute, parenAttribute, isValidQuickLink )
        {
          var helper = this;
          var result = [];
          var modifiers = quickLinks.util.getDefaultModifiers();
          $$( pattern ).each( function( el )
          {
            if ( !helper.isAvailableAsQuickLink( el, inspectAncestors ) )
            {
              return;
            }

            if ( isValidQuickLink && !isValidQuickLink( el ) )
            {
              return;
            }

            var id = el.getAttribute( 'id' );
            if ( !id )
            {
              id = el.identify();
            }
            var label = helper.getLabel( el, labelAttribute, parenAttribute );

            result.push(
            {
                id : id,
                type : el.tagName.toLowerCase(),
                label : label,
                key :
                {
                    modifiers : modifiers,
                    accesskey : el.getAttribute( 'accesskey' )
                }
            } );
          } );
          return result;
        },

        /** Whether the specified element should be shown in the QuickLinks UI */
        isAvailableAsQuickLink : function( element, inspectAncestors )
        {
          // Skip all checks if this is explicitly marked as a quick link or otherwise
          if ( element.hasClassName( 'quickLink' ) )
          {
            return true;
          }
          if ( element.hasClassName( 'hideFromQuickLinks' ) )
          {
            return false;
          }

          // If element is not visible, don't show it.
          if ( ( element.getStyle( 'zIndex' ) !== null ) || !element.visible() )
          {
            return false;
          }

          if ( inspectAncestors )
          {
            // Look for a hidden ancestor
            var elArray = element.ancestors();
            for ( var i = 0, iMax = elArray.length; i < iMax; ++i )
            {
              var el = elArray[ i ];
              var elName = el.tagName.toLowerCase();

              // Stop when we reach the body
              if ( elName === 'body' || elName === 'html' )
              {
                break;
              }

              if ( !el.visible() )
              {
                return false;
              }
            }
          }

          return true;
        },

        /** Get the QuickLinks label for the specified element */
        getLabel : function( el, labelAttribute, parenAttribute )
        {
          var label = labelAttribute ? el.getAttribute( labelAttribute ) : null;
          if ( !label )
          {
            label = el.innerHTML.stripTags();
          }
          if ( label && parenAttribute )
          {
            var parenValue = el.getAttribute( parenAttribute );
            if ( parenValue )
            {
              label = page.bundle.getString( 'common.pair.paren', label, parenValue );
            }
          }
          return label;
        },

        /** Hack the order of headers for Course and Content System pages. It is Ugly, but it's also a requirement. */
        modifyHeaderOrder : function( headers )
        {
          if ( headers && headers.length > 0 )
          {
            var i, iMax;
            for ( i = 0, iMax = headers.length; i < iMax; ++i )
            {
              if ( headers[ i ].type.toLowerCase() === 'h1' )
              {
                break;
              }
            }
            if ( i !== 0 && i < iMax )
            {
              // move everything above the h1 to the bottom of the list
              var removed = headers.splice( 0, i );
              headers = headers.concat( removed );
            }
          }
          return headers;
        }
    } )
};