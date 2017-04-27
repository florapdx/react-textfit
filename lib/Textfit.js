'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactDom = require('react-dom');

var _shallowEqual = require('./utils/shallowEqual');

var _shallowEqual2 = _interopRequireDefault(_shallowEqual);

var _series = require('./utils/series');

var _series2 = _interopRequireDefault(_series);

var _whilst = require('./utils/whilst');

var _whilst2 = _interopRequireDefault(_whilst);

var _throttle = require('./utils/throttle');

var _throttle2 = _interopRequireDefault(_throttle);

var _uniqueId = require('./utils/uniqueId');

var _uniqueId2 = _interopRequireDefault(_uniqueId);

var _innerSize = require('./utils/innerSize');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function assertElementFitsWidth(el, width) {
    // -1: temporary bugfix, will be refactored soon
    return el.scrollWidth - 1 <= width;
}

function assertElementFitsHeight(el, height) {
    // -1: temporary bugfix, will be refactored soon
    return el.scrollHeight - 1 <= height;
}

function noop() {}

exports.default = (0, _react.createClass)({

    displayName: 'Textfit',

    propTypes: {
        children: _react.PropTypes.oneOfType([_react.PropTypes.string, _react.PropTypes.func]),
        text: _react.PropTypes.string,
        min: _react.PropTypes.number,
        max: _react.PropTypes.number,
        mode: _react.PropTypes.oneOf(['single', 'multi']),
        forceSingleModeWidth: _react.PropTypes.bool,
        perfectFit: _react.PropTypes.bool,
        throttle: _react.PropTypes.number,
        onReady: _react.PropTypes.func
    },

    getDefaultProps: function getDefaultProps() {
        return {
            min: 1,
            max: 100,
            mode: 'multi',
            forceSingleModeWidth: true,
            perfectFit: true,
            throttle: 50,
            autoResize: true,
            onReady: noop
        };
    },
    getInitialState: function getInitialState() {
        return {
            fontSize: null,
            ready: false
        };
    },
    componentWillMount: function componentWillMount() {
        this.handleWindowResize = (0, _throttle2.default)(this.handleWindowResize, this.props.throttle);
    },
    componentDidMount: function componentDidMount() {
        var autoResize = this.props.autoResize;

        if (autoResize) {
            window.addEventListener('resize', this.handleWindowResize);
        }
        this.process();
    },
    componentDidUpdate: function componentDidUpdate(prevProps) {
        var ready = this.state.ready;

        if (!ready) return;
        if ((0, _shallowEqual2.default)(this.props, prevProps)) return;
        this.process();
    },
    componentWillUnmount: function componentWillUnmount() {
        var autoResize = this.props.autoResize;

        if (autoResize) {
            window.removeEventListener('resize', this.handleWindowResize);
        }
        // Setting a new pid will cancel all running processes
        this.pid = (0, _uniqueId2.default)();
    },
    handleWindowResize: function handleWindowResize() {
        this.process();
    },
    process: function process() {
        var _this = this;

        var _props = this.props,
            min = _props.min,
            max = _props.max,
            mode = _props.mode,
            forceSingleModeWidth = _props.forceSingleModeWidth,
            perfectFit = _props.perfectFit,
            onReady = _props.onReady;

        var el = (0, _reactDom.findDOMNode)(this);
        var wrapper = this.refs.wrapper;


        var originalWidth = (0, _innerSize.innerWidth)(el);
        var originalHeight = (0, _innerSize.innerHeight)(el);

        if (originalHeight <= 0 || isNaN(originalHeight)) {
            console.warn('Can not process element without height. Make sure the element is displayed and has a static height.');
            return;
        }

        if (originalWidth <= 0 || isNaN(originalWidth)) {
            console.warn('Can not process element without width. Make sure the element is displayed and has a static width.');
            return;
        }

        var pid = (0, _uniqueId2.default)();
        this.pid = pid;

        var shouldCancelProcess = function shouldCancelProcess() {
            return pid !== _this.pid;
        };

        var testPrimary = mode === 'multi' ? function () {
            return assertElementFitsHeight(wrapper, originalHeight);
        } : function () {
            return assertElementFitsWidth(wrapper, originalWidth);
        };

        var testSecondary = mode === 'multi' ? function () {
            return assertElementFitsWidth(wrapper, originalWidth);
        } : function () {
            return assertElementFitsHeight(wrapper, originalHeight);
        };

        var mid = void 0;
        var low = min;
        var high = max;

        this.setState({ ready: false });

        (0, _series2.default)([
        // Step 1:
        // Binary search to fit the element's height (multi line) / width (single line)
        function (stepCallback) {
            return (0, _whilst2.default)(function () {
                return low <= high;
            }, function (whilstCallback) {
                if (shouldCancelProcess()) return whilstCallback(true);
                mid = parseInt((low + high) / 2, 10);
                _this.setState({ fontSize: mid }, function () {
                    if (shouldCancelProcess()) return whilstCallback(true);
                    if (testPrimary()) low = mid + 1;else high = mid - 1;
                    return whilstCallback();
                });
            }, stepCallback);
        },
        // Step 2:
        // Binary search to fit the element's width (multi line) / height (single line)
        // If mode is single and forceSingleModeWidth is true, skip this step
        // in order to not fit the elements height and decrease the width
        function (stepCallback) {
            if (mode === 'single' && forceSingleModeWidth) return stepCallback();
            if (testSecondary()) return stepCallback();
            low = min;
            high = mid;
            return (0, _whilst2.default)(function () {
                return low <= high;
            }, function (whilstCallback) {
                if (shouldCancelProcess()) return whilstCallback(true);
                mid = parseInt((low + high) / 2, 10);
                _this.setState({ fontSize: mid }, function () {
                    if (pid !== _this.pid) return whilstCallback(true);
                    if (testSecondary()) low = mid + 1;else high = mid - 1;
                    return whilstCallback();
                });
            }, stepCallback);
        },
        // Step 3
        // Sometimes the text still overflows the elements bounds.
        // If perfectFit is true, decrease fontSize until it fits.
        function (stepCallback) {
            if (!perfectFit) return stepCallback();
            if (testPrimary()) return stepCallback();
            (0, _whilst2.default)(function () {
                return !testPrimary();
            }, function (whilstCallback) {
                if (shouldCancelProcess()) return whilstCallback(true);
                _this.setState({ fontSize: --mid }, whilstCallback);
            }, stepCallback);
        },
        // Step 4
        // Make sure fontSize is always greater than 0
        function (stepCallback) {
            if (mid > 0) return stepCallback();
            mid = 1;
            _this.setState({ fontSize: mid }, stepCallback);
        }], function (err) {
            // err will be true, if another process was triggered
            if (err) return;
            _this.setState({ ready: true }, function () {
                return onReady(mid);
            });
        });
    },
    render: function render() {
        var _props2 = this.props,
            children = _props2.children,
            text = _props2.text,
            style = _props2.style,
            min = _props2.min,
            max = _props2.max,
            mode = _props2.mode,
            forceWidth = _props2.forceWidth,
            forceSingleModeWidth = _props2.forceSingleModeWidth,
            perfectFit = _props2.perfectFit,
            throttle = _props2.throttle,
            autoResize = _props2.autoResize,
            onReady = _props2.onReady,
            props = _objectWithoutProperties(_props2, ['children', 'text', 'style', 'min', 'max', 'mode', 'forceWidth', 'forceSingleModeWidth', 'perfectFit', 'throttle', 'autoResize', 'onReady']);

        var _state = this.state,
            fontSize = _state.fontSize,
            ready = _state.ready;

        var finalStyle = _extends({}, style, {
            fontSize: fontSize
        });

        var wrapperStyle = {
            display: ready ? 'block' : 'inline-block'
        };
        if (mode === 'single') wrapperStyle.whiteSpace = 'nowrap';

        return _react2.default.createElement(
            'div',
            _extends({ style: finalStyle }, props),
            _react2.default.createElement(
                'span',
                { ref: 'wrapper', style: wrapperStyle },
                text && typeof children === 'function' ? ready ? children(text) : text : children
            )
        );
    }
});