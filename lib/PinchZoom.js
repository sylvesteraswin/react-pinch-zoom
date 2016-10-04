'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _reactDom2 = _interopRequireDefault(_reactDom);

var _photoswipe = require('../lib/photoswipe.js');

var _photoswipe2 = _interopRequireDefault(_photoswipe);

var _photoswipeUiDefault = require('../lib/photoswipe-ui-default.js');

var _photoswipeUiDefault2 = _interopRequireDefault(_photoswipeUiDefault);

var _classnames = require('classnames');

var _classnames2 = _interopRequireDefault(_classnames);

var _events = require('./events');

var _events2 = _interopRequireDefault(_events);

require('../lib/main.css');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BASE_CLASS = "zvui-pinch";

var PinchZoom = function (_Component) {
    _inherits(PinchZoom, _Component);

    function PinchZoom() {
        var _ref;

        var _temp, _this, _ret;

        _classCallCheck(this, PinchZoom);

        for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
        }

        return _ret = (_temp = (_this = _possibleConstructorReturn(this, (_ref = PinchZoom.__proto__ || Object.getPrototypeOf(PinchZoom)).call.apply(_ref, [this].concat(args))), _this), _initialiseProps.call(_this), _temp), _possibleConstructorReturn(_this, _ret);
    }

    _createClass(PinchZoom, [{
        key: 'render',
        value: function render() {
            var _props = this.props;
            var id = _props.id;
            var className = _props.className;

            className = (0, _classnames2.default)([BASE_CLASS, className]).trim();

            return _react2.default.createElement(
                'div',
                {
                    id: id,
                    className: className,
                    tabIndex: '-1',
                    role: 'dialog'
                },
                _react2.default.createElement('div', { className: BASE_CLASS + '__bg' }),
                _react2.default.createElement(
                    'div',
                    { className: BASE_CLASS + '__scroll-wrap' },
                    _react2.default.createElement(
                        'div',
                        { className: BASE_CLASS + '__container' },
                        _react2.default.createElement('div', { className: BASE_CLASS + '__item' }),
                        _react2.default.createElement('div', { className: BASE_CLASS + '__item' }),
                        _react2.default.createElement('div', { className: BASE_CLASS + '__item' })
                    ),
                    _react2.default.createElement(
                        'div',
                        { className: BASE_CLASS + '__ui ' + BASE_CLASS + '__ui--hidden' },
                        _react2.default.createElement(
                            'div',
                            { className: BASE_CLASS + '__top-bar' },
                            _react2.default.createElement('button', { className: BASE_CLASS + '__button ' + BASE_CLASS + '__button--close', title: 'Close (Esc)' }),
                            _react2.default.createElement('div', { className: BASE_CLASS + '__preloader' })
                        )
                    )
                )
            );
        }
    }]);

    return PinchZoom;
}(_react.Component);

PinchZoom.propTypes = {
    isOpen: _react.PropTypes.bool.isRequired,
    items: _react.PropTypes.array.isRequired,
    options: _react.PropTypes.object,
    onClose: _react.PropTypes.func,
    id: _react.PropTypes.string,
    className: _react.PropTypes.string
};
PinchZoom.defaultProps = {
    items: [],
    options: {}
};

var _initialiseProps = function _initialiseProps() {
    var _this2 = this;

    this.state = {
        isOpen: false
    };

    this.componentDidMount = function () {
        var isOpen = _this2.state.isOpen;

        if (isOpen) {
            _this2.openPhotoSwipe(_this2.props);
        }
    };

    this.componentWillReceiveProps = function (nextProps) {
        var isOpen = _this2.state.isOpen;


        if (nextProps.isOpen) {
            if (!isOpen) {
                _this2.openPhotoSwipe(nextProps);
            } else {
                _this2.updateItems(nextProps.items);
            }
        } else if (isOpen) {
            _this2.closePhotoSwipe();
        }
    };

    this.componentWillUnmount = function () {
        _this2.closePhotoSwipe();
    };

    this.openPhotoSwipe = function (props) {
        var items = props.items;
        var options = props.options;

        var other = _objectWithoutProperties(props, ['items', 'options']);

        var zvuiPinchElement = _reactDom2.default.findDOMNode(_this2);
        _this2.zvuiPinch = new _photoswipe2.default(zvuiPinchElement, _photoswipeUiDefault2.default, items, options);
        console.log(_this2.zvuiPinch);
        _events2.default.forEach(function (event) {
            var callback = props[event];
            if (callback || event === 'destroy') {
                (function () {
                    var self = _this2;
                    _this2.zvuiPinch.listen(event, function () {
                        if (callback) {
                            var _args = arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments);
                            _args.unshift(this);
                            callback.apply(undefined, _toConsumableArray(_args));
                        }
                        if (event === 'destroy') {
                            self.handleClose();
                        }
                    });
                })();
            }
        });
        _this2.setState({
            isOpen: true
        }, function () {
            _this2.zvuiPinch.init();
        });
    };

    this.updateItems = function () {
        var items = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

        _this2.zvuiPinch.items.length = 0;
        items.forEach(function (item) {
            _this2.zvuiPinch.items.push(item);
        });
    };

    this.closePhotoSwipe = function () {
        if (!_this2.zvuiPinch) {
            return;
        }
        _this2.zvuiPinch.close();
    };

    this.handleClose = function () {
        var onClose = _this2.props.onClose;


        _this2.setState({
            isOpen: false
        }, function () {
            if (onClose) {
                onClose();
            }
        });
    };
};

exports.default = PinchZoom;