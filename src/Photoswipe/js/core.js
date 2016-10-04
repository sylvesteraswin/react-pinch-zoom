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
    scaleMode: 'fit', // TODO
};
helper.extend(_options, options);


/**
 * Private helper variables & functions
 */

const _getEmptyPoint = () => ({
    x: 0,
    y: 0,
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

// Return true if offset is out of the bounds
const _modifyDestPanOffset = (axis, destPanBounds, destPanOffset, destZoomLevel) => {
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
            index: -1,
        }, {
            el: self.container.children[1],
            wrap: 0,
            index: -1,
        }, {
            el: self.container.children[2],
            wrap: 0,
            index: -1,
        }];

        // hide nearby item holders until initial zoom animation finishes (to avoid extra Paints)
        _itemHolders[0].el.style.display = _itemHolders[2].el.style.display = 'none';

        _setupTransforms();

        // Setup global events
        _globalEventHandlers = {
            resize: self.updateSize,
            scroll: _updatePageScrollOffset,
            keydown: _onKeyDown,
            click: _onGlobalClick,
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

    handleEvent(e = window.event) {
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
            y: _panOffset.y,
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
    },


};
