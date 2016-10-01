/**
 * tap.js:
 *
 * Displatches tap and double-tap events.
 *
 */

var tapTimer,
  tapReleasePoint = {},
  _dispatchTapEvent = function(origEvent, releasePoint, pointerType) {
    var e = document.createEvent('CustomEvent'),
      eDetail = {
        origEvent: origEvent,
        target: origEvent.target,
        releasePoint: releasePoint,
        pointerType: pointerType || 'touch'
      };

    e.initCustomEvent('zvuiPinchTap', true, true, eDetail);
    origEvent.target.dispatchEvent(e);
  };

_registerModule('Tap', {
  publicMethods: {
    initTap: function() {
      _listen('firstTouchStart', self.onTapStart);
      _listen('touchRelease', self.onTapRelease);
      _listen('destroy', function() {
        tapReleasePoint = {};
        tapTimer = null;
      });
    },
    onTapStart: function(touchList) {
      if (touchList.length > 1) {
        clearTimeout(tapTimer);
        tapTimer = null;
      }
    },
    onTapRelease: function(e, releasePoint) {
      if (!releasePoint) {
        return;
      }

      if (!_moved && !_isMultitouch && !_numAnimations) {
        var p0 = releasePoint;
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

        var clickedTagName = e.target.tagName.toUpperCase();
        // avoid double tap delay on buttons and elements that have class zvui-pinch__single-tap
        if (clickedTagName === 'BUTTON' || helper.hasClass(e.target, 'zvui-pinch__single-tap')) {
          _dispatchTapEvent(e, releasePoint);
          return;
        }

        _equalizePoints(tapReleasePoint, p0);

        tapTimer = setTimeout(function() {
          _dispatchTapEvent(e, releasePoint);
          tapTimer = null;
        }, 300);
      }
    }
  }
});
