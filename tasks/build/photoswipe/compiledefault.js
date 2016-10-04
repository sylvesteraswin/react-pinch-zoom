import gulp from 'gulp';
import wrap from 'gulp-wrap';
import wrapUMD from 'gulp-wrap-umd';
import concat from 'gulp-concat';
import uglify from 'gulp-uglify';

module.exports = () => {
    return gulp
        .src([
            'src/Photoswipe/js/ui/photoswipe-ui-default.js'
        ])
        .pipe(concat('photoswipe-ui-default.js'))
        .pipe(wrap('function(zvuiPinch, helper) { <%= contents %> }'))
        .pipe(wrapUMD({
            namespace: 'ZVUIPinch_Default'
        }))
        .pipe(gulp.dest('lib'));
};
