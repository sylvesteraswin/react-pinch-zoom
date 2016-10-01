import gulp from 'gulp';
import webpackStream from 'webpack-stream';
import webpackConfig from '../../../webpack.config';
import webpack from 'webpack';

module.exports = () => {
  return gulp
    .src([
      'index.js'
    ])
    .pipe(webpackStream(webpackConfig, webpack))
    .pipe(gulp.dest('dist'));
};
