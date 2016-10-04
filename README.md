# React Pinch Zoom

The core library is a fork of [PhotoSwipe](http://photoswipe.com/) component for ReactJS.

## Installations
### NPM
```bash
npm install --save react-pinch-zoom
```

## Usage
### Style
#### With webpack:
```js
import 'react-pinch-zoom/dist/style.css';
```

### JS
#### React Pinch Zoom
```js
import ReactPinchZoom from 'react-pinch-zoom';

let isOpen = true;

let items = [
    {
        src: 'https://dl.dropboxusercontent.com/u/8725581/18982935446_9c0d4157f9_h.jpg',
        w: 1600,
        h: 1067
    }
];

let options = {};

handleClose = () => {
    isOpen: false
};

<ReactPinchZoom isOpen={isOpen} items={items} options={options} onClose={handleClose}  />
```
