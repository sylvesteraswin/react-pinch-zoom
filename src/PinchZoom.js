import React, { PropTypes, Component } from 'react';
import ReactDOM from 'react-dom';
import ZVUIPunch from '../lib/photoswipe.js';
import ZVUIPunch_Default from '../lib/photoswipe-ui-default.js';
import classnames from 'classnames';
import events from './events';
import '../lib/main.css';

const BASE_CLASS="zvui-pinch";

class PinchZoom extends Component {
    static propTypes = {
        isOpen: PropTypes.bool.isRequired,
        items: PropTypes.array.isRequired,
        options: PropTypes.object,
        onClose: PropTypes.func,
        id: PropTypes.string,
        className: PropTypes.string,
    };

    static defaultProps = {
        items: [],
        options: {},
    };

    state = {
        isOpen: false
    };

    componentDidMount = () => {
        let {
            isOpen
        } = this.state;
        if (isOpen) {
            this.openPhotoSwipe(this.props);
        }
    };

    componentWillReceiveProps = (nextProps) => {
        let {
            isOpen
        } = this.state;

        if (nextProps.isOpen) {
            if (!isOpen) {
                this.openPhotoSwipe(nextProps);
            } else {
                this.updateItems(nextProps.items);
            }
        } else if(isOpen) {
            this.closePhotoSwipe();
        }
    };

    componentWillUnmount = () => {
        this.closePhotoSwipe();
    };

    openPhotoSwipe = (props) => {
        let {
            items,
            options,
            ...other
        } = props;

        let zvuiPinchElement = ReactDOM.findDOMNode(this);
        this.photoSwipe = new Photoswipe(zvuiPinchElement, PhotoswipeUIDefault, items, options);
        events.forEach(event => {
            let callback = props[event];
            if (callback || event === 'destroy') {
                let self = this;
                this.photoSwipe.listen(event, function() {
                    if (callback) {
                        let args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments));
                        args.unshift(this);
                        callback(...args);
                    }
                    if (event === 'destroy') {
                        self.handleClose();
                    }
                });
            }
        });
        this.setState({
            isOpen: true,
        }, () => {
            this.photoSwipe.inti()
        });
    };

    updateItems = (items = []) => {
        this.photoSwipe.items.length = 0;
        items.forEach((item) => {
            this.photoSwipe.items.push(item);
        });
    };

    closePhotoSwipe = () => {
        if (!this.photoSwipe) {
            return;
        }
        this.photoSwipe.close();
    };

    handleClose = () => {
        let {
            onClose
        } = this.props;

        this.setState({
            isOpen: false
        }, () => {
            if (onClose) {
                onClose();
            }
        });
    };

    render() {
        let {
            id,
            className
        } = this.props;
        className = classnames([BASE_CLASS, className]).trim();

        return (
            <div
                id={id}
                className={className}
                tabIndex="-1"
                role="dialog"
                >
                <div className={`${BASE_CLASS}__bg`} />
                <div className={`${BASE_CLASS}__scroll-wrap`} />
                <div className={`${BASE_CLASS}__container`}>
                    <div className={`${BASE_CLASS}__item`} />
                    <div className={`${BASE_CLASS}__item`} />
                    <div className={`${BASE_CLASS}__item`} />
                </div>
                <div className={`${BASE_CLASS}__ui ${BASE_CLASS}__ui--hidden`}>
                  <div className={`${BASE_CLASS}__top-bar`}>
                    <button className={`${BASE_CLASS}__button ${BASE_CLASS}__button--close`} title="Close (Esc)"></button>

                    <button className={`${BASE_CLASS}__button ${BASE_CLASS}__button--share`} title="Share"></button>

                    <button className={`${BASE_CLASS}__button ${BASE_CLASS}__button--fs`} title="Toggle fullscreen"></button>

                    <button className={`${BASE_CLASS}__button ${BASE_CLASS}__button--zoom`} title="Zoom in/out"></button>

                    <div className={`${BASE_CLASS}__preloader`}>
                        <div className={`${BASE_CLASS}__preloader__icn`}>
                          <div className={`${BASE_CLASS}__preloader__cut`}>
                            <div className={`${BASE_CLASS}__preloader__donut`}></div>
                          </div>
                        </div>
                    </div>
                  </div>
                </div>
            </div>
        );
    }
}

export default PinchZoom;
