/**
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
        for (let i = 0; i < type.length; i++) {
            if (type[i]) {
                target[methodName](type[i], listener, false);
            }
        }
    },
    isArray(obj) {
        return (obj instanceof Array);
    },
    createEl(classes, tag) {
        const el = document.createElement(tag || 'div');
        if (classes) {
            el.className = classes;
        }
        return el;
    },
    getScrollY() {
        const yOffset = window.pageYOffset;
        return yOffset !== undefined ? yOffset : document.documentElement.scrollTop;
    },
    unbind(target, type, listener) {
        helper.bind(target, type, listener, true);
    },
    removeClass(el, className) {
        const reg = new RegExp(`(\\s|^)${className}(\\s|$)`);
        el.className = el.className.replace(reg, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    },
    addClass(el, className) {
        if (!helper.hasClass(el, className)) {
            el.className += (el.className ? ' ' : '') + className;
        }
    },
    hasClass(el, className) {
        return el.className && new RegExp(`(^|\\s)${className}(\\s|$)`).test(el.className);
    },
    getChildByClass(parentEl, childClassName) {
        let node = parentEl.firstChild;
        while (node) {
            if (helper.hasClass(node, childClassName)) {
                return node;
            }
            node = node.nextSibling;
        }
    },
    arraySearch(array, value, key) {
        let i = array.length;
        while (i--) {
            if (array[i][key] === value) {
                return i;
            }
        }
        return -1;
    },
    extend(o1, o2, preventOverwrite) {
        for (const prop in o2) {
            if (o2.hasOwnProperty(prop)) {
                if (preventOverwrite && o1.hasOwnProperty(prop)) {
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
                return -(Math.cos(Math.PI * k) - 1) / 2;
            },
        },
        cubic: {
            out(k) {
                return --k * k * k + 1;
            },
        },
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
        if (helper.features) {
            return helper.features;
        }
        const helperEl = helper.createEl();
        const helperStyle = helperEl.style;
        let vendor = '';
        const features = {};

        // IE8 and below
        features.oldIE = document.all && !document.addEventListener;

        features.touch = 'ontouchstart' in window;

        if (window.requestAnimationFrame) {
            features.raf = window.requestAnimationFrame;
            features.caf = window.cancelAnimationFrame;
        }

        features.pointerEvent = navigator.pointerEnabled || navigator.msPointerEnabled;

        // fix false-positive detection of old Android in new IE
        // (IE11 ua string contains "Android 4.0")

        if (!features.pointerEvent) {

            const ua = navigator.userAgent;

            // Detect if device is iPhone or iPod and if it's older than iOS 8
            // http://stackoverflow.com/a/14223920
            //
            // This detection is made because of buggy top/bottom toolbars
            // that don't trigger window.resize event.
            // For more info refer to _isFixedPosition variable in core.js

            if (/iP(hone|od)/.test(navigator.platform)) {
                let v = (navigator.appVersion).match(/OS (\d+)_(\d+)_?(\d+)?/);
                if (v && v.length > 0) {
                    v = parseInt(v[1], 10);
                    if (v >= 1 && v < 8) {
                        features.isOldIOSPhone = true;
                    }
                }
            }

            // Detect old Android (before KitKat)
            // due to bugs related to position:fixed
            // http://stackoverflow.com/questions/7184573/pick-up-the-android-version-in-the-browser-by-javascript

            const match = ua.match(/Android\s([0-9\.]*)/);
            let androidversion = match ? match[1] : 0;
            androidversion = parseFloat(androidversion);
            if (androidversion >= 1) {
                if (androidversion < 4.4) {
                    features.isOldAndroid = true; // for fixed position bug & performance
                }
                features.androidVersion = androidversion; // for touchend bug
            }
            features.isMobileOpera = /opera mini|opera mobi/i.test(ua);

            // p.s. yes, yes, UA sniffing is bad, propose your solution for above bugs.
        }

        const styleChecks = ['transform', 'perspective', 'animationName'];
        const vendors = ['', 'webkit', 'Moz', 'ms', 'O'];
        let styleCheckItem;
        let styleName;

        for (let i = 0; i < 4; i++) {
            vendor = vendors[i];

            for (let a = 0; a < 3; a++) {
                styleCheckItem = styleChecks[a];

                // uppercase first letter of property name, if vendor is present
                styleName = vendor + (vendor ?
                    styleCheckItem.charAt(0).toUpperCase() + styleCheckItem.slice(1) :
                    styleCheckItem);

                if (!features[styleCheckItem] && styleName in helperStyle) {
                    features[styleCheckItem] = styleName;
                }
            }

            if (vendor && !features.raf) {
                vendor = vendor.toLowerCase();
                features.raf = window[`${vendor}RequestAnimationFrame`];
                if (features.raf) {
                    features.caf = window[`${vendor}CancelAnimationFrame`] ||
                        window[`${vendor}CancelRequestAnimationFrame`];
                }
            }
        }

        if (!features.raf) {
            let lastTime = 0;
            features.raf = fn => {
                const currTime = new Date().getTime();
                const timeToCall = Math.max(0, 16 - (currTime - lastTime));
                const id = window.setTimeout(() => {
                    fn(currTime + timeToCall);
                }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
            features.caf = id => {
                clearTimeout(id);
            };
        }

        // Detect SVG support
        features.svg = !!document.createElementNS &&
            !!document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;

        helper.features = features;

        return features;
    },
};

helper.detectFeatures();

// Override addEventListener for old versions of IE
if (helper.features.oldIE) {

    helper.bind = (target, type, listener, unbind) => {
        type = type.split(' ');

        const methodName = `${unbind ? 'detach' : 'attach'}Event`;
        let evName;

        const _handleEv = () => {
            listener.handleEvent.call(listener);
        };

        for (let i = 0; i < type.length; i++) {
            evName = type[i];
            if (evName) {

                if (typeof listener === 'object' && listener.handleEvent) {
                    if (!unbind) {
                        listener[`oldIE${evName}`] = _handleEv;
                    } else {
                        if (!listener[`oldIE${evName}`]) {
                            return false;
                        }
                    }

                    target[methodName](`on${evName}`, listener[`oldIE${evName}`]);
                } else {
                    target[methodName](`on${evName}`, listener);
                }

            }
        }
    };

}
