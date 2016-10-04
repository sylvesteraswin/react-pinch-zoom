/**
 *
 * desktop-zoom.js:
 *
 * - Binds mousewheel event for paning zoomed image.
 * - Manages "dragging", "zoomed-in", "zoom-out" classes.
 *   (which are used for cursors and zoom icon)
 * - Adds toggleDesktopZoom function.
 *
 */

let _wheelDelta;

_registerModule('DesktopZoom', {

    publicMethods: {

        initDesktopZoom() {

            if (_oldIE) {
                // no zoom for old IE (<=8)
                return;
            }

            if (_likelyTouchDevice) {
                // if detected hardware touch support, we wait until mouse is used,
                // and only then apply desktop-zoom features
                _listen('mouseUsed', () => {
                    self.setupDesktopZoom();
                });
            } else {
                self.setupDesktopZoom(true);
            }

        },

        setupDesktopZoom(onInit) {
            _wheelDelta = {};

            const events = 'wheel mousewheel DOMMouseScroll';

            _listen('bindEvents', () => {
                helper.bind(template, events, self.handleMouseWheel);
            });

            _listen('unbindEvents', () => {
                if (_wheelDelta) {
                    helper.unbind(template, events, self.handleMouseWheel);
                }
            });

            self.mouseZoomedIn = false;

            let hasDraggingClass;

            const removeDraggingClass = () => {
                if (hasDraggingClass) {
                    helper.removeClass(template, 'zvui-pinch--dragging');
                    hasDraggingClass = false;
                }
            };

            const updateZoomable = () => {
                if (self.mouseZoomedIn) {
                    helper.removeClass(template, 'zvui-pinch--zoomed-in');
                    self.mouseZoomedIn = false;
                }
                if (_currZoomLevel < 1) {
                    helper.addClass(template, 'zvui-pinch--zoom-allowed');
                } else {
                    helper.removeClass(template, 'zvui-pinch--zoom-allowed');
                }
                removeDraggingClass();
            };

            _listen('resize', updateZoomable);
            _listen('afterChange', updateZoomable);
            _listen('pointerDown', () => {
                if (self.mouseZoomedIn) {
                    hasDraggingClass = true;
                    helper.addClass(template, 'zvui-pinch--dragging');
                }
            });
            _listen('pointerUp', removeDraggingClass);

            if (!onInit) {
                updateZoomable();
            }
        },

        handleMouseWheel(e) {
            if (_currZoomLevel <= self.currItem.fitRatio) {
                if (_options.modal) {

                    if (!_options.closeOnScroll || _numAnimations || _isDragging) {
                        e.preventDefault();
                    } else if (_transformKey && Math.abs(e.deltaY) > 2) {
                        // close PhotoSwipe
                        // if browser supports transforms & scroll changed enough
                        _closedByScroll = true;
                        self.close();
                    }

                }
                return true;
            }

            // allow just one event to fire
            e.stopPropagation();

            // https://developer.mozilla.org/en-US/docs/Web/Events/wheel
            _wheelDelta.x = 0;

            if ('deltaX' in e) {
                if (e.deltaMode === 1 /* DOM_DELTA_LINE */ ) {
                    // 18 - average line height
                    _wheelDelta.x = e.deltaX * 18;
                    _wheelDelta.y = e.deltaY * 18;
                } else {
                    _wheelDelta.x = e.deltaX;
                    _wheelDelta.y = e.deltaY;
                }
            } else if ('wheelDelta' in e) {
                if (e.wheelDeltaX) {
                    _wheelDelta.x = -0.16 * e.wheelDeltaX;
                }
                if (e.wheelDeltaY) {
                    _wheelDelta.y = -0.16 * e.wheelDeltaY;
                } else {
                    _wheelDelta.y = -0.16 * e.wheelDelta;
                }
            } else if ('detail' in e) {
                _wheelDelta.y = e.detail;
            } else {
                return;
            }

            _calculatePanBounds(_currZoomLevel, true);

            const newPanX = _panOffset.x - _wheelDelta.x;
            const newPanY = _panOffset.y - _wheelDelta.y;

            // only prevent scrolling in nonmodal mode when not at edges
            if (_options.modal ||
                (
                    newPanX <= _currPanBounds.min.x && newPanX >= _currPanBounds.max.x &&
                    newPanY <= _currPanBounds.min.y && newPanY >= _currPanBounds.max.y
                )) {
                e.preventDefault();
            }

            // TODO: use rAF instead of mousewheel?
            self.panTo(newPanX, newPanY);
        },

        toggleDesktopZoom(
            centerPoint = {
                x: _viewportSize.x / 2 + _offset.x,
                y: _viewportSize.y / 2 + _offset.y,
            }) {
            const doubleTapZoomLevel = _options.getDoubleTapZoom(true, self.currItem);
            const zoomOut = _currZoomLevel === doubleTapZoomLevel;

            self.mouseZoomedIn = !zoomOut;

            self.zoomTo(zoomOut ? self.currItem.initialZoomLevel : doubleTapZoomLevel, centerPoint, 333);
            helper[`${!zoomOut ? 'add' : 'remove'}Class`](template, 'zvui-pinch--zoomed-in');
        },
    },
});
