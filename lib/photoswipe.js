
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.ZVUIPinch = factory();
  }
}(this, function(require, exports, module) {

return function(template, UiClass, items, options) { /**
 *
 * Set of generic functions used by gallery.
 *
 * You're free to modify anything here as long as functionality is kept.
 *
 */
const helper = {
	features: null,
	bind(target, type, listener, unbind) {
		const methodName = `${unbind ? 'remove' : 'add'}EventListener`;
		type = type.split(' ');
		for(let i = 0; i < type.length; i++) {
			if(type[i]) {
				target[methodName]( type[i], listener, false);
			}
		}
	},
	isArray(obj) {
		return (obj instanceof Array);
	},
	createEl(classes, tag) {
		const el = document.createElement(tag || 'div');
		if(classes) {
			el.className = classes;
		}
		return el;
	},
	getScrollY() {
		const yOffset = window.pageYOffset;
		return yOffset !== undefined ? yOffset : document.documentElement.scrollTop;
	},
	unbind(target, type, listener) {
		helper.bind(target,type,listener,true);
	},
	removeClass(el, className) {
		const reg = new RegExp(`(\\s|^)${className}(\\s|$)`);
		el.className = el.className.replace(reg, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	},
	addClass(el, className) {
		if( !helper.hasClass(el,className) ) {
			el.className += (el.className ? ' ' : '') + className;
		}
	},
	hasClass(el, className) {
		return el.className && new RegExp(`(^|\\s)${className}(\\s|$)`).test(el.className);
	},
	getChildByClass(parentEl, childClassName) {
		let node = parentEl.firstChild;
		while(node) {
			if( helper.hasClass(node, childClassName) ) {
				return node;
			}
			node = node.nextSibling;
		}
	},
	arraySearch(array, value, key) {
		let i = array.length;
		while(i--) {
			if(array[i][key] === value) {
				return i;
			}
		}
		return -1;
	},
	extend(o1, o2, preventOverwrite) {
		for (const prop in o2) {
			if (o2.hasOwnProperty(prop)) {
				if(preventOverwrite && o1.hasOwnProperty(prop)) {
					continue;
				}
				o1[prop] = o2[prop];
			}
		}
	},
	easing: {
		sine: {
			out(k) {
				return Math.sin(k * (Math.PI / 2));
			},
			inOut(k) {
				return - (Math.cos(Math.PI * k) - 1) / 2;
			}
		},
		cubic: {
			out(k) {
				return --k * k * k + 1;
			}
		}
		/*
			elastic: {
				out: function ( k ) {

					var s, a = 0.1, p = 0.4;
					if ( k === 0 ) return 0;
					if ( k === 1 ) return 1;
					if ( !a || a < 1 ) { a = 1; s = p / 4; }
					else s = p * Math.asin( 1 / a ) / ( 2 * Math.PI );
					return ( a * Math.pow( 2, - 10 * k) * Math.sin( ( k - s ) * ( 2 * Math.PI ) / p ) + 1 );

				},
			},
			back: {
				out: function ( k ) {
					var s = 1.70158;
					return --k * k * ( ( s + 1 ) * k + s ) + 1;
				}
			}
		*/
	},

	/**
	 *
	 * @return {object}
	 *
	 * {
	 *  raf : request animation frame function
	 *  caf : cancel animation frame function
	 *  transfrom : transform property key (with vendor), or null if not supported
	 *  oldIE : IE8 or below
	 * }
	 *
	 */
	detectFeatures() {
        if(helper.features) {
			return helper.features;
		}
        const helperEl = helper.createEl();
        const helperStyle = helperEl.style;
        let vendor = '';
        const features = {};

        // IE8 and below
        features.oldIE = document.all && !document.addEventListener;

        features.touch = 'ontouchstart' in window;

        if(window.requestAnimationFrame) {
			features.raf = window.requestAnimationFrame;
			features.caf = window.cancelAnimationFrame;
		}

        features.pointerEvent = navigator.pointerEnabled || navigator.msPointerEnabled;

        // fix false-positive detection of old Android in new IE
        // (IE11 ua string contains "Android 4.0")

        if(!features.pointerEvent) {

			const ua = navigator.userAgent;

			// Detect if device is iPhone or iPod and if it's older than iOS 8
			// http://stackoverflow.com/a/14223920
			//
			// This detection is made because of buggy top/bottom toolbars
			// that don't trigger window.resize event.
			// For more info refer to _isFixedPosition variable in core.js

			if (/iP(hone|od)/.test(navigator.platform)) {
				let v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
				if(v && v.length > 0) {
					v = parseInt(v[1], 10);
					if(v >= 1 && v < 8 ) {
						features.isOldIOSPhone = true;
					}
				}
			}

			// Detect old Android (before KitKat)
			// due to bugs related to position:fixed
			// http://stackoverflow.com/questions/7184573/pick-up-the-android-version-in-the-browser-by-javascript

			const match = ua.match(/Android\s([0-9\.]*)/);
			let androidversion =  match ? match[1] : 0;
			androidversion = parseFloat(androidversion);
			if(androidversion >= 1 ) {
				if(androidversion < 4.4) {
					features.isOldAndroid = true; // for fixed position bug & performance
				}
				features.androidVersion = androidversion; // for touchend bug
			}
			features.isMobileOpera = /opera mini|opera mobi/i.test(ua);

			// p.s. yes, yes, UA sniffing is bad, propose your solution for above bugs.
		}

        const styleChecks = ['transform', 'perspective', 'animationName'];
        const vendors = ['', 'webkit','Moz','ms','O'];
        let styleCheckItem;
        let styleName;

        for(let i = 0; i < 4; i++) {
			vendor = vendors[i];

			for(let a = 0; a < 3; a++) {
				styleCheckItem = styleChecks[a];

				// uppercase first letter of property name, if vendor is present
				styleName = vendor + (vendor ?
										styleCheckItem.charAt(0).toUpperCase() + styleCheckItem.slice(1) :
										styleCheckItem);

				if(!features[styleCheckItem] && styleName in helperStyle ) {
					features[styleCheckItem] = styleName;
				}
			}

			if(vendor && !features.raf) {
				vendor = vendor.toLowerCase();
				features.raf = window[`${vendor}RequestAnimationFrame`];
				if(features.raf) {
					features.caf = window[`${vendor}CancelAnimationFrame`] ||
									window[`${vendor}CancelRequestAnimationFrame`];
				}
			}
		}

        if(!features.raf) {
			let lastTime = 0;
			features.raf = fn => {
				const currTime = new Date().getTime();
				const timeToCall = Math.max(0, 16 - (currTime - lastTime));
				const id = window.setTimeout(() => { fn(currTime + timeToCall); }, timeToCall);
				lastTime = currTime + timeToCall;
				return id;
			};
			features.caf = id => { clearTimeout(id); };
		}

        // Detect SVG support
        features.svg = !!document.createElementNS &&
						!!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;

        helper.features = features;

        return features;
    }
};

helper.detectFeatures();

// Override addEventListener for old versions of IE
if(helper.features.oldIE) {

	helper.bind = (target, type, listener, unbind) => {
        type = type.split(' ');

        const methodName = `${unbind ? 'detach' : 'attach'}Event`;
        let evName;

        const _handleEv = () => {
            listener.handleEvent.call(listener);
        };

        for(let i = 0; i < type.length; i++) {
			evName = type[i];
			if(evName) {

				if(typeof listener === 'object' && listener.handleEvent) {
					if(!unbind) {
						listener[`oldIE${evName}`] = _handleEv;
					} else {
						if(!listener[`oldIE${evName}`]) {
							return false;
						}
					}

					target[methodName]( `on${evName}`, listener[`oldIE${evName}`]);
				} else {
					target[methodName]( `on${evName}`, listener);
				}

			}
		}
    };

}

//function(template, UiClass, items, options)

const self = this;

/**
 * Static vars, don't change unless you know what you're doing.
 */
const DOUBLE_TAP_RADIUS = 25;

const NUM_HOLDERS = 3;

/**
 * Options
 */
const _options = {
  allowPanToNext: true,
  spacing: 0.12,
  bgOpacity: 1,
  mouseUsed: false,
  loop: true,
  pinchToClose: true,
  closeOnScroll: true,
  closeOnVerticalDrag: true,
  verticalDragRange: 0.75,
  hideAnimationDuration: 333,
  showAnimationDuration: 333,
  showHideOpacity: false,
  focus: true,
  escKey: true,
  arrowKeys: true,
  mainScrollEndFriction: 0.35,
  panEndFriction: 0.35,
  isClickableElement(el) {
    return el.tagName === 'A';
  },
  getDoubleTapZoom(isMouseClick, item) {
    if (isMouseClick) {
      return 1;
    } else {
      return item.initialZoomLevel < 0.7 ? 1 : 1.33;
    }
  },
  maxSpreadZoom: 1.33,
  modal: true,

  // not fully implemented yet
  scaleMode: 'fit' // TODO
};
helper.extend(_options, options);


/**
 * Private helper variables & functions
 */

const _getEmptyPoint = () => ({
  x: 0,
  y: 0
});

let _isOpen;
let _isDestroying;
let _closedByScroll;
let _currentItemIndex;
let _containerStyle;
let _containerShiftIndex;
const _currPanDist = _getEmptyPoint();
const _startPanOffset = _getEmptyPoint();
const _panOffset = _getEmptyPoint();

let // drag move, drag end & drag cancel events array
_upMoveEvents;

let // drag start events array
_downEvents;

let _globalEventHandlers;
const _viewportSize = {};
let _currZoomLevel;
let _startZoomLevel;
let _translatePrefix;
let _translateSufix;
let _updateSizeInterval;
let _itemsNeedUpdate;
let _currPositionIndex = 0;
const _offset = {};

const // size of slide area, including spacing
_slideSize = _getEmptyPoint();

let _itemHolders;
let _prevItemIndex;

let // difference of indexes since last content update
_indexDiff = 0;

let _dragStartEvent;
let _dragMoveEvent;
let _dragEndEvent;
let _dragCancelEvent;
let _transformKey;
let _pointerEventEnabled;
let _isFixedPosition = true;
let _likelyTouchDevice;
const _modules = [];
let _requestAF;
let _cancelAF;
let _initalClassName;
let _initalWindowScrollY;
let _oldIE;
let _currentWindowScrollY;
let _features;
const _windowVisibleSize = {};
let _renderMaxResolution = false;

const // Registers PhotoSWipe module (History, Controller ...)
_registerModule = (name, module) => {
  helper.extend(self, module.publicMethods);
  _modules.push(name);
};

const _getLoopedId = index => {
  const numSlides = _getNumItems();
  if (index > numSlides - 1) {
    return index - numSlides;
  } else if (index < 0) {
    return numSlides + index;
  }
  return index;
};

let // Micro bind/trigger
_listeners = {};

const _listen = (name, fn) => {
  if (!_listeners[name]) {
    _listeners[name] = [];
  }
  return _listeners[name].push(fn);
};

const _shout = function(name) {
  const listeners = _listeners[name];

  if (listeners) {
    const args = Array.prototype.slice.call(arguments);
    args.shift();

    for (let i = 0; i < listeners.length; i++) {
      listeners[i].apply(self, args);
    }
  }
};

const _getCurrentTime = () => new Date().getTime();

const _applyBgOpacity = opacity => {
  _bgOpacity = opacity;
  self.bg.style.opacity = opacity * _options.bgOpacity;
};

const _applyZoomTransform = (styleObj, x, y, zoom, item) => {
  if (!_renderMaxResolution || (item && item !== self.currItem)) {
    zoom = zoom / (item ? item.fitRatio : self.currItem.fitRatio);
  }

  styleObj[_transformKey] = `${_translatePrefix + x}px, ${y}px${_translateSufix} scale(${zoom})`;
};

let _applyCurrentZoomPan = allowRenderResolution => {
  if (_currZoomElementStyle) {

    if (allowRenderResolution) {
      if (_currZoomLevel > self.currItem.fitRatio) {
        if (!_renderMaxResolution) {
          _setImageSize(self.currItem, false, true);
          _renderMaxResolution = true;
        }
      } else {
        if (_renderMaxResolution) {
          _setImageSize(self.currItem);
          _renderMaxResolution = false;
        }
      }
    }


    _applyZoomTransform(_currZoomElementStyle, _panOffset.x, _panOffset.y, _currZoomLevel);
  }
};

let _applyZoomPanToItem = item => {
  if (item.container) {

    _applyZoomTransform(item.container.style,
      item.initialPosition.x,
      item.initialPosition.y,
      item.initialZoomLevel,
      item);
  }
};

let _setTranslateX = (x, elStyle) => {
  elStyle[_transformKey] = `${_translatePrefix + x}px, 0px${_translateSufix}`;
};

const _moveMainScroll = (x, dragging) => {

  if (!_options.loop && dragging) {
    const newSlideIndexOffset = _currentItemIndex + (_slideSize.x * _currPositionIndex - x) / _slideSize.x;
    const delta = Math.round(x - _mainScrollPos.x);

    if ((newSlideIndexOffset < 0 && delta > 0) ||
      (newSlideIndexOffset >= _getNumItems() - 1 && delta < 0)) {
      x = _mainScrollPos.x + delta * _options.mainScrollEndFriction;
    }
  }

  _mainScrollPos.x = x;
  _setTranslateX(x, _containerStyle);
};

const _calculatePanOffset = (axis, zoomLevel) => {
  const m = _midZoomPoint[axis] - _offset[axis];
  return _startPanOffset[axis] + _currPanDist[axis] + m - m * (zoomLevel / _startZoomLevel);
};

const _equalizePoints = (p1, p2) => {
  p1.x = p2.x;
  p1.y = p2.y;
  if (p2.id) {
    p1.id = p2.id;
  }
};

const _roundPoint = p => {
  p.x = Math.round(p.x);
  p.y = Math.round(p.y);
};

let _mouseMoveTimeout = null;

const _onFirstMouseMove = () => {
  // Wait until mouse move event is fired at least twice during 100ms
  // We do this, because some mobile browsers trigger it on touchstart
  if (_mouseMoveTimeout) {
    helper.unbind(document, 'mousemove', _onFirstMouseMove);
    helper.addClass(template, 'zvui-pinch--has_mouse');
    _options.mouseUsed = true;
    _shout('mouseUsed');
  }
  _mouseMoveTimeout = setTimeout(() => {
    _mouseMoveTimeout = null;
  }, 100);
};

const _bindEvents = () => {
  helper.bind(document, 'keydown', self);

  if (_features.transform) {
    // don't bind click event in browsers that don't support transform (mostly IE8)
    helper.bind(self.scrollWrap, 'click', self);
  }


  if (!_options.mouseUsed) {
    helper.bind(document, 'mousemove', _onFirstMouseMove);
  }

  helper.bind(window, 'resize scroll', self);

  _shout('bindEvents');
};

const _unbindEvents = () => {
  helper.unbind(window, 'resize', self);
  helper.unbind(window, 'scroll', _globalEventHandlers.scroll);
  helper.unbind(document, 'keydown', self);
  helper.unbind(document, 'mousemove', _onFirstMouseMove);

  if (_features.transform) {
    helper.unbind(self.scrollWrap, 'click', self);
  }

  if (_isDragging) {
    helper.unbind(window, _upMoveEvents, self);
  }

  _shout('unbindEvents');
};

const _calculatePanBounds = (zoomLevel, update) => {
  const bounds = _calculateItemSize(self.currItem, _viewportSize, zoomLevel);
  if (update) {
    _currPanBounds = bounds;
  }
  return bounds;
};

const _getMinZoomLevel = item => {
  if (!item) {
    item = self.currItem;
  }
  return item.initialZoomLevel;
};

const _getMaxZoomLevel = item => {
  if (!item) {
    item = self.currItem;
  }
  return item.w > 0 ? _options.maxSpreadZoom : 1;
};

const // Return true if offset is out of the bounds
_modifyDestPanOffset = (axis, destPanBounds, destPanOffset, destZoomLevel) => {
  if (destZoomLevel === self.currItem.initialZoomLevel) {
    destPanOffset[axis] = self.currItem.initialPosition[axis];
    return true;
  } else {
    destPanOffset[axis] = _calculatePanOffset(axis, destZoomLevel);

    if (destPanOffset[axis] > destPanBounds.min[axis]) {
      destPanOffset[axis] = destPanBounds.min[axis];
      return true;
    } else if (destPanOffset[axis] < destPanBounds.max[axis]) {
      destPanOffset[axis] = destPanBounds.max[axis];
      return true;
    }
  }
  return false;
};

const _setupTransforms = () => {

  if (_transformKey) {
    // setup 3d transforms
    const allow3dTransform = _features.perspective && !_likelyTouchDevice;
    _translatePrefix = `translate${allow3dTransform ? '3d(' : '('}`;
    _translateSufix = _features.perspective ? ', 0px)' : ')';
    return;
  }

  // Override zoom/pan/move functions in case old browser is used (most likely IE)
  // (so they use left/top/width/height, instead of CSS transform)

  _transformKey = 'left';
  helper.addClass(template, 'zvui-pinch--ie');

  _setTranslateX = (x, elStyle) => {
    elStyle.left = `${x}px`;
  };
  _applyZoomPanToItem = item => {
    const zoomRatio = item.fitRatio > 1 ? 1 : item.fitRatio;
    const s = item.container.style;
    const w = zoomRatio * item.w;
    const h = zoomRatio * item.h;

    s.width = `${w}px`;
    s.height = `${h}px`;
    s.left = `${item.initialPosition.x}px`;
    s.top = `${item.initialPosition.y}px`;
  };
  _applyCurrentZoomPan = () => {
    if (_currZoomElementStyle) {
      const s = _currZoomElementStyle;
      const item = self.currItem;
      const zoomRatio = item.fitRatio > 1 ? 1 : item.fitRatio;
      const w = zoomRatio * item.w;
      const h = zoomRatio * item.h;

      s.width = `${w}px`;
      s.height = `${h}px`;


      s.left = `${_panOffset.x}px`;
      s.top = `${_panOffset.y}px`;
    }

  };
};

const _onKeyDown = e => {
  let keydownAction = '';
  if (_options.escKey && e.keyCode === 27) {
    keydownAction = 'close';
  } else if (_options.arrowKeys) {
    if (e.keyCode === 37) {
      keydownAction = 'prev';
    } else if (e.keyCode === 39) {
      keydownAction = 'next';
    }
  }

  if (keydownAction) {
    // don't do anything if special key pressed to prevent from overriding default browser actions
    // e.g. in Chrome on Mac cmd+arrow-left returns to previous page
    if (!e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey) {
      if (e.preventDefault) {
        e.preventDefault();
      } else {
        e.returnValue = false;
      }
      self[keydownAction]();
    }
  }
};

const _onGlobalClick = e => {
  if (!e) {
    return;
  }

  // don't allow click event to pass through when triggering after drag or some other gesture
  if (_moved || _zoomStarted || _mainScrollAnimating || _verticalDragInitiated) {
    e.preventDefault();
    e.stopPropagation();
  }
};

const _updatePageScrollOffset = () => {
  self.setScrollOffset(0, helper.getScrollY());
};

// Micro animation engine
const _animations = {};

let _numAnimations = 0;

const _stopAnimation = name => {
  if (_animations[name]) {
    if (_animations[name].raf) {
      _cancelAF(_animations[name].raf);
    }
    _numAnimations--;
    delete _animations[name];
  }
};

const _registerStartAnimation = name => {
  if (_animations[name]) {
    _stopAnimation(name);
  }
  if (!_animations[name]) {
    _numAnimations++;
    _animations[name] = {};
  }
};

const _stopAllAnimations = () => {
  for (const prop in _animations) {

    if (_animations.hasOwnProperty(prop)) {
      _stopAnimation(prop);
    }

  }
};

const _animateProp = (name, b, endProp, d, easingFn, onUpdate, onComplete) => {
  const startAnimTime = _getCurrentTime();
  let t;
  _registerStartAnimation(name);

  const animloop = () => {
    if (_animations[name]) {

      t = _getCurrentTime() - startAnimTime; // time diff
      //b - beginning (start prop)
      //d - anim duration

      if (t >= d) {
        _stopAnimation(name);
        onUpdate(endProp);
        if (onComplete) {
          onComplete();
        }
        return;
      }
      onUpdate((endProp - b) * easingFn(t / d) + b);

      _animations[name].raf = _requestAF(animloop);
    }
  };
  animloop();
};



const publicMethods = {

  // make a few local variables and functions public
  shout: _shout,
  listen: _listen,
  viewportSize: _viewportSize,
  options: _options,

  isMainScrollAnimating() {
    return _mainScrollAnimating;
  },
  getZoomLevel() {
    return _currZoomLevel;
  },
  getCurrentIndex() {
    return _currentItemIndex;
  },
  isDragging() {
    return _isDragging;
  },
  isZooming() {
    return _isZooming;
  },
  setScrollOffset(x, y) {
    _offset.x = x;
    _currentWindowScrollY = _offset.y = y;
    _shout('updateScrollOffset', _offset);
  },
  applyZoomPan(zoomLevel, panX, panY, allowRenderResolution) {
    _panOffset.x = panX;
    _panOffset.y = panY;
    _currZoomLevel = zoomLevel;
    _applyCurrentZoomPan(allowRenderResolution);
  },

  init() {

    if (_isOpen || _isDestroying) {
      return;
    }

    let i;

    self.helper = helper; // basic functionality
    self.template = template; // root DOM element of PhotoSwipe
    self.bg = helper.getChildByClass(template, 'zvui-pinch__bg');

    _initalClassName = template.className;
    _isOpen = true;

    _features = helper.detectFeatures();
    _requestAF = _features.raf;
    _cancelAF = _features.caf;
    _transformKey = _features.transform;
    _oldIE = _features.oldIE;

    self.scrollWrap = helper.getChildByClass(template, 'zvui-pinch__scroll-wrap');
    self.container = helper.getChildByClass(self.scrollWrap, 'zvui-pinch__container');

    _containerStyle = self.container.style; // for fast access

    // Objects that hold slides (there are only 3 in DOM)
    self.itemHolders = _itemHolders = [{
      el: self.container.children[0],
      wrap: 0,
      index: -1
    }, {
      el: self.container.children[1],
      wrap: 0,
      index: -1
    }, {
      el: self.container.children[2],
      wrap: 0,
      index: -1
    }];

    // hide nearby item holders until initial zoom animation finishes (to avoid extra Paints)
    _itemHolders[0].el.style.display = _itemHolders[2].el.style.display = 'none';

    _setupTransforms();

    // Setup global events
    _globalEventHandlers = {
      resize: self.updateSize,
      scroll: _updatePageScrollOffset,
      keydown: _onKeyDown,
      click: _onGlobalClick
    };

    // disable show/hide effects on old browsers that don't support CSS animations or transforms,
    // old IOS, Android and Opera mobile. Blackberry seems to work fine, even older models.
    const oldPhone = _features.isOldIOSPhone || _features.isOldAndroid || _features.isMobileOpera;
    if (!_features.animationName || !_features.transform || oldPhone) {
      _options.showAnimationDuration = _options.hideAnimationDuration = 0;
    }

    // init modules
    for (i = 0; i < _modules.length; i++) {
      self[`init${_modules[i]}`]();
    }

    // init
    if (UiClass) {
      const ui = self.ui = new UiClass(self, helper);
      ui.init();
    }

    _shout('firstUpdate');
    _currentItemIndex = _currentItemIndex || _options.index || 0;
    // validate index
    if (isNaN(_currentItemIndex) || _currentItemIndex < 0 || _currentItemIndex >= _getNumItems()) {
      _currentItemIndex = 0;
    }
    self.currItem = _getItemAt(_currentItemIndex);


    if (_features.isOldIOSPhone || _features.isOldAndroid) {
      _isFixedPosition = false;
    }

    template.setAttribute('aria-hidden', 'false');
    if (_options.modal) {
      if (!_isFixedPosition) {
        template.style.position = 'absolute';
        template.style.top = `${helper.getScrollY()}px`;
      } else {
        template.style.position = 'fixed';
      }
    }

    if (_currentWindowScrollY === undefined) {
      _shout('initialLayout');
      _currentWindowScrollY = _initalWindowScrollY = helper.getScrollY();
    }

    // add classes to root element of PhotoSwipe
    let rootClasses = 'zvui-pinch--open ';
    if (_options.mainClass) {
      rootClasses += `${_options.mainClass} `;
    }
    if (_options.showHideOpacity) {
      rootClasses += 'zvui-pinch--animate_opacity ';
    }
    rootClasses += _likelyTouchDevice ? 'zvui-pinch--touch' : 'zvui-pinch--notouch';
    rootClasses += _features.animationName ? ' zvui-pinch--css_animation' : '';
    rootClasses += _features.svg ? ' zvui-pinch--svg' : '';
    helper.addClass(template, rootClasses);

    self.updateSize();

    // initial update
    _containerShiftIndex = -1;
    _indexDiff = null;
    for (i = 0; i < NUM_HOLDERS; i++) {
      _setTranslateX((i + _containerShiftIndex) * _slideSize.x, _itemHolders[i].el.style);
    }

    if (!_oldIE) {
      helper.bind(self.scrollWrap, _downEvents, self); // no dragging for old IE
    }

    _listen('initialZoomInEnd', () => {
      self.setContent(_itemHolders[0], _currentItemIndex - 1);
      self.setContent(_itemHolders[2], _currentItemIndex + 1);

      _itemHolders[0].el.style.display = _itemHolders[2].el.style.display = 'block';

      if (_options.focus) {
        // focus causes layout,
        // which causes lag during the animation,
        // that's why we delay it untill the initial zoom transition ends
        template.focus();
      }


      _bindEvents();
    });

    // set content for center slide (first time)
    self.setContent(_itemHolders[1], _currentItemIndex);

    self.updateCurrItem();

    _shout('afterInit');

    if (!_isFixedPosition) {

      // On all versions of iOS lower than 8.0, we check size of viewport every second.
      //
      // This is done to detect when Safari top & bottom bars appear,
      // as this action doesn't trigger any events (like resize).
      //
      // On iOS8 they fixed this.
      //
      // 10 Nov 2014: iOS 7 usage ~40%. iOS 8 usage 56%.

      _updateSizeInterval = setInterval(() => {
        if (!_numAnimations && !_isDragging && !_isZooming && (_currZoomLevel === self.currItem.initialZoomLevel)) {
          self.updateSize();
        }
      }, 1000);
    }

    helper.addClass(template, 'zvui-pinch--visible');
  },

  // Close the gallery, then destroy it
  close() {
    if (!_isOpen) {
      return;
    }

    _isOpen = false;
    _isDestroying = true;
    _shout('close');
    _unbindEvents();

    _showOrHide(self.currItem, null, true, self.destroy);
  },

  // destroys the gallery (unbinds events, cleans up intervals and timeouts to avoid memory leaks)
  destroy() {
    _shout('destroy');

    if (_showOrHideTimeout) {
      clearTimeout(_showOrHideTimeout);
    }

    template.setAttribute('aria-hidden', 'true');
    template.className = _initalClassName;

    if (_updateSizeInterval) {
      clearInterval(_updateSizeInterval);
    }

    helper.unbind(self.scrollWrap, _downEvents, self);

    // we unbind scroll event at the end, as closing animation may depend on it
    helper.unbind(window, 'scroll', self);

    _stopDragUpdateLoop();

    _stopAllAnimations();

    _listeners = null;
  },

  /**
   * Pan image to position
   * @param {Number} x
   * @param {Number} y
   * @param {Boolean} force Will ignore bounds if set to true.
   */
  panTo(x, y, force) {
    if (!force) {
      if (x > _currPanBounds.min.x) {
        x = _currPanBounds.min.x;
      } else if (x < _currPanBounds.max.x) {
        x = _currPanBounds.max.x;
      }

      if (y > _currPanBounds.min.y) {
        y = _currPanBounds.min.y;
      } else if (y < _currPanBounds.max.y) {
        y = _currPanBounds.max.y;
      }
    }

    _panOffset.x = x;
    _panOffset.y = y;
    _applyCurrentZoomPan();
  },

  handleEvent(e=window.event) {
    if (_globalEventHandlers[e.type]) {
      _globalEventHandlers[e.type](e);
    }
  },


  goTo(index) {

    index = _getLoopedId(index);

    const diff = index - _currentItemIndex;
    _indexDiff = diff;

    _currentItemIndex = index;
    self.currItem = _getItemAt(_currentItemIndex);
    _currPositionIndex -= diff;

    _moveMainScroll(_slideSize.x * _currPositionIndex);


    _stopAllAnimations();
    _mainScrollAnimating = false;

    self.updateCurrItem();
  },
  next() {
    self.goTo(_currentItemIndex + 1);
  },
  prev() {
    self.goTo(_currentItemIndex - 1);
  },

  // update current zoom/pan objects
  updateCurrZoomItem(emulateSetContent) {
    if (emulateSetContent) {
      _shout('beforeChange', 0);
    }

    // itemHolder[1] is middle (current) item
    if (_itemHolders[1].el.children.length) {
      const zoomElement = _itemHolders[1].el.children[0];
      if (helper.hasClass(zoomElement, 'zvui-pinch__zoom-wrap')) {
        _currZoomElementStyle = zoomElement.style;
      } else {
        _currZoomElementStyle = null;
      }
    } else {
      _currZoomElementStyle = null;
    }

    _currPanBounds = self.currItem.bounds;
    _startZoomLevel = _currZoomLevel = self.currItem.initialZoomLevel;

    _panOffset.x = _currPanBounds.center.x;
    _panOffset.y = _currPanBounds.center.y;

    if (emulateSetContent) {
      _shout('afterChange');
    }
  },


  invalidateCurrItems() {
    _itemsNeedUpdate = true;
    for (let i = 0; i < NUM_HOLDERS; i++) {
      if (_itemHolders[i].item) {
        _itemHolders[i].item.needsUpdate = true;
      }
    }
  },

  updateCurrItem(beforeAnimation) {
    if (_indexDiff === 0) {
      return;
    }

    let diffAbs = Math.abs(_indexDiff);
    let tempHolder;

    if (beforeAnimation && diffAbs < 2) {
      return;
    }


    self.currItem = _getItemAt(_currentItemIndex);
    _renderMaxResolution = false;

    _shout('beforeChange', _indexDiff);

    if (diffAbs >= NUM_HOLDERS) {
      _containerShiftIndex += _indexDiff + (_indexDiff > 0 ? -NUM_HOLDERS : NUM_HOLDERS);
      diffAbs = NUM_HOLDERS;
    }
    for (let i = 0; i < diffAbs; i++) {
      if (_indexDiff > 0) {
        tempHolder = _itemHolders.shift();
        _itemHolders[NUM_HOLDERS - 1] = tempHolder; // move first to last

        _containerShiftIndex++;
        _setTranslateX((_containerShiftIndex + 2) * _slideSize.x, tempHolder.el.style);
        self.setContent(tempHolder, _currentItemIndex - diffAbs + i + 1 + 1);
      } else {
        tempHolder = _itemHolders.pop();
        _itemHolders.unshift(tempHolder); // move last to first

        _containerShiftIndex--;
        _setTranslateX(_containerShiftIndex * _slideSize.x, tempHolder.el.style);
        self.setContent(tempHolder, _currentItemIndex + diffAbs - i - 1 - 1);
      }

    }

    // reset zoom/pan on previous item
    if (_currZoomElementStyle && Math.abs(_indexDiff) === 1) {

      const prevItem = _getItemAt(_prevItemIndex);
      if (prevItem.initialZoomLevel !== _currZoomLevel) {
        _calculateItemSize(prevItem, _viewportSize);
        _setImageSize(prevItem);
        _applyZoomPanToItem(prevItem);
      }

    }

    // reset diff after update
    _indexDiff = 0;

    self.updateCurrZoomItem();

    _prevItemIndex = _currentItemIndex;

    _shout('afterChange');
  },



  updateSize(force) {

    if (!_isFixedPosition && _options.modal) {
      const windowScrollY = helper.getScrollY();
      if (_currentWindowScrollY !== windowScrollY) {
        template.style.top = `${windowScrollY}px`;
        _currentWindowScrollY = windowScrollY;
      }
      if (!force && _windowVisibleSize.x === window.innerWidth && _windowVisibleSize.y === window.innerHeight) {
        return;
      }
      _windowVisibleSize.x = window.innerWidth;
      _windowVisibleSize.y = window.innerHeight;

      //template.style.width = _windowVisibleSize.x + 'px';
      template.style.height = `${_windowVisibleSize.y}px`;
    }



    _viewportSize.x = self.scrollWrap.clientWidth;
    _viewportSize.y = self.scrollWrap.clientHeight;

    _updatePageScrollOffset();

    _slideSize.x = _viewportSize.x + Math.round(_viewportSize.x * _options.spacing);
    _slideSize.y = _viewportSize.y;

    _moveMainScroll(_slideSize.x * _currPositionIndex);

    _shout('beforeResize'); // even may be used for example to switch image sources


    // don't re-calculate size on inital size update
    if (_containerShiftIndex !== undefined) {
      let holder;
      let item;
      let hIndex;

      for (let i = 0; i < NUM_HOLDERS; i++) {
        holder = _itemHolders[i];
        _setTranslateX((i + _containerShiftIndex) * _slideSize.x, holder.el.style);

        hIndex = _currentItemIndex + i - 1;

        if (_options.loop && _getNumItems() > 2) {
          hIndex = _getLoopedId(hIndex);
        }

        // update zoom level on items and refresh source (if needsUpdate)
        item = _getItemAt(hIndex);

        // re-render gallery item if `needsUpdate`,
        // or doesn't have `bounds` (entirely new slide object)
        if (item && (_itemsNeedUpdate || item.needsUpdate || !item.bounds)) {

          self.cleanSlide(item);

          self.setContent(holder, hIndex);

          // if "center" slide
          if (i === 1) {
            self.currItem = item;
            self.updateCurrZoomItem(true);
          }

          item.needsUpdate = false;

        } else if (holder.index === -1 && hIndex >= 0) {
          // add content first time
          self.setContent(holder, hIndex);
        }
        if (item && item.container) {
          _calculateItemSize(item, _viewportSize);
          _setImageSize(item);
          _applyZoomPanToItem(item);
        }

      }
      _itemsNeedUpdate = false;
    }

    _startZoomLevel = _currZoomLevel = self.currItem.initialZoomLevel;
    _currPanBounds = self.currItem.bounds;

    if (_currPanBounds) {
      _panOffset.x = _currPanBounds.center.x;
      _panOffset.y = _currPanBounds.center.y;
      _applyCurrentZoomPan(true);
    }

    _shout('resize');
  },

  // Zoom current item to
  zoomTo(destZoomLevel, centerPoint, speed, easingFn, updateFn) {
    /*
    	if(destZoomLevel === 'fit') {
    		destZoomLevel = self.currItem.fitRatio;
    	} else if(destZoomLevel === 'fill') {
    		destZoomLevel = self.currItem.fillRatio;
    	}
    */

    if (centerPoint) {
      _startZoomLevel = _currZoomLevel;
      _midZoomPoint.x = Math.abs(centerPoint.x) - _panOffset.x;
      _midZoomPoint.y = Math.abs(centerPoint.y) - _panOffset.y;
      _equalizePoints(_startPanOffset, _panOffset);
    }

    const destPanBounds = _calculatePanBounds(destZoomLevel, false);
    const destPanOffset = {};

    _modifyDestPanOffset('x', destPanBounds, destPanOffset, destZoomLevel);
    _modifyDestPanOffset('y', destPanBounds, destPanOffset, destZoomLevel);

    const initialZoomLevel = _currZoomLevel;
    const initialPanOffset = {
      x: _panOffset.x,
      y: _panOffset.y
    };

    _roundPoint(destPanOffset);

    const onUpdate = now => {
      if (now === 1) {
        _currZoomLevel = destZoomLevel;
        _panOffset.x = destPanOffset.x;
        _panOffset.y = destPanOffset.y;
      } else {
        _currZoomLevel = (destZoomLevel - initialZoomLevel) * now + initialZoomLevel;
        _panOffset.x = (destPanOffset.x - initialPanOffset.x) * now + initialPanOffset.x;
        _panOffset.y = (destPanOffset.y - initialPanOffset.y) * now + initialPanOffset.y;
      }

      if (updateFn) {
        updateFn(now);
      }

      _applyCurrentZoomPan(now === 1);
    };

    if (speed) {
      _animateProp('customZoomTo', 0, 1, speed, easingFn || helper.easing.sine.inOut, onUpdate);
    } else {
      onUpdate(1);
    }
  }


};

/**
 * Mouse/touch/pointer event handlers.
 *
 * separated from @core.js for readability
 */

const MIN_SWIPE_DISTANCE = 30; // amount of pixels to drag to determine direction of swipe

const DIRECTION_CHECK_OFFSET = 10;
let _gestureStartTime;
let _gestureCheckSpeedTime;

const // pool of objects that are used during dragging of zooming
// first point
p = {};

const // second point (for zoom gesture)
p2 = {};

const delta = {};
const _currPoint = {};
const _startPoint = {};
const _currPointers = [];
const _startMainScrollPos = {};
let _releaseAnimData;

let // array of points during dragging, used to determine type of gesture
_posPoints = [];

const _tempPoint = {};
let _isZoomingIn;
let _verticalDragInitiated;
let _oldAndroidTouchEndTimeout;
let _currZoomedItemIndex = 0;
const _centerPoint = _getEmptyPoint();
let _lastReleaseTime = 0;

let // at least one pointer is down
_isDragging;

let // at least two _pointers are down
_isMultitouch;

let // zoom level changed during zoom gesture
_zoomStarted;

let _moved;
let _dragAnimFrame;
let _mainScrollShifted;

let // array of current touch points
_currentPoints;

let _isZooming;
let _currPointsDistance;
let _startPointsDistance;
let _currPanBounds;
const _mainScrollPos = _getEmptyPoint();
let _currZoomElementStyle;

let // true, if animation after swipe gesture is running
_mainScrollAnimating;

const _midZoomPoint = _getEmptyPoint();
const _currCenterPoint = _getEmptyPoint();
let _direction;
let _isFirstMove;
let _opacityChanged;
let _bgOpacity;
let _wasOverInitialZoom;
const _isEqualPoints = (p1, p2) => p1.x === p2.x && p1.y === p2.y;
const _isNearbyPoints = (touch0, touch1) => Math.abs(touch0.x - touch1.x) < DOUBLE_TAP_RADIUS && Math.abs(touch0.y - touch1.y) < DOUBLE_TAP_RADIUS;

const _calculatePointsDistance = (p1, p2) => {
  _tempPoint.x = Math.abs(p1.x - p2.x);
  _tempPoint.y = Math.abs(p1.y - p2.y);
  return Math.sqrt(_tempPoint.x * _tempPoint.x + _tempPoint.y * _tempPoint.y);
};

const _stopDragUpdateLoop = () => {
  if (_dragAnimFrame) {
    _cancelAF(_dragAnimFrame);
    _dragAnimFrame = null;
  }
};

const _dragUpdateLoop = () => {
  if (_isDragging) {
    _dragAnimFrame = _requestAF(_dragUpdateLoop);
    _renderMovement();
  }
};

const _canPan = () => !(_options.scaleMode === 'fit' && _currZoomLevel === self.currItem.initialZoomLevel);

const // find the closest parent DOM element
_closestElement = (el, fn) => {
  if (!el || el === document) {
    return false;
  }

  // don't search elements above zvui-pinch__scroll-wrap
  if (el.getAttribute('class') && el.getAttribute('class').includes('zvui-pinch__scroll-wrap')) {
    return false;
  }

  if (fn(el)) {
    return el;
  }

  return _closestElement(el.parentNode, fn);
};

const _preventObj = {};

const _preventDefaultEventBehaviour = (e, isDown) => {
  _preventObj.prevent = !_closestElement(e.target, _options.isClickableElement);

  _shout('preventDragEvent', e, isDown, _preventObj);
  return _preventObj.prevent;

};

const _convertTouchToPoint = (touch, p) => {
  p.x = touch.pageX;
  p.y = touch.pageY;
  p.id = touch.identifier;
  return p;
};

const _findCenterOfPoints = (p1, p2, pCenter) => {
  pCenter.x = (p1.x + p2.x) * 0.5;
  pCenter.y = (p1.y + p2.y) * 0.5;
};

const _pushPosPoint = (time, x, y) => {
  if (time - _gestureCheckSpeedTime > 50) {
    const o = _posPoints.length > 2 ? _posPoints.shift() : {};
    o.x = x;
    o.y = y;
    _posPoints.push(o);
    _gestureCheckSpeedTime = time;
  }
};

const _calculateVerticalDragOpacityRatio = () => {
  const yOffset = _panOffset.y - self.currItem.initialPosition.y; // difference between initial and current position
  return 1 - Math.abs(yOffset / (_viewportSize.y / 2));
};

const // points pool, reused during touch events
_ePoint1 = {};

const _ePoint2 = {};
const _tempPointsArr = [];
let _tempCounter;

const _getTouchPoints = e => {
  // clean up previous points, without recreating array
  while (_tempPointsArr.length > 0) {
    _tempPointsArr.pop();
  }

  if (!_pointerEventEnabled) {
    if (e.type.includes('touch')) {

      if (e.touches && e.touches.length > 0) {
        _tempPointsArr[0] = _convertTouchToPoint(e.touches[0], _ePoint1);
        if (e.touches.length > 1) {
          _tempPointsArr[1] = _convertTouchToPoint(e.touches[1], _ePoint2);
        }
      }

    } else {
      _ePoint1.x = e.pageX;
      _ePoint1.y = e.pageY;
      _ePoint1.id = '';
      _tempPointsArr[0] = _ePoint1; //_ePoint1;
    }
  } else {
    _tempCounter = 0;
    // we can use forEach, as pointer events are supported only in modern browsers
    _currPointers.forEach(p => {
      if (_tempCounter === 0) {
        _tempPointsArr[0] = p;
      } else if (_tempCounter === 1) {
        _tempPointsArr[1] = p;
      }
      _tempCounter++;

    });
  }
  return _tempPointsArr;
};

const _panOrMoveMainScroll = (axis, delta) => {
  let panFriction;
  let overDiff = 0;
  let newOffset = _panOffset[axis] + delta[axis];
  let startOverDiff;
  const dir = delta[axis] > 0;
  const newMainScrollPosition = _mainScrollPos.x + delta.x;
  const mainScrollDiff = _mainScrollPos.x - _startMainScrollPos.x;
  let newPanPos;
  let newMainScrollPos;

  // calculate fdistance over the bounds and friction
  if (newOffset > _currPanBounds.min[axis] || newOffset < _currPanBounds.max[axis]) {
    panFriction = _options.panEndFriction;
    // Linear increasing of friction, so at 1/4 of viewport it's at max value.
    // Looks not as nice as was expected. Left for history.
    // panFriction = (1 - (_panOffset[axis] + delta[axis] + panBounds.min[axis]) / (_viewportSize[axis] / 4) );
  } else {
    panFriction = 1;
  }

  newOffset = _panOffset[axis] + delta[axis] * panFriction;

  // move main scroll or start panning
  if (_options.allowPanToNext || _currZoomLevel === self.currItem.initialZoomLevel) {


    if (!_currZoomElementStyle) {

      newMainScrollPos = newMainScrollPosition;

    } else if (_direction === 'h' && axis === 'x' && !_zoomStarted) {

      if (dir) {
        if (newOffset > _currPanBounds.min[axis]) {
          panFriction = _options.panEndFriction;
          overDiff = _currPanBounds.min[axis] - newOffset;
          startOverDiff = _currPanBounds.min[axis] - _startPanOffset[axis];
        }

        // drag right
        if ((startOverDiff <= 0 || mainScrollDiff < 0) && _getNumItems() > 1) {
          newMainScrollPos = newMainScrollPosition;
          if (mainScrollDiff < 0 && newMainScrollPosition > _startMainScrollPos.x) {
            newMainScrollPos = _startMainScrollPos.x;
          }
        } else {
          if (_currPanBounds.min.x !== _currPanBounds.max.x) {
            newPanPos = newOffset;
          }

        }

      } else {

        if (newOffset < _currPanBounds.max[axis]) {
          panFriction = _options.panEndFriction;
          overDiff = newOffset - _currPanBounds.max[axis];
          startOverDiff = _startPanOffset[axis] - _currPanBounds.max[axis];
        }

        if ((startOverDiff <= 0 || mainScrollDiff > 0) && _getNumItems() > 1) {
          newMainScrollPos = newMainScrollPosition;

          if (mainScrollDiff > 0 && newMainScrollPosition < _startMainScrollPos.x) {
            newMainScrollPos = _startMainScrollPos.x;
          }

        } else {
          if (_currPanBounds.min.x !== _currPanBounds.max.x) {
            newPanPos = newOffset;
          }
        }

      }


      //
    }

    if (axis === 'x') {

      if (newMainScrollPos !== undefined) {
        _moveMainScroll(newMainScrollPos, true);
        if (newMainScrollPos === _startMainScrollPos.x) {
          _mainScrollShifted = false;
        } else {
          _mainScrollShifted = true;
        }
      }

      if (_currPanBounds.min.x !== _currPanBounds.max.x) {
        if (newPanPos !== undefined) {
          _panOffset.x = newPanPos;
        } else if (!_mainScrollShifted) {
          _panOffset.x += delta.x * panFriction;
        }
      }

      return newMainScrollPos !== undefined;
    }

  }

  if (!_mainScrollAnimating) {

    if (!_mainScrollShifted) {
      if (_currZoomLevel > self.currItem.fitRatio) {
        _panOffset[axis] += delta[axis] * panFriction;

      }
    }


  }
};

const // Pointerdown/touchstart/mousedown handler
_onDragStart = e => {
  // Allow dragging only via left mouse button.
  // As this handler is not added in IE8 - we ignore e.which
  //
  // http://www.quirksmode.org/js/events_properties.html
  // https://developer.mozilla.org/en-US/docs/Web/API/event.button
  if (e.type === 'mousedown' && e.button > 0) {
    return;
  }

  if (_initialZoomRunning) {
    e.preventDefault();
    return;
  }

  if (_oldAndroidTouchEndTimeout && e.type === 'mousedown') {
    return;
  }

  if (_preventDefaultEventBehaviour(e, true)) {
    e.preventDefault();
  }



  _shout('pointerDown');

  if (_pointerEventEnabled) {
    let pointerIndex = helper.arraySearch(_currPointers, e.pointerId, 'id');
    if (pointerIndex < 0) {
      pointerIndex = _currPointers.length;
    }
    _currPointers[pointerIndex] = {
      x: e.pageX,
      y: e.pageY,
      id: e.pointerId
    };
  }



  const startPointsList = _getTouchPoints(e);
  const numPoints = startPointsList.length;

  _currentPoints = null;

  _stopAllAnimations();

  // init drag
  if (!_isDragging || numPoints === 1) {



    _isDragging = _isFirstMove = true;
    helper.bind(window, _upMoveEvents, self);

    _isZoomingIn =
      _wasOverInitialZoom =
      _opacityChanged =
      _verticalDragInitiated =
      _mainScrollShifted =
      _moved =
      _isMultitouch =
      _zoomStarted = false;

    _direction = null;

    _shout('firstTouchStart', startPointsList);

    _equalizePoints(_startPanOffset, _panOffset);

    _currPanDist.x = _currPanDist.y = 0;
    _equalizePoints(_currPoint, startPointsList[0]);
    _equalizePoints(_startPoint, _currPoint);

    //_equalizePoints(_startMainScrollPos, _mainScrollPos);
    _startMainScrollPos.x = _slideSize.x * _currPositionIndex;

    _posPoints = [{
      x: _currPoint.x,
      y: _currPoint.y
    }];

    _gestureCheckSpeedTime = _gestureStartTime = _getCurrentTime();

    //_mainScrollAnimationEnd(true);
    _calculatePanBounds(_currZoomLevel, true);

    // Start rendering
    _stopDragUpdateLoop();
    _dragUpdateLoop();

  }

  // init zoom
  if (!_isZooming && numPoints > 1 && !_mainScrollAnimating && !_mainScrollShifted) {
    _startZoomLevel = _currZoomLevel;
    _zoomStarted = false; // true if zoom changed at least once

    _isZooming = _isMultitouch = true;
    _currPanDist.y = _currPanDist.x = 0;

    _equalizePoints(_startPanOffset, _panOffset);

    _equalizePoints(p, startPointsList[0]);
    _equalizePoints(p2, startPointsList[1]);

    _findCenterOfPoints(p, p2, _currCenterPoint);

    _midZoomPoint.x = Math.abs(_currCenterPoint.x) - _panOffset.x;
    _midZoomPoint.y = Math.abs(_currCenterPoint.y) - _panOffset.y;
    _currPointsDistance = _startPointsDistance = _calculatePointsDistance(p, p2);
  }
};

const // Pointermove/touchmove/mousemove handler
_onDragMove = e => {

  e.preventDefault();

  if (_pointerEventEnabled) {
    const pointerIndex = helper.arraySearch(_currPointers, e.pointerId, 'id');
    if (pointerIndex > -1) {
      const p = _currPointers[pointerIndex];
      p.x = e.pageX;
      p.y = e.pageY;
    }
  }

  if (_isDragging) {
    const touchesList = _getTouchPoints(e);
    if (!_direction && !_moved && !_isZooming) {

      if (_mainScrollPos.x !== _slideSize.x * _currPositionIndex) {
        // if main scroll position is shifted – direction is always horizontal
        _direction = 'h';
      } else {
        const diff = Math.abs(touchesList[0].x - _currPoint.x) - Math.abs(touchesList[0].y - _currPoint.y);
        // check the direction of movement
        if (Math.abs(diff) >= DIRECTION_CHECK_OFFSET) {
          _direction = diff > 0 ? 'h' : 'v';
          _currentPoints = touchesList;
        }
      }

    } else {
      _currentPoints = touchesList;
    }
  }
};

const //
_renderMovement = () => {

  if (!_currentPoints) {
    return;
  }

  const numPoints = _currentPoints.length;

  if (numPoints === 0) {
    return;
  }

  _equalizePoints(p, _currentPoints[0]);

  delta.x = p.x - _currPoint.x;
  delta.y = p.y - _currPoint.y;

  if (_isZooming && numPoints > 1) {
    // Handle behaviour for more than 1 point

    _currPoint.x = p.x;
    _currPoint.y = p.y;

    // check if one of two points changed
    if (!delta.x && !delta.y && _isEqualPoints(_currentPoints[1], p2)) {
      return;
    }

    _equalizePoints(p2, _currentPoints[1]);


    if (!_zoomStarted) {
      _zoomStarted = true;
      _shout('zoomGestureStarted');
    }

    // Distance between two points
    const pointsDistance = _calculatePointsDistance(p, p2);

    let zoomLevel = _calculateZoomLevel(pointsDistance);

    // slightly over the of initial zoom level
    if (zoomLevel > self.currItem.initialZoomLevel + self.currItem.initialZoomLevel / 15) {
      _wasOverInitialZoom = true;
    }

    // Apply the friction if zoom level is out of the bounds
    let zoomFriction = 1;

    const minZoomLevel = _getMinZoomLevel();
    const maxZoomLevel = _getMaxZoomLevel();

    if (zoomLevel < minZoomLevel) {

      if (_options.pinchToClose && !_wasOverInitialZoom && _startZoomLevel <= self.currItem.initialZoomLevel) {
        // fade out background if zooming out
        const minusDiff = minZoomLevel - zoomLevel;
        const percent = 1 - minusDiff / (minZoomLevel / 1.2);

        _applyBgOpacity(percent);
        _shout('onPinchClose', percent);
        _opacityChanged = true;
      } else {
        zoomFriction = (minZoomLevel - zoomLevel) / minZoomLevel;
        if (zoomFriction > 1) {
          zoomFriction = 1;
        }
        zoomLevel = minZoomLevel - zoomFriction * (minZoomLevel / 3);
      }

    } else if (zoomLevel > maxZoomLevel) {
      // 1.5 - extra zoom level above the max. E.g. if max is x6, real max 6 + 1.5 = 7.5
      zoomFriction = (zoomLevel - maxZoomLevel) / (minZoomLevel * 6);
      if (zoomFriction > 1) {
        zoomFriction = 1;
      }
      zoomLevel = maxZoomLevel + zoomFriction * minZoomLevel;
    }

    if (zoomFriction < 0) {
      zoomFriction = 0;
    }

    // distance between touch points after friction is applied
    _currPointsDistance = pointsDistance;

    // _centerPoint - The point in the middle of two pointers
    _findCenterOfPoints(p, p2, _centerPoint);

    // paning with two pointers pressed
    _currPanDist.x += _centerPoint.x - _currCenterPoint.x;
    _currPanDist.y += _centerPoint.y - _currCenterPoint.y;
    _equalizePoints(_currCenterPoint, _centerPoint);

    _panOffset.x = _calculatePanOffset('x', zoomLevel);
    _panOffset.y = _calculatePanOffset('y', zoomLevel);

    _isZoomingIn = zoomLevel > _currZoomLevel;
    _currZoomLevel = zoomLevel;
    _applyCurrentZoomPan();
  } else {

    // handle behaviour for one point (dragging or panning)

    if (!_direction) {
      return;
    }

    if (_isFirstMove) {
      _isFirstMove = false;

      // subtract drag distance that was used during the detection direction

      if (Math.abs(delta.x) >= DIRECTION_CHECK_OFFSET) {
        delta.x -= _currentPoints[0].x - _startPoint.x;
      }

      if (Math.abs(delta.y) >= DIRECTION_CHECK_OFFSET) {
        delta.y -= _currentPoints[0].y - _startPoint.y;
      }
    }

    _currPoint.x = p.x;
    _currPoint.y = p.y;

    // do nothing if pointers position hasn't changed
    if (delta.x === 0 && delta.y === 0) {
      return;
    }

    if (_direction === 'v' && _options.closeOnVerticalDrag) {
      if (!_canPan()) {
        _currPanDist.y += delta.y;
        _panOffset.y += delta.y;

        const opacityRatio = _calculateVerticalDragOpacityRatio();

        _verticalDragInitiated = true;
        _shout('onVerticalDrag', opacityRatio);

        _applyBgOpacity(opacityRatio);
        _applyCurrentZoomPan();
        return;
      }
    }

    _pushPosPoint(_getCurrentTime(), p.x, p.y);

    _moved = true;
    _currPanBounds = self.currItem.bounds;

    const mainScrollChanged = _panOrMoveMainScroll('x', delta);
    if (!mainScrollChanged) {
      _panOrMoveMainScroll('y', delta);

      _roundPoint(_panOffset);
      _applyCurrentZoomPan();
    }

  }

};

const // Pointerup/pointercancel/touchend/touchcancel/mouseup event handler
_onDragRelease = e => {
  if (_features.isOldAndroid) {

    if (_oldAndroidTouchEndTimeout && e.type === 'mouseup') {
      return;
    }

    // on Android (v4.1, 4.2, 4.3 & possibly older)
    // ghost mousedown/up event isn't preventable via e.preventDefault,
    // which causes fake mousedown event
    // so we block mousedown/up for 600ms
    if (e.type.includes('touch')) {
      clearTimeout(_oldAndroidTouchEndTimeout);
      _oldAndroidTouchEndTimeout = setTimeout(() => {
        _oldAndroidTouchEndTimeout = 0;
      }, 600);
    }

  }

  _shout('pointerUp');

  if (_preventDefaultEventBehaviour(e, false)) {
    e.preventDefault();
  }

  let releasePoint;

  if (_pointerEventEnabled) {
    const pointerIndex = helper.arraySearch(_currPointers, e.pointerId, 'id');

    if (pointerIndex > -1) {
      releasePoint = _currPointers.splice(pointerIndex, 1)[0];

      if (navigator.pointerEnabled) {
        releasePoint.type = e.pointerType || 'mouse';
      } else {
        const MSPOINTER_TYPES = {
          4: 'mouse', // event.MSPOINTER_TYPE_MOUSE
          2: 'touch', // event.MSPOINTER_TYPE_TOUCH
          3: 'pen' // event.MSPOINTER_TYPE_PEN
        };
        releasePoint.type = MSPOINTER_TYPES[e.pointerType];

        if (!releasePoint.type) {
          releasePoint.type = e.pointerType || 'mouse';
        }
      }

    }
  }

  const touchList = _getTouchPoints(e);
  let gestureType;
  let numPoints = touchList.length;

  if (e.type === 'mouseup') {
    numPoints = 0;
  }

  // Do nothing if there were 3 touch points or more
  if (numPoints === 2) {
    _currentPoints = null;
    return true;
  }

  // if second pointer released
  if (numPoints === 1) {
    _equalizePoints(_startPoint, touchList[0]);
  }


  // pointer hasn't moved, send "tap release" point
  if (numPoints === 0 && !_direction && !_mainScrollAnimating) {
    if (!releasePoint) {
      if (e.type === 'mouseup') {
        releasePoint = {
          x: e.pageX,
          y: e.pageY,
          type: 'mouse'
        };
      } else if (e.changedTouches && e.changedTouches[0]) {
        releasePoint = {
          x: e.changedTouches[0].pageX,
          y: e.changedTouches[0].pageY,
          type: 'touch'
        };
      }
    }

    _shout('touchRelease', e, releasePoint);
  }

  // Difference in time between releasing of two last touch points (zoom gesture)
  let releaseTimeDiff = -1;

  // Gesture completed, no pointers left
  if (numPoints === 0) {
    _isDragging = false;
    helper.unbind(window, _upMoveEvents, self);

    _stopDragUpdateLoop();

    if (_isZooming) {
      // Two points released at the same time
      releaseTimeDiff = 0;
    } else if (_lastReleaseTime !== -1) {
      releaseTimeDiff = _getCurrentTime() - _lastReleaseTime;
    }
  }
  _lastReleaseTime = numPoints === 1 ? _getCurrentTime() : -1;

  if (releaseTimeDiff !== -1 && releaseTimeDiff < 150) {
    gestureType = 'zoom';
  } else {
    gestureType = 'swipe';
  }

  if (_isZooming && numPoints < 2) {
    _isZooming = false;

    // Only second point released
    if (numPoints === 1) {
      gestureType = 'zoomPointerUp';
    }
    _shout('zoomGestureEnded');
  }

  _currentPoints = null;
  if (!_moved && !_zoomStarted && !_mainScrollAnimating && !_verticalDragInitiated) {
    // nothing to animate
    return;
  }

  _stopAllAnimations();


  if (!_releaseAnimData) {
    _releaseAnimData = _initDragReleaseAnimationData();
  }

  _releaseAnimData.calculateSwipeSpeed('x');


  if (_verticalDragInitiated) {

    const opacityRatio = _calculateVerticalDragOpacityRatio();

    if (opacityRatio < _options.verticalDragRange) {
      self.close();
    } else {
      const initalPanY = _panOffset.y;
      const initialBgOpacity = _bgOpacity;

      _animateProp('verticalDrag', 0, 1, 300, helper.easing.cubic.out, now => {

        _panOffset.y = (self.currItem.initialPosition.y - initalPanY) * now + initalPanY;

        _applyBgOpacity((1 - initialBgOpacity) * now + initialBgOpacity);
        _applyCurrentZoomPan();
      });

      _shout('onVerticalDrag', 1);
    }

    return;
  }


  // main scroll
  if ((_mainScrollShifted || _mainScrollAnimating) && numPoints === 0) {
    const itemChanged = _finishSwipeMainScrollGesture(gestureType, _releaseAnimData);
    if (itemChanged) {
      return;
    }
    gestureType = 'zoomPointerUp';
  }

  // prevent zoom/pan animation when main scroll animation runs
  if (_mainScrollAnimating) {
    return;
  }

  // Complete simple zoom gesture (reset zoom level if it's out of the bounds)
  if (gestureType !== 'swipe') {
    _completeZoomGesture();
    return;
  }

  // Complete pan gesture if main scroll is not shifted, and it's possible to pan current image
  if (!_mainScrollShifted && _currZoomLevel > self.currItem.fitRatio) {
    _completePanGesture(_releaseAnimData);
  }
};

const // Returns object with data about gesture
// It's created only once and then reused
_initDragReleaseAnimationData = () => {
  // temp local vars
  let lastFlickDuration;

  let tempReleasePos;

  // s = this
  const s = {
    lastFlickOffset: {},
    lastFlickDist: {},
    lastFlickSpeed: {},
    slowDownRatio: {},
    slowDownRatioReverse: {},
    speedDecelerationRatio: {},
    speedDecelerationRatioAbs: {},
    distanceOffset: {},
    backAnimDestination: {},
    backAnimStarted: {},
    calculateSwipeSpeed(axis) {


      if (_posPoints.length > 1) {
        lastFlickDuration = _getCurrentTime() - _gestureCheckSpeedTime + 50;
        tempReleasePos = _posPoints[_posPoints.length - 2][axis];
      } else {
        lastFlickDuration = _getCurrentTime() - _gestureStartTime; // total gesture duration
        tempReleasePos = _startPoint[axis];
      }
      s.lastFlickOffset[axis] = _currPoint[axis] - tempReleasePos;
      s.lastFlickDist[axis] = Math.abs(s.lastFlickOffset[axis]);
      if (s.lastFlickDist[axis] > 20) {
        s.lastFlickSpeed[axis] = s.lastFlickOffset[axis] / lastFlickDuration;
      } else {
        s.lastFlickSpeed[axis] = 0;
      }
      if (Math.abs(s.lastFlickSpeed[axis]) < 0.1) {
        s.lastFlickSpeed[axis] = 0;
      }

      s.slowDownRatio[axis] = 0.95;
      s.slowDownRatioReverse[axis] = 1 - s.slowDownRatio[axis];
      s.speedDecelerationRatio[axis] = 1;
    },

    calculateOverBoundsAnimOffset(axis, speed) {
      if (!s.backAnimStarted[axis]) {

        if (_panOffset[axis] > _currPanBounds.min[axis]) {
          s.backAnimDestination[axis] = _currPanBounds.min[axis];

        } else if (_panOffset[axis] < _currPanBounds.max[axis]) {
          s.backAnimDestination[axis] = _currPanBounds.max[axis];
        }

        if (s.backAnimDestination[axis] !== undefined) {
          s.slowDownRatio[axis] = 0.7;
          s.slowDownRatioReverse[axis] = 1 - s.slowDownRatio[axis];
          if (s.speedDecelerationRatioAbs[axis] < 0.05) {

            s.lastFlickSpeed[axis] = 0;
            s.backAnimStarted[axis] = true;

            _animateProp(`bounceZoomPan${axis}`, _panOffset[axis],
              s.backAnimDestination[axis],
              speed || 300,
              helper.easing.sine.out,
              pos => {
                _panOffset[axis] = pos;
                _applyCurrentZoomPan();
              }
            );

          }
        }
      }
    },

    // Reduces the speed by slowDownRatio (per 10ms)
    calculateAnimOffset(axis) {
      if (!s.backAnimStarted[axis]) {
        s.speedDecelerationRatio[axis] = s.speedDecelerationRatio[axis] * (s.slowDownRatio[axis] +
          s.slowDownRatioReverse[axis] -
          s.slowDownRatioReverse[axis] * s.timeDiff / 10);

        s.speedDecelerationRatioAbs[axis] = Math.abs(s.lastFlickSpeed[axis] * s.speedDecelerationRatio[axis]);
        s.distanceOffset[axis] = s.lastFlickSpeed[axis] * s.speedDecelerationRatio[axis] * s.timeDiff;
        _panOffset[axis] += s.distanceOffset[axis];

      }
    },

    panAnimLoop() {
      if (_animations.zoomPan) {
        _animations.zoomPan.raf = _requestAF(s.panAnimLoop);

        s.now = _getCurrentTime();
        s.timeDiff = s.now - s.lastNow;
        s.lastNow = s.now;

        s.calculateAnimOffset('x');
        s.calculateAnimOffset('y');

        _applyCurrentZoomPan();

        s.calculateOverBoundsAnimOffset('x');
        s.calculateOverBoundsAnimOffset('y');


        if (s.speedDecelerationRatioAbs.x < 0.05 && s.speedDecelerationRatioAbs.y < 0.05) {

          // round pan position
          _panOffset.x = Math.round(_panOffset.x);
          _panOffset.y = Math.round(_panOffset.y);
          _applyCurrentZoomPan();

          _stopAnimation('zoomPan');
          return;
        }
      }

    }
  };
  return s;
};

const _completePanGesture = animData => {
  // calculate swipe speed for Y axis (paanning)
  animData.calculateSwipeSpeed('y');

  _currPanBounds = self.currItem.bounds;

  animData.backAnimDestination = {};
  animData.backAnimStarted = {};

  // Avoid acceleration animation if speed is too low
  if (Math.abs(animData.lastFlickSpeed.x) <= 0.05 && Math.abs(animData.lastFlickSpeed.y) <= 0.05) {
    animData.speedDecelerationRatioAbs.x = animData.speedDecelerationRatioAbs.y = 0;

    // Run pan drag release animation. E.g. if you drag image and release finger without momentum.
    animData.calculateOverBoundsAnimOffset('x');
    animData.calculateOverBoundsAnimOffset('y');
    return true;
  }

  // Animation loop that controls the acceleration after pan gesture ends
  _registerStartAnimation('zoomPan');
  animData.lastNow = _getCurrentTime();
  animData.panAnimLoop();
};

const _finishSwipeMainScrollGesture = (gestureType, _releaseAnimData) => {
  let itemChanged;
  if (!_mainScrollAnimating) {
    _currZoomedItemIndex = _currentItemIndex;
  }



  let itemsDiff;

  if (gestureType === 'swipe') {
    const totalShiftDist = _currPoint.x - _startPoint.x;
    const isFastLastFlick = _releaseAnimData.lastFlickDist.x < 10;

    // if container is shifted for more than MIN_SWIPE_DISTANCE,
    // and last flick gesture was in right direction
    if (totalShiftDist > MIN_SWIPE_DISTANCE &&
      (isFastLastFlick || _releaseAnimData.lastFlickOffset.x > 20)) {
      // go to prev item
      itemsDiff = -1;
    } else if (totalShiftDist < -MIN_SWIPE_DISTANCE &&
      (isFastLastFlick || _releaseAnimData.lastFlickOffset.x < -20)) {
      // go to next item
      itemsDiff = 1;
    }
  }

  let nextCircle;

  if (itemsDiff) {

    _currentItemIndex += itemsDiff;

    if (_currentItemIndex < 0) {
      _currentItemIndex = _options.loop ? _getNumItems() - 1 : 0;
      nextCircle = true;
    } else if (_currentItemIndex >= _getNumItems()) {
      _currentItemIndex = _options.loop ? 0 : _getNumItems() - 1;
      nextCircle = true;
    }

    if (!nextCircle || _options.loop) {
      _indexDiff += itemsDiff;
      _currPositionIndex -= itemsDiff;
      itemChanged = true;
    }



  }

  const animateToX = _slideSize.x * _currPositionIndex;
  const animateToDist = Math.abs(animateToX - _mainScrollPos.x);
  let finishAnimDuration;


  if (!itemChanged && animateToX > _mainScrollPos.x !== _releaseAnimData.lastFlickSpeed.x > 0) {
    // "return to current" duration, e.g. when dragging from slide 0 to -1
    finishAnimDuration = 333;
  } else {
    finishAnimDuration = Math.abs(_releaseAnimData.lastFlickSpeed.x) > 0 ?
      animateToDist / Math.abs(_releaseAnimData.lastFlickSpeed.x) :
      333;

    finishAnimDuration = Math.min(finishAnimDuration, 400);
    finishAnimDuration = Math.max(finishAnimDuration, 250);
  }

  if (_currZoomedItemIndex === _currentItemIndex) {
    itemChanged = false;
  }

  _mainScrollAnimating = true;

  _shout('mainScrollAnimStart');

  _animateProp('mainScroll', _mainScrollPos.x, animateToX, finishAnimDuration, helper.easing.cubic.out,
    _moveMainScroll,
    () => {
      _stopAllAnimations();
      _mainScrollAnimating = false;
      _currZoomedItemIndex = -1;

      if (itemChanged || _currZoomedItemIndex !== _currentItemIndex) {
        self.updateCurrItem();
      }

      _shout('mainScrollAnimComplete');
    }
  );

  if (itemChanged) {
    self.updateCurrItem(true);
  }

  return itemChanged;
};

const _calculateZoomLevel = touchesDistance => 1 / _startPointsDistance * touchesDistance * _startZoomLevel;

const // Resets zoom if it's out of bounds
_completeZoomGesture = () => {
  let destZoomLevel = _currZoomLevel;
  const minZoomLevel = _getMinZoomLevel();
  const maxZoomLevel = _getMaxZoomLevel();

  if (_currZoomLevel < minZoomLevel) {
    destZoomLevel = minZoomLevel;
  } else if (_currZoomLevel > maxZoomLevel) {
    destZoomLevel = maxZoomLevel;
  }

  const destOpacity = 1;
  let onUpdate;
  const initialOpacity = _bgOpacity;

  if (_opacityChanged && !_isZoomingIn && !_wasOverInitialZoom && _currZoomLevel < minZoomLevel) {
    //_closedByScroll = true;
    self.close();
    return true;
  }

  if (_opacityChanged) {
    onUpdate = now => {
      _applyBgOpacity((destOpacity - initialOpacity) * now + initialOpacity);
    };
  }

  self.zoomTo(destZoomLevel, 0, 200, helper.easing.cubic.out, onUpdate);
  return true;
};


_registerModule('Gestures', {
  publicMethods: {

    initGestures() {

      // helper function that builds touch/pointer/mouse events
      const addEventNames = (pref, down, move, up, cancel) => {
        _dragStartEvent = pref + down;
        _dragMoveEvent = pref + move;
        _dragEndEvent = pref + up;
        if (cancel) {
          _dragCancelEvent = pref + cancel;
        } else {
          _dragCancelEvent = '';
        }
      };

      _pointerEventEnabled = _features.pointerEvent;
      if (_pointerEventEnabled && _features.touch) {
        // we don't need touch events, if browser supports pointer events
        _features.touch = false;
      }

      if (_pointerEventEnabled) {
        if (navigator.pointerEnabled) {
          addEventNames('pointer', 'down', 'move', 'up', 'cancel');
        } else {
          // IE10 pointer events are case-sensitive
          addEventNames('MSPointer', 'Down', 'Move', 'Up', 'Cancel');
        }
      } else if (_features.touch) {
        addEventNames('touch', 'start', 'move', 'end', 'cancel');
        _likelyTouchDevice = true;
      } else {
        addEventNames('mouse', 'down', 'move', 'up');
      }

      _upMoveEvents = `${_dragMoveEvent} ${_dragEndEvent} ${_dragCancelEvent}`;
      _downEvents = _dragStartEvent;

      if (_pointerEventEnabled && !_likelyTouchDevice) {
        _likelyTouchDevice = (navigator.maxTouchPoints > 1) || (navigator.msMaxTouchPoints > 1);
      }
      // make variable public
      self.likelyTouchDevice = _likelyTouchDevice;

      _globalEventHandlers[_dragStartEvent] = _onDragStart;
      _globalEventHandlers[_dragMoveEvent] = _onDragMove;
      _globalEventHandlers[_dragEndEvent] = _onDragRelease; // the Kraken

      if (_dragCancelEvent) {
        _globalEventHandlers[_dragCancelEvent] = _globalEventHandlers[_dragEndEvent];
      }

      // Bind mouse events on device with detected hardware touch support, in case it supports multiple types of input.
      if (_features.touch) {
        _downEvents += ' mousedown';
        _upMoveEvents += ' mousemove mouseup';
        _globalEventHandlers.mousedown = _globalEventHandlers[_dragStartEvent];
        _globalEventHandlers.mousemove = _globalEventHandlers[_dragMoveEvent];
        _globalEventHandlers.mouseup = _globalEventHandlers[_dragEndEvent];
      }

      if (!_likelyTouchDevice) {
        // don't allow pan to next slide from zoomed state on Desktop
        _options.allowPanToNext = false;
      }
    }

  }
});

/**
 * show-hide-transition.js:
 *
 * Manages initial opening or closing transition.
 *
 * If you're not planning to use transition for gallery at all,
 * you may set options hideAnimationDuration and showAnimationDuration to 0,
 * and just delete startAnimation function.
 *
 */


let _showOrHideTimeout;

const _showOrHide = (item, img, out, completeFn) => {

  if (_showOrHideTimeout) {
    clearTimeout(_showOrHideTimeout);
  }

  _initialZoomRunning = true;
  _initialContentSet = true;

  // dimensions of small thumbnail {x:,y:,w:}.
  // Height is optional, as calculated based on large image.
  let thumbBounds;
  if (item.initialLayout) {
    thumbBounds = item.initialLayout;
    item.initialLayout = null;
  } else {
    thumbBounds = _options.getThumbBoundsFn && _options.getThumbBoundsFn(_currentItemIndex);
  }

  const duration = out ? _options.hideAnimationDuration : _options.showAnimationDuration;

  const onComplete = () => {
    _stopAnimation('initialZoom');
    if (!out) {
      _applyBgOpacity(1);
      if (img) {
        img.style.display = 'block';
      }
      helper.addClass(template, 'zvui-pinch__animated-in');
      _shout(`initialZoom${out ? 'OutEnd' : 'InEnd'}`);
    } else {
      self.template.removeAttribute('style');
      self.bg.removeAttribute('style');
    }

    if (completeFn) {
      completeFn();
    }
    _initialZoomRunning = false;
  };

  // if bounds aren't provided, just open gallery without animation
  if (!duration || !thumbBounds || thumbBounds.x === undefined) {

    _shout(`initialZoom${out ? 'Out' : 'In'}`);

    _currZoomLevel = item.initialZoomLevel;
    _equalizePoints(_panOffset, item.initialPosition);
    _applyCurrentZoomPan();

    template.style.opacity = out ? 0 : 1;
    _applyBgOpacity(1);

    if (duration) {
      setTimeout(() => {
        onComplete();
      }, duration);
    } else {
      onComplete();
    }

    return;
  }

  const startAnimation = () => {
    const closeWithRaf = _closedByScroll;
    const fadeEverything = !self.currItem.src || self.currItem.loadError || _options.showHideOpacity;

    // apply hw-acceleration to image
    if (item.miniImg) {
      item.miniImg.style.webkitBackfaceVisibility = 'hidden';
    }

    if (!out) {
      _currZoomLevel = thumbBounds.w / item.w;
      _panOffset.x = thumbBounds.x;
      _panOffset.y = thumbBounds.y - _initalWindowScrollY;

      self[fadeEverything ? 'template' : 'bg'].style.opacity = 0.001;
      _applyCurrentZoomPan();
    }

    _registerStartAnimation('initialZoom');

    if (out && !closeWithRaf) {
      helper.removeClass(template, 'zvui-pinch__animated-in');
    }

    if (fadeEverything) {
      if (out) {
        helper[`${closeWithRaf ? 'remove' : 'add'}Class`](template, 'zvui-pinch__animate_opacity');
      } else {
        setTimeout(() => {
          helper.addClass(template, 'zvui-pinch__animate_opacity');
        }, 30);
      }
    }

    _showOrHideTimeout = setTimeout(() => {

      _shout(`initialZoom${out ? 'Out' : 'In'}`);


      if (!out) {

        // "in" animation always uses CSS transitions (instead of rAF).
        // CSS transition work faster here,
        // as developer may also want to animate other things,
        // like ui on top of sliding area, which can be animated just via CSS

        _currZoomLevel = item.initialZoomLevel;
        _equalizePoints(_panOffset, item.initialPosition);
        _applyCurrentZoomPan();
        _applyBgOpacity(1);

        if (fadeEverything) {
          template.style.opacity = 1;
        } else {
          _applyBgOpacity(1);
        }

        _showOrHideTimeout = setTimeout(onComplete, duration + 20);
      } else {
        // "out" animation uses rAF only when PhotoSwipe is closed by browser scroll, to recalculate position
        const destZoomLevel = thumbBounds.w / item.w;

        const initialPanOffset = {
          x: _panOffset.x,
          y: _panOffset.y
        };

        const initialZoomLevel = _currZoomLevel;
        const initalBgOpacity = _bgOpacity;

        const onUpdate = now => {

          if (now === 1) {
            _currZoomLevel = destZoomLevel;
            _panOffset.x = thumbBounds.x;
            _panOffset.y = thumbBounds.y - _currentWindowScrollY;
          } else {
            _currZoomLevel = (destZoomLevel - initialZoomLevel) * now + initialZoomLevel;
            _panOffset.x = (thumbBounds.x - initialPanOffset.x) * now + initialPanOffset.x;
            _panOffset.y = (thumbBounds.y - _currentWindowScrollY - initialPanOffset.y) * now + initialPanOffset.y;
          }

          _applyCurrentZoomPan();
          if (fadeEverything) {
            template.style.opacity = 1 - now;
          } else {
            _applyBgOpacity(initalBgOpacity - now * initalBgOpacity);
          }
        };

        if (closeWithRaf) {
          _animateProp('initialZoom', 0, 1, duration, helper.easing.cubic.out, onUpdate, onComplete);
        } else {
          onUpdate(1);
          _showOrHideTimeout = setTimeout(onComplete, duration + 20);
        }
      }

    }, out ? 25 : 90); // Main purpose of this delay is to give browser time to paint and
    // create composite layers of PhotoSwipe UI parts (background, controls, caption, arrows).
    // Which avoids lag at the beginning of scale transition.
  };
  startAnimation();


};

/**
 *
 * Controller manages gallery items, their dimensions, and their content.
 *
 */

let _items;

const _tempPanAreaSize = {};
let _imagesToAppendPool = [];
let _initialContentSet;
let _initialZoomRunning;

const _controllerDefaultOptions = {
  index: 0,
  errorMsg: '<div class="zvui-pinch__error-msg"><a href="%url%" target="_blank">The image</a> could not be loaded.</div>',
  forceProgressiveLoading: false, // TODO
  preload: [1, 1],
  getNumItemsFn() {
    return _items.length;
  }
};

let _getItemAt;
let _getNumItems;
let _initialIsLoop;

const _getZeroBounds = () => ({
  center: {
    x: 0,
    y: 0
  },

  max: {
    x: 0,
    y: 0
  },

  min: {
    x: 0,
    y: 0
  }
});

const _calculateSingleItemPanBounds = (item, realPanElementW, realPanElementH) => {
  const bounds = item.bounds;

  // position of element when it's centered
  bounds.center.x = Math.round((_tempPanAreaSize.x - realPanElementW) / 2);
  bounds.center.y = Math.round((_tempPanAreaSize.y - realPanElementH) / 2) + item.vGap.top;

  // maximum pan position
  bounds.max.x = (realPanElementW > _tempPanAreaSize.x) ?
    Math.round(_tempPanAreaSize.x - realPanElementW) :
    bounds.center.x;

  bounds.max.y = (realPanElementH > _tempPanAreaSize.y) ?
    Math.round(_tempPanAreaSize.y - realPanElementH) + item.vGap.top :
    bounds.center.y;

  // minimum pan position
  bounds.min.x = (realPanElementW > _tempPanAreaSize.x) ? 0 : bounds.center.x;
  bounds.min.y = (realPanElementH > _tempPanAreaSize.y) ? item.vGap.top : bounds.center.y;
};

const _calculateItemSize = (item, viewportSize, zoomLevel) => {

  if (item.src && !item.loadError) {
    const isInitial = !zoomLevel;

    if (isInitial) {
      if (!item.vGap) {
        item.vGap = {
          top: 0,
          bottom: 0
        };
      }
      // allows overriding vertical margin for individual items
      _shout('parseVerticalMargin', item);
    }


    _tempPanAreaSize.x = viewportSize.x;
    _tempPanAreaSize.y = viewportSize.y - item.vGap.top - item.vGap.bottom;

    if (isInitial) {
      const hRatio = _tempPanAreaSize.x / item.w;
      const vRatio = _tempPanAreaSize.y / item.h;

      item.fitRatio = hRatio < vRatio ? hRatio : vRatio;
      //item.fillRatio = hRatio > vRatio ? hRatio : vRatio;

      const scaleMode = _options.scaleMode;

      if (scaleMode === 'orig') {
        zoomLevel = 1;
      } else if (scaleMode === 'fit') {
        zoomLevel = item.fitRatio;
      }

      if (zoomLevel > 1) {
        zoomLevel = 1;
      }

      item.initialZoomLevel = zoomLevel;

      if (!item.bounds) {
        // reuse bounds object
        item.bounds = _getZeroBounds();
      }
    }

    if (!zoomLevel) {
      return;
    }

    _calculateSingleItemPanBounds(item, item.w * zoomLevel, item.h * zoomLevel);

    if (isInitial && zoomLevel === item.initialZoomLevel) {
      item.initialPosition = item.bounds.center;
    }

    return item.bounds;
  } else {
    item.w = item.h = 0;
    item.initialZoomLevel = item.fitRatio = 1;
    item.bounds = _getZeroBounds();
    item.initialPosition = item.bounds.center;

    // if it's not image, we return zero bounds (content is not zoomable)
    return item.bounds;
  }

};

const _appendImage = (index, item, baseDiv, img, preventAnimation, keepPlaceholder) => {


  if (item.loadError) {
    return;
  }

  if (img) {

    item.imageAppended = true;
    _setImageSize(item, img, (item === self.currItem && _renderMaxResolution));

    baseDiv.appendChild(img);

    if (keepPlaceholder) {
      setTimeout(() => {
        if (item && item.loaded && item.placeholder) {
          item.placeholder.style.display = 'none';
          item.placeholder = null;
        }
      }, 500);
    }
  }
};

const _preloadImage = item => {
  item.loading = true;
  item.loaded = false;
  let img = item.img = helper.createEl('zvui-pinch__img', 'img');
  const onComplete = () => {
    item.loading = false;
    item.loaded = true;

    if (item.loadComplete) {
      item.loadComplete(item);
    } else {
      item.img = null; // no need to store image object
    }
    img.onload = img.onerror = null;
    img = null;
  };
  img.onload = onComplete;
  img.onerror = () => {
    item.loadError = true;
    onComplete();
  };

  img.src = item.src; // + '?a=' + Math.random();

  return img;
};

const _checkForError = (item, cleanUp) => {
  if (item.src && item.loadError && item.container) {

    if (cleanUp) {
      item.container.innerHTML = '';
    }

    item.container.innerHTML = _options.errorMsg.replace('%url%', item.src);
    return true;

  }
};

const _setImageSize = (item, img, maxRes) => {
  if (!item.src) {
    return;
  }

  if (!img) {
    img = item.container.lastChild;
  }

  const w = maxRes ? item.w : Math.round(item.w * item.fitRatio);
  const h = maxRes ? item.h : Math.round(item.h * item.fitRatio);

  if (item.placeholder && !item.loaded) {
    item.placeholder.style.width = `${w}px`;
    item.placeholder.style.height = `${h}px`;
  }

  img.style.width = `${w}px`;
  img.style.height = `${h}px`;
};

const _appendImagesPool = () => {

  if (_imagesToAppendPool.length) {
    let poolItem;

    for (let i = 0; i < _imagesToAppendPool.length; i++) {
      poolItem = _imagesToAppendPool[i];
      if (poolItem.holder.index === poolItem.index) {
        _appendImage(poolItem.index, poolItem.item, poolItem.baseDiv, poolItem.img, false, poolItem.clearPlaceholder);
      }
    }
    _imagesToAppendPool = [];
  }
};



_registerModule('Controller', {

  publicMethods: {

    lazyLoadItem(index) {
      index = _getLoopedId(index);
      const item = _getItemAt(index);

      if (!item || ((item.loaded || item.loading) && !_itemsNeedUpdate)) {
        return;
      }

      _shout('gettingData', index, item);

      if (!item.src) {
        return;
      }

      _preloadImage(item);
    },
    initController() {
      helper.extend(_options, _controllerDefaultOptions, true);
      self.items = _items = items;
      _getItemAt = self.getItemAt;
      _getNumItems = _options.getNumItemsFn; //self.getNumItems;



      _initialIsLoop = _options.loop;
      if (_getNumItems() < 3) {
        _options.loop = false; // disable loop if less then 3 items
      }

      _listen('beforeChange', diff => {
        const p = _options.preload;
        const isNext = diff === null ? true : (diff >= 0);
        const preloadBefore = Math.min(p[0], _getNumItems());
        const preloadAfter = Math.min(p[1], _getNumItems());
        let i;


        for (i = 1; i <= (isNext ? preloadAfter : preloadBefore); i++) {
          self.lazyLoadItem(_currentItemIndex + i);
        }
        for (i = 1; i <= (isNext ? preloadBefore : preloadAfter); i++) {
          self.lazyLoadItem(_currentItemIndex - i);
        }
      });

      _listen('initialLayout', () => {
        self.currItem.initialLayout = _options.getThumbBoundsFn && _options.getThumbBoundsFn(_currentItemIndex);
      });

      _listen('mainScrollAnimComplete', _appendImagesPool);
      _listen('initialZoomInEnd', _appendImagesPool);



      _listen('destroy', () => {
        let item;
        for (let i = 0; i < _items.length; i++) {
          item = _items[i];
          // remove reference to DOM elements, for GC
          if (item.container) {
            item.container = null;
          }
          if (item.placeholder) {
            item.placeholder = null;
          }
          if (item.img) {
            item.img = null;
          }
          if (item.preloader) {
            item.preloader = null;
          }
          if (item.loadError) {
            item.loaded = item.loadError = false;
          }
        }
        _imagesToAppendPool = null;
      });
    },


    getItemAt(index) {
      if (index >= 0) {
        return _items[index] !== undefined ? _items[index] : false;
      }
      return false;
    },

    allowProgressiveImg() {
      // 1. Progressive image loading isn't working on webkit/blink
      //    when hw-acceleration (e.g. translateZ) is applied to IMG element.
      //    That's why in PhotoSwipe parent element gets zoom transform, not image itself.
      //
      // 2. Progressive image loading sometimes blinks in webkit/blink when applying animation to parent element.
      //    That's why it's disabled on touch devices (mainly because of swipe transition)
      //
      // 3. Progressive image loading sometimes doesn't work in IE (up to 11).

      // Don't allow progressive loading on non-large touch devices
      return _options.forceProgressiveLoading || !_likelyTouchDevice || _options.mouseUsed || screen.width > 1200;
      // 1200 - to eliminate touch devices with large screen (like Chromebook Pixel)
    },

    setContent(holder, index) {
      if (_options.loop) {
        index = _getLoopedId(index);
      }

      const prevItem = self.getItemAt(holder.index);
      if (prevItem) {
        prevItem.container = null;
      }

      const item = self.getItemAt(index);
      let img;

      if (!item) {
        holder.el.innerHTML = '';
        return;
      }

      // allow to override data
      _shout('gettingData', index, item);

      holder.index = index;
      holder.item = item;

      // base container DIV is created only once for each of 3 holders
      const baseDiv = item.container = helper.createEl('zvui-pinch__zoom-wrap');



      if (!item.src && item.html) {
        if (item.html.tagName) {
          baseDiv.appendChild(item.html);
        } else {
          baseDiv.innerHTML = item.html;
        }
      }

      _checkForError(item);

      _calculateItemSize(item, _viewportSize);

      if (item.src && !item.loadError && !item.loaded) {

        item.loadComplete = item => {

          // gallery closed before image finished loading
          if (!_isOpen) {
            return;
          }

          // check if holder hasn't changed while image was loading
          if (holder && holder.index === index) {
            if (_checkForError(item, true)) {
              item.loadComplete = item.img = null;
              _calculateItemSize(item, _viewportSize);
              _applyZoomPanToItem(item);

              if (holder.index === _currentItemIndex) {
                // recalculate dimensions
                self.updateCurrZoomItem();
              }
              return;
            }
            if (!item.imageAppended) {
              if (_features.transform && (_mainScrollAnimating || _initialZoomRunning)) {
                _imagesToAppendPool.push({
                  item,
                  baseDiv,
                  img: item.img,
                  index,
                  holder,
                  clearPlaceholder: true
                });
              } else {
                _appendImage(index, item, baseDiv, item.img, _mainScrollAnimating || _initialZoomRunning, true);
              }
            } else {
              // remove preloader & mini-img
              if (!_initialZoomRunning && item.placeholder) {
                item.placeholder.style.display = 'none';
                item.placeholder = null;
              }
            }
          }

          item.loadComplete = null;
          item.img = null; // no need to store image element after it's added

          _shout('imageLoadComplete', index, item);
        };

        if (helper.features.transform) {

          let placeholderClassName = 'zvui-pinch__img zvui-pinch__img--placeholder';
          placeholderClassName += (item.msrc ? '' : ' zvui-pinch__img--placeholder--blank');

          const placeholder = helper.createEl(placeholderClassName, item.msrc ? 'img' : '');
          if (item.msrc) {
            placeholder.src = item.msrc;
          }

          _setImageSize(item, placeholder);

          baseDiv.appendChild(placeholder);
          item.placeholder = placeholder;

        }




        if (!item.loading) {
          _preloadImage(item);
        }


        if (self.allowProgressiveImg()) {
          // just append image
          if (!_initialContentSet && _features.transform) {
            _imagesToAppendPool.push({
              item,
              baseDiv,
              img: item.img,
              index,
              holder
            });
          } else {
            _appendImage(index, item, baseDiv, item.img, true, true);
          }
        }

      } else if (item.src && !item.loadError) {
        // image object is created every time, due to bugs of image loading & delay when switching images
        img = helper.createEl('zvui-pinch__img', 'img');
        img.style.opacity = 1;
        img.src = item.src;
        _setImageSize(item, img);
        _appendImage(index, item, baseDiv, img, true);
      }


      if (!_initialContentSet && index === _currentItemIndex) {
        _currZoomElementStyle = baseDiv.style;
        _showOrHide(item, (img || item.img));
      } else {
        _applyZoomPanToItem(item);
      }

      holder.el.innerHTML = '';
      holder.el.appendChild(baseDiv);
    },

    cleanSlide(item) {
      if (item.img) {
        item.img.onload = item.img.onerror = null;
      }
      item.loaded = item.loading = item.img = item.imageAppended = false;
    }

  }
});

/**
 * tap.js:
 *
 * Displatches tap and double-tap events.
 *
 */

let tapTimer;

let tapReleasePoint = {};

const _dispatchTapEvent = (origEvent, releasePoint, pointerType) => {
  const e = document.createEvent('CustomEvent');

  const eDetail = {
    origEvent,
    target: origEvent.target,
    releasePoint,
    pointerType: pointerType || 'touch'
  };

  e.initCustomEvent('zvuiPinchTap', true, true, eDetail);
  origEvent.target.dispatchEvent(e);
};

_registerModule('Tap', {
  publicMethods: {
    initTap() {
      _listen('firstTouchStart', self.onTapStart);
      _listen('touchRelease', self.onTapRelease);
      _listen('destroy', () => {
        tapReleasePoint = {};
        tapTimer = null;
      });
    },
    onTapStart(touchList) {
      if (touchList.length > 1) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }
    },
    onTapRelease(e, releasePoint) {
      if (!releasePoint) {
        return;
      }

      if (!_moved && !_isMultitouch && !_numAnimations) {
        const p0 = releasePoint;
        if (tapTimer) {
          clearTimeout(tapTimer);
          tapTimer = null;

          // Check if taped on the same place
          if (_isNearbyPoints(p0, tapReleasePoint)) {
            _shout('doubleTap', p0);
            return;
          }
        }

        if (releasePoint.type === 'mouse') {
          _dispatchTapEvent(e, releasePoint, 'mouse');
          return;
        }

        const clickedTagName = e.target.tagName.toUpperCase();
        // avoid double tap delay on buttons and elements that have class zvui-pinch__single-tap
        if (clickedTagName === 'BUTTON' || helper.hasClass(e.target, 'zvui-pinch__single-tap')) {
          _dispatchTapEvent(e, releasePoint);
          return;
        }

        _equalizePoints(tapReleasePoint, p0);

        tapTimer = setTimeout(() => {
          _dispatchTapEvent(e, releasePoint);
          tapTimer = null;
        }, 300);
      }
    }
  }
});
 helper.extend(self, publicMethods); };

}));
