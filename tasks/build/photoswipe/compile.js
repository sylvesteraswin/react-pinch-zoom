import gulp from 'gulp';
import wrap from 'gulp-wrap';
import wrapUMD from 'gulp-wrap-umd';
import concat from 'gulp-concat';
import uglify from 'gulp-uglify';

module.exports = () => {
    return gulp
        .src([
            'src/Photoswipe/js/helper.js',
            'src/Photoswipe/js/core.js',
            'src/Photoswipe/js/gestures.js',
            'src/Photoswipe/js/show-hide-transition.js',
            'src/Photoswipe/js/items-controller.js',
            'src/Photoswipe/js/tap.js'/*,
            'src/Photoswipe/js/desktop-zoom.js',
            'src/Photoswipe/js/history.js'*/
        ])
        .pipe(concat('photoswipe.js'))
        .pipe(wrap('function(template, UiClass, items, options) { <%= contents %> helper.extend(self, publicMethods); }'))
        .pipe(wrapUMD({
            namespace: 'ZVUIPinch'
        }))
        .pipe(gulp.dest('lib'));
};
