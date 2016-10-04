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
