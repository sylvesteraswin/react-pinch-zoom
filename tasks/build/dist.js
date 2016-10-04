import gulp from 'gulp';
import taskDir from 'task-dir';
import runSequence from 'run-sequence';
import path from 'path';

taskDir(gulp, path.join(__dirname, 'dist'));

module.exports = (callback) => {
    runSequence('build:dist:clean', 'build:dist:lint', 'build:dist:babel', 'build:dist:umd', callback);
};;
