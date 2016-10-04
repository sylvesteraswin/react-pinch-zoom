/**
 *
 * history.js:
 *
 * - Back button to close gallery.
 *
 * - Unique URL for each slide: example.com/&pid=1&gid=3
 *   (where PID is picture index, and GID and gallery index)
 *
 * - Switch URL when slides change.
 *
 */


const _historyDefaultOptions = {
    history: true,
    galleryUID: 1,
};

let _historyUpdateTimeout;
let _hashChangeTimeout;
let _hashAnimCheckTimeout;
let _hashChangedByScript;
let _hashChangedByHistory;
let _hashReseted;
let _initialHash;
let _historyChanged;
let _closedFromURL;
let _urlChangedOnce;
let _windowLoc;
let _supportsPushState;
const _getHash = () => _windowLoc.hash.substring(1);

const _cleanHistoryTimeouts = () => {

    if (_historyUpdateTimeout) {
        clearTimeout(_historyUpdateTimeout);
    }

    if (_hashAnimCheckTimeout) {
        clearTimeout(_hashAnimCheckTimeout);
    }
};

// pid - Picture index
// gid - Gallery index
const _parseItemIndexFromURL = () => {
    const hash = _getHash();
    const params = {};

    if (hash.length < 5) { // pid=1
        return params;
    }

    let i;
    const vars = hash.split('&');
    for (i = 0; i < vars.length; i++) {
        if (!vars[i]) {
            continue;
        }
        const pair = vars[i].split('=');
        if (pair.length < 2) {
            continue;
        }
        params[pair[0]] = pair[1];
    }
    if (_options.galleryPIDs) {
        // detect custom pid in hash and search for it among the items collection
        const searchfor = params.pid;
        params.pid = 0; // if custom pid cannot be found, fallback to the first item
        for (i = 0; i < _items.length; i++) {
            if (_items[i].pid === searchfor) {
                params.pid = i;
                break;
            }
        }
    } else {
        params.pid = parseInt(params.pid, 10) - 1;
    }
    if (params.pid < 0) {
        params.pid = 0;
    }
    return params;
};

const _updateHash = () => {

    if (_hashAnimCheckTimeout) {
        clearTimeout(_hashAnimCheckTimeout);
    }


    if (_numAnimations || _isDragging) {
        // changing browser URL forces layout/paint in some browsers, which causes noticable lag during animation
        // that's why we update hash only when no animations running
        _hashAnimCheckTimeout = setTimeout(_updateHash, 500);
        return;
    }

    if (_hashChangedByScript) {
        clearTimeout(_hashChangeTimeout);
    } else {
        _hashChangedByScript = true;
    }


    let pid = (_currentItemIndex + 1);
    const item = _getItemAt(_currentItemIndex);
    if (item.hasOwnProperty('pid')) {
        // carry forward any custom pid assigned to the item
        pid = item.pid;
    }
    const newHash = `${_initialHash}&gid=${_options.galleryUID}&pid=${pid}`;

    if (!_historyChanged) {
        if (!_windowLoc.hash.includes(newHash)) {
            _urlChangedOnce = true;
        }
        // first time - add new hisory record, then just replace
    }

    const newURL = `${_windowLoc.href.split('#')[0]}#${newHash}`;

    if (_supportsPushState) {

        if (`#${newHash}` !== window.location.hash) {
            history[_historyChanged ? 'replaceState' : 'pushState']('', document.title, newURL);
        }

    } else {
        if (_historyChanged) {
            _windowLoc.replace(newURL);
        } else {
            _windowLoc.hash = newHash;
        }
    }



    _historyChanged = true;
    _hashChangeTimeout = setTimeout(() => {
        _hashChangedByScript = false;
    }, 60);
};





_registerModule('History', {



    publicMethods: {
        initHistory() {

            helper.extend(_options, _historyDefaultOptions, true);

            if (!_options.history) {
                return;
            }


            _windowLoc = window.location;
            _urlChangedOnce = false;
            _closedFromURL = false;
            _historyChanged = false;
            _initialHash = _getHash();
            _supportsPushState = ('pushState' in history);


            if (_initialHash.includes('gid=')) {
                _initialHash = _initialHash.split('&gid=')[0];
                _initialHash = _initialHash.split('?gid=')[0];
            }


            _listen('afterChange', self.updateURL);
            _listen('unbindEvents', () => {
                helper.unbind(window, 'hashchange', self.onHashChange);
            });


            const returnToOriginal = () => {
                _hashReseted = true;
                if (!_closedFromURL) {

                    if (_urlChangedOnce) {
                        history.back();
                    } else {

                        if (_initialHash) {
                            _windowLoc.hash = _initialHash;
                        } else {
                            if (_supportsPushState) {

                                // remove hash from url without refreshing it or scrolling to top
                                history.pushState('', document.title, _windowLoc.pathname + _windowLoc.search);
                            } else {
                                _windowLoc.hash = '';
                            }
                        }
                    }

                }

                _cleanHistoryTimeouts();
            };


            _listen('unbindEvents', () => {
                if (_closedByScroll) {
                    // if PhotoSwipe is closed by scroll, we go "back" before the closing animation starts
                    // this is done to keep the scroll position
                    returnToOriginal();
                }
            });
            _listen('destroy', () => {
                if (!_hashReseted) {
                    returnToOriginal();
                }
            });
            _listen('firstUpdate', () => {
                _currentItemIndex = _parseItemIndexFromURL().pid;
            });




            const index = _initialHash.indexOf('pid=');
            if (index > -1) {
                _initialHash = _initialHash.substring(0, index);
                if (_initialHash.slice(-1) === '&') {
                    _initialHash = _initialHash.slice(0, -1);
                }
            }


            setTimeout(() => {
                if (_isOpen) { // hasn't destroyed yet
                    helper.bind(window, 'hashchange', self.onHashChange);
                }
            }, 40);

        },
        onHashChange() {

            if (_getHash() === _initialHash) {

                _closedFromURL = true;
                self.close();
                return;
            }
            if (!_hashChangedByScript) {

                _hashChangedByHistory = true;
                self.goTo(_parseItemIndexFromURL().pid);
                _hashChangedByHistory = false;
            }

        },
        updateURL() {

            // Delay the update of URL, to avoid lag during transition,
            // and to not to trigger actions like "refresh page sound" or "blinking favicon" to often

            _cleanHistoryTimeouts();


            if (_hashChangedByHistory) {
                return;
            }

            if (!_historyChanged) {
                _updateHash(); // first time
            } else {
                _historyUpdateTimeout = setTimeout(_updateHash, 800);
            }
        },
    },
});
