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
