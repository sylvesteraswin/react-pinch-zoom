import gulp from 'gulp';
import eslint from 'gulp-eslint';

module.exports = () => {
  return gulp
    .src(['src/Photoswipe/js/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failOnError());
};
