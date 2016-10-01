import gulp from 'gulp';
import taskDir from 'task-dir';
import runSequence from 'run-sequence';
import path from 'path';

taskDir(gulp, path.join(__dirname, 'photoswipe'));

module.exports = (callback) => {
    runSequence('build:photoswipe:clean', /* 'build:photoswipe:lint', */ 'build:photoswipe:css', 'build:photoswipe:compiledefault', 'build:photoswipe:compile', callback);
};;
