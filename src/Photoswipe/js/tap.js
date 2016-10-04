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
        pointerType: pointerType || 'touch',
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
        },
    },
});
