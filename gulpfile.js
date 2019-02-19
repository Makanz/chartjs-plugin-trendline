var gulp = require('gulp');
var uglify = require('gulp-uglify');
var pump = require('pump');
var rename = require('gulp-rename');
var del = require('del');
var bump = require('gulp-bump');

gulp.task('clean', function () {
    return del([
        'dist/',
    ]);
});

gulp.task('compress', function (cb) {
    pump([
            gulp.src('src/*.js'),
            uglify(),
            rename('chartjs-plugin-trendline.min.js'),
            gulp.dest('dist/')
        ],
        cb
        );
});

gulp.task('bump-minor', function(){
    return gulp.src(['./package.json', './src/chartjs-plugin-trendline.js'], {base: './'})
    .pipe(bump({type:'minor'}))
    .pipe(gulp.dest('./'));
});

gulp.task('bump-patch', function(){
    return gulp.src(['./package.json', './src/chartjs-plugin-trendline.js'], {base: './'})
    .pipe(bump({type:'patch'}))
    .pipe(gulp.dest('./'));
});

gulp.task('default', gulp.series('clean', 'compress'));