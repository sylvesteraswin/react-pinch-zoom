
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.ZVUIPinch_Default = factory();
  }
}(this, function(require, exports, module) {

return function(zvuiPinch, helper) { /**
 *
 * UI on top of main sliding area (caption, arrows, close button, etc.).
 * Built just using public methods/properties of PhotoSwipe.
 *
 */
const ui = this;
let _overlayUIUpdated = false;
let _controlsVisible = true;
let _fullscrenAPI;
let _controls;
let _captionContainer;
let _fakeCaptionContainer;
let _indexIndicator;
let _initalCloseOnScrollValue;
let _isIdle;
let _listen;
let _loadingIndicator;
let _loadingIndicatorHidden;
let _loadingIndicatorTimeout;
let _galleryHasOneSlide;
let _options;

const _defaultUIOptions = {
    barsSize: {
        top: 44,
        bottom: 'auto',
    },
    closeElClasses: ['item', 'caption', 'zoom-wrap', 'ui', 'top-bar'],
    timeToIdle: 4000,
    timeToIdleOutside: 1000,
    loadingIndicatorDelay: 1000, // 2s

    addCaptionHTMLFn(item, captionEl /*, isFake */ ) {
        if (!item.title) {
            captionEl.children[0].innerHTML = '';
            return false;
        }
        captionEl.children[0].innerHTML = item.title;
        return true;
    },

    closeEl: true,
    captionEl: false,
    fullscreenEl: false,
    zoomEl: true,
    counterEl: false,
    arrowEl: false,
    preloaderEl: true,

    tapToClose: true,
    tapToToggleControls: true,

    clickToCloseNonZoomable: true,

    indexIndicatorSep: ' / ',
    fitControlsWidth: 1200,

};

let _blockControlsTap;
let _blockControlsTapTimeout;

const _onControlsTap = e => {
    if (_blockControlsTap) {
        return true;
    }


    e = e || window.event;

    if (_options.timeToIdle && _options.mouseUsed && !_isIdle) {
        // reset idle timer
        _onIdleMouseMove();
    }


    const target = e.target || e.srcElement;
    let uiElement;
    const clickedClass = target.getAttribute('class') || '';
    let found;

    for (let i = 0; i < _uiElements.length; i++) {
        uiElement = _uiElements[i];
        if (uiElement.onTap && clickedClass.includes(`zvui-pinch__${uiElement.name}`)) {
            uiElement.onTap();
            found = true;

        }
    }

    if (found) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        _blockControlsTap = true;

        // Some versions of Android don't prevent ghost click event
        // when preventDefault() was called on touchstart and/or touchend.
        //
        // This happens on v4.3, 4.2, 4.1,
        // older versions strangely work correctly,
        // but just in case we add delay on all of them)
        const tapDelay = helper.features.isOldAndroid ? 600 : 30;
        _blockControlsTapTimeout = setTimeout(() => {
            _blockControlsTap = false;
        }, tapDelay);
    }
};

const _fitControlsInViewport = () => !zvuiPinch.likelyTouchDevice || _options.mouseUsed || screen.width > _options.fitControlsWidth;

const _toggleZvuiPinchClass = (el, cName, add) => {
    helper[`${add ? 'add' : 'remove'}Class`](el, `zvui-pinch__${cName}`);
};

const _countNumItems = () => {
    // add class when there is just one item in the gallery
    // (by default it hides left/right arrows and 1ofX counter)
    const hasOneSlide = (_options.getNumItemsFn() === 1);
    if (hasOneSlide !== _galleryHasOneSlide) {
        _toggleZvuiPinchClass(_controls, 'ui--one-slide', hasOneSlide);
        _galleryHasOneSlide = hasOneSlide;
    }
};

const _hasCloseClass = target => {
    for (let i = 0; i < _options.closeElClasses.length; i++) {
        if (helper.hasClass(target, `zvui-pinch__${_options.closeElClasses[i]}`)) {
            return true;
        }
    }
};

let _idleInterval;
let _idleTimer;
let _idleIncrement = 0;

const _onIdleMouseMove = () => {
    clearTimeout(_idleTimer);
    _idleIncrement = 0;
    if (_isIdle) {
        ui.setIdle(false);
    }
};

const _onMouseLeaveWindow = e => {
    e = e ? e : window.event;
    const from = e.relatedTarget || e.toElement;
    if (!from || from.nodeName === 'HTML') {
        clearTimeout(_idleTimer);
        _idleTimer = setTimeout(() => {
            ui.setIdle(true);
        }, _options.timeToIdleOutside);
    }
};

const _setupFullscreenAPI = () => {
    if (_options.fullscreenEl && !helper.features.isOldAndroid) {
        if (!_fullscrenAPI) {
            _fullscrenAPI = ui.getFullscreenAPI();
        }
        if (_fullscrenAPI) {
            helper.bind(document, _fullscrenAPI.eventK, ui.updateFullscreen);
            ui.updateFullscreen();
            helper.addClass(zvuiPinch.template, 'zvui-pinch--supports-fs');
        } else {
            helper.removeClass(zvuiPinch.template, 'zvui-pinch--supports-fs');
        }
    }
};

const _setupLoadingIndicator = () => {
    // Setup loading indicator
    if (_options.preloaderEl) {

        _toggleLoadingIndicator(true);

        _listen('beforeChange', () => {

            clearTimeout(_loadingIndicatorTimeout);

            // display loading indicator with delay
            _loadingIndicatorTimeout = setTimeout(() => {

                if (zvuiPinch.currItem && zvuiPinch.currItem.loading) {

                    if (!zvuiPinch.allowProgressiveImg() || (zvuiPinch.currItem.img && !zvuiPinch.currItem.img.naturalWidth)) {
                        // show preloader if progressive loading is not enabled,
                        // or image width is not defined yet (because of slow connection)
                        _toggleLoadingIndicator(false);
                        // items-controller.js function allowProgressiveImg
                    }

                } else {
                    _toggleLoadingIndicator(true); // hide preloader
                }

            }, _options.loadingIndicatorDelay);

        });
        _listen('imageLoadComplete', (index, item) => {
            if (zvuiPinch.currItem === item) {
                _toggleLoadingIndicator(true);
            }
        });

    }
};

const _toggleLoadingIndicator = hide => {
    if (_loadingIndicatorHidden !== hide) {
        _toggleZvuiPinchClass(_loadingIndicator, 'spinner', !hide);
        _loadingIndicatorHidden = hide;
    }
};

const _applyNavBarGaps = item => {
    const gap = item.vGap;

    if (_fitControlsInViewport()) {

        const bars = _options.barsSize;
        if (_options.captionEl && bars.bottom === 'auto') {
            if (!_fakeCaptionContainer) {
                _fakeCaptionContainer = helper.createEl('zvui-pinch__caption zvui-pinch__caption--fake');
                _fakeCaptionContainer.appendChild(helper.createEl('zvui-pinch__caption__center'));
                _controls.insertBefore(_fakeCaptionContainer, _captionContainer);
                helper.addClass(_controls, 'zvui-pinch__ui--fit');
            }
            if (_options.addCaptionHTMLFn(item, _fakeCaptionContainer, true)) {

                const captionSize = _fakeCaptionContainer.clientHeight;
                gap.bottom = parseInt(captionSize, 10) || 44;
            } else {
                gap.bottom = bars.top; // if no caption, set size of bottom gap to size of top
            }
        } else {
            gap.bottom = bars.bottom === 'auto' ? 0 : bars.bottom;
        }

        // height of top bar is static, no need to calculate it
        gap.top = bars.top;
    } else {
        gap.top = gap.bottom = 0;
    }
};

const _setupIdle = () => {
    // Hide controls when mouse is used
    if (_options.timeToIdle) {
        _listen('mouseUsed', () => {

            helper.bind(document, 'mousemove', _onIdleMouseMove);
            helper.bind(document, 'mouseout', _onMouseLeaveWindow);

            _idleInterval = setInterval(() => {
                _idleIncrement++;
                if (_idleIncrement === 2) {
                    ui.setIdle(true);
                }
            }, _options.timeToIdle / 2);
        });
    }
};

const _setupHidingControlsDuringGestures = () => {

    // Hide controls on vertical drag
    _listen('onVerticalDrag', now => {
        if (_controlsVisible && now < 0.95) {
            ui.hideControls();
        } else if (!_controlsVisible && now >= 0.95) {
            ui.showControls();
        }
    });

    // Hide controls when pinching to close
    let pinchControlsHidden;
    _listen('onPinchClose', now => {
        if (_controlsVisible && now < 0.9) {
            ui.hideControls();
            pinchControlsHidden = true;
        } else if (pinchControlsHidden && !_controlsVisible && now > 0.9) {
            ui.showControls();
        }
    });

    _listen('zoomGestureEnded', () => {
        pinchControlsHidden = false;
        if (pinchControlsHidden && !_controlsVisible) {
            ui.showControls();
        }
    });

};



var _uiElements = [
    {
        name: 'button--zoom',
        option: 'zoomEl',
        onTap: zvuiPinch.toggleDesktopZoom,
    }, {
        name: 'button--close',
        option: 'closeEl',
        onTap: zvuiPinch.close,
    }, {
        name: 'button--fs',
        option: 'fullscreenEl',
        onTap() {
            if (_fullscrenAPI.isFullscreen()) {
                _fullscrenAPI.exit();
            } else {
                _fullscrenAPI.enter();
            }
        },
    }, {
        name: 'preloader',
        option: 'preloaderEl',
        onInit(el) {
            _loadingIndicator = el;
        },
    },
];

const _setupUIElements = () => {
    let item;
    let classAttr;
    let uiElement;

    const loopThroughChildElements = sChildren => {
        if (!sChildren) {
            return;
        }

        const l = sChildren.length;
        for (let i = 0; i < l; i++) {
            item = sChildren[i];
            classAttr = item.className;

            for (let a = 0; a < _uiElements.length; a++) {
                uiElement = _uiElements[a];

                if (classAttr.includes(`zvui-pinch__${uiElement.name}`)) {

                    if (_options[uiElement.option]) { // if element is not disabled from options

                        helper.removeClass(item, 'zvui-pinch__element--disabled');
                        if (uiElement.onInit) {
                            uiElement.onInit(item);
                        }

                        //item.style.display = 'block';
                    } else {
                        helper.addClass(item, 'zvui-pinch__element--disabled');
                        //item.style.display = 'none';
                    }
                }
            }
        }
    };
    loopThroughChildElements(_controls.children);

    const topBar = helper.getChildByClass(_controls, 'zvui-pinch__top-bar');
    if (topBar) {
        loopThroughChildElements(topBar.children);
    }
};




ui.init = () => {

    // extend options
    helper.extend(zvuiPinch.options, _defaultUIOptions, true);

    // create local link for fast access
    _options = zvuiPinch.options;

    // find zvui-pinch__ui element
    _controls = helper.getChildByClass(zvuiPinch.scrollWrap, 'zvui-pinch__ui');

    // create local link
    _listen = zvuiPinch.listen;


    _setupHidingControlsDuringGestures();

    // update controls when slides change
    _listen('beforeChange', ui.update);

    // toggle zoom on double-tap
    _listen('doubleTap', point => {
        const initialZoomLevel = zvuiPinch.currItem.initialZoomLevel;
        if (zvuiPinch.getZoomLevel() !== initialZoomLevel) {
            zvuiPinch.zoomTo(initialZoomLevel, point, 333);
        } else {
            zvuiPinch.zoomTo(_options.getDoubleTapZoom(false, zvuiPinch.currItem), point, 333);
        }
    });

    // Allow text selection in caption
    _listen('preventDragEvent', (e, isDown, preventObj) => {
        const t = e.target || e.srcElement;
        if (
            t &&
            t.getAttribute('class') && e.type.includes('mouse') &&
            (t.getAttribute('class').indexOf('__caption') > 0 || (/(SMALL|STRONG|EM)/i).test(t.tagName))
        ) {
            preventObj.prevent = false;
        }
    });

    // bind events for UI
    _listen('bindEvents', () => {
        helper.bind(_controls, 'zvuiPinchTap click', _onControlsTap);
        helper.bind(zvuiPinch.scrollWrap, 'zvuiPinchTap', ui.onGlobalTap);

        if (!zvuiPinch.likelyTouchDevice) {
            helper.bind(zvuiPinch.scrollWrap, 'mouseover', ui.onMouseOver);
        }
    });

    // unbind events for UI
    _listen('unbindEvents', () => {
        if (_idleInterval) {
            clearInterval(_idleInterval);
        }
        helper.unbind(document, 'mouseout', _onMouseLeaveWindow);
        helper.unbind(document, 'mousemove', _onIdleMouseMove);
        helper.unbind(_controls, 'zvuiPinchTap click', _onControlsTap);
        helper.unbind(zvuiPinch.scrollWrap, 'zvuiPinchTap', ui.onGlobalTap);
        helper.unbind(zvuiPinch.scrollWrap, 'mouseover', ui.onMouseOver);

        if (_fullscrenAPI) {
            helper.unbind(document, _fullscrenAPI.eventK, ui.updateFullscreen);
            if (_fullscrenAPI.isFullscreen()) {
                _options.hideAnimationDuration = 0;
                _fullscrenAPI.exit();
            }
            _fullscrenAPI = null;
        }
    });


    // clean up things when gallery is destroyed
    _listen('destroy', () => {
        if (_options.captionEl) {
            if (_fakeCaptionContainer) {
                _controls.removeChild(_fakeCaptionContainer);
            }
            helper.removeClass(_captionContainer, 'zvui-pinch__caption--empty');
        }

        helper.removeClass(_controls, 'zvui-pinch__ui--over-close');
        helper.addClass(_controls, 'zvui-pinch__ui--hidden');
        ui.setIdle(false);
    });


    if (!_options.showAnimationDuration) {
        helper.removeClass(_controls, 'zvui-pinch__ui--hidden');
    }
    _listen('initialZoomIn', () => {
        if (_options.showAnimationDuration) {
            helper.removeClass(_controls, 'zvui-pinch__ui--hidden');
        }
    });
    _listen('initialZoomOut', () => {
        helper.addClass(_controls, 'zvui-pinch__ui--hidden');
    });

    _listen('parseVerticalMargin', _applyNavBarGaps);

    _setupUIElements();

    _countNumItems();

    _setupIdle();

    _setupFullscreenAPI();

    _setupLoadingIndicator();
};

ui.setIdle = isIdle => {
    _isIdle = isIdle;
    _toggleZvuiPinchClass(_controls, 'ui--idle', isIdle);
};

ui.update = () => {
    // Don't update UI if it's hidden
    if (_controlsVisible && zvuiPinch.currItem) {

        ui.updateIndexIndicator();

        if (_options.captionEl) {
            _options.addCaptionHTMLFn(zvuiPinch.currItem, _captionContainer);

            _toggleZvuiPinchClass(_captionContainer, 'caption--empty', !zvuiPinch.currItem.title);
        }

        _overlayUIUpdated = true;

    } else {
        _overlayUIUpdated = false;
    }

    _countNumItems();
};

ui.updateFullscreen = e => {

    if (e) {
        // some browsers change window scroll position during the fullscreen
        // so PhotoSwipe updates it just in case
        setTimeout(() => {
            zvuiPinch.setScrollOffset(0, helper.getScrollY());
        }, 50);
    }

    // toogle zvui-pinch--fs class on root element
    helper[`${_fullscrenAPI.isFullscreen() ? 'add' : 'remove'}Class`](zvuiPinch.template, 'zvui-pinch--fs');
};

ui.updateIndexIndicator = () => {
    if (_options.counterEl) {
        _indexIndicator.innerHTML = (zvuiPinch.getCurrentIndex() + 1) +
            _options.indexIndicatorSep +
            _options.getNumItemsFn();
    }
};

ui.onGlobalTap = e => {
    e = e || window.event;
    const target = e.target || e.srcElement;

    if (_blockControlsTap) {
        return;
    }

    if (e.detail && e.detail.pointerType === 'mouse') {

        // close gallery if clicked outside of the image
        if (_hasCloseClass(target)) {
            zvuiPinch.close();
            return;
        }

        if (helper.hasClass(target, 'zvui-pinch__img')) {
            if (zvuiPinch.getZoomLevel() === 1 && zvuiPinch.getZoomLevel() <= zvuiPinch.currItem.fitRatio) {
                if (_options.clickToCloseNonZoomable) {
                    zvuiPinch.close();
                }
            } else {
                zvuiPinch.toggleDesktopZoom(e.detail.releasePoint);
            }
        }

    } else {

        // tap anywhere (except buttons) to toggle visibility of controls
        if (_options.tapToToggleControls) {
            if (_controlsVisible) {
                ui.hideControls();
            } else {
                ui.showControls();
            }
        }

        // tap to close gallery
        if (_options.tapToClose && (helper.hasClass(target, 'zvui-pinch__img') || _hasCloseClass(target))) {
            zvuiPinch.close();
            return;
        }

    }
};
ui.onMouseOver = e => {
    e = e || window.event;
    const target = e.target || e.srcElement;

    // add class when mouse is over an element that should close the gallery
    _toggleZvuiPinchClass(_controls, 'ui--over-close', _hasCloseClass(target));
};

ui.hideControls = () => {
    helper.addClass(_controls, 'zvui-pinch__ui--hidden');
    _controlsVisible = false;
};

ui.showControls = () => {
    _controlsVisible = true;
    if (!_overlayUIUpdated) {
        ui.update();
    }
    helper.removeClass(_controls, 'zvui-pinch__ui--hidden');
};

ui.supportsFullscreen = () => {
    const d = document;
    return !!(d.exitFullscreen || d.mozCancelFullScreen || d.webkitExitFullscreen || d.msExitFullscreen);
};

ui.getFullscreenAPI = () => {
    const dE = document.documentElement;
    let api;
    const tF = 'fullscreenchange';

    if (dE.requestFullscreen) {
        api = {
            enterK: 'requestFullscreen',
            exitK: 'exitFullscreen',
            elementK: 'fullscreenElement',
            eventK: tF,
        };

    } else if (dE.mozRequestFullScreen) {
        api = {
            enterK: 'mozRequestFullScreen',
            exitK: 'mozCancelFullScreen',
            elementK: 'mozFullScreenElement',
            eventK: `moz${tF}`,
        };



    } else if (dE.webkitRequestFullscreen) {
        api = {
            enterK: 'webkitRequestFullscreen',
            exitK: 'webkitExitFullscreen',
            elementK: 'webkitFullscreenElement',
            eventK: `webkit${tF}`,
        };

    } else if (dE.msRequestFullscreen) {
        api = {
            enterK: 'msRequestFullscreen',
            exitK: 'msExitFullscreen',
            elementK: 'msFullscreenElement',
            eventK: 'MSFullscreenChange',
        };
    }

    if (api) {
        api.enter = function() {
            // disable close-on-scroll in fullscreen
            _initalCloseOnScrollValue = _options.closeOnScroll;
            _options.closeOnScroll = false;

            if (this.enterK === 'webkitRequestFullscreen') {
                zvuiPinch.template[this.enterK](Element.ALLOW_KEYBOARD_INPUT);
            } else {
                return zvuiPinch.template[this.enterK]();
            }
        };
        api.exit = function() {
            _options.closeOnScroll = _initalCloseOnScrollValue;

            return document[this.exitK]();

        };
        api.isFullscreen = function() {
            return document[this.elementK];
        };
    }

    return api;
};
 };

}));
