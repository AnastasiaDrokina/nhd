const fs = require('fs');
const path = require('path');
const { series, src, dest, watch } = require(`gulp`);
const plumber = require(`gulp-plumber`);
const sass = require(`gulp-dart-sass`);
const sourcemaps = require(`gulp-sourcemaps`);
const rename = require(`gulp-rename`);
const postcss = require(`gulp-postcss`);
const autoprefixer = require(`autoprefixer`);
const cssnano = require(`cssnano`);
const imagemin = require(`gulp-imagemin`);
const webp = require(`gulp-webp`);
const svgstore = require(`gulp-svgstore`);
const browserSync = require(`browser-sync`).create();
const sassGlob = require(`gulp-sass-glob`);
const babelify = require(`babelify`);
const browserify = require(`browserify`);
const source = require(`vinyl-source-stream`);
const buffer = require(`vinyl-buffer`);
const del = require(`del`);
const twig = require('gulp-twig');
const data = require('gulp-data');

function css() {
  const plugins = [
    autoprefixer(),
    cssnano()
  ];

  return src(`source/sass/*.scss`)
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(sass())
    .pipe(postcss(plugins))
    .pipe(rename(function (path) {
      return {
        dirname: path.dirname,
        basename: path.basename + `.min`,
        extname: `.css`
      };
    }))
    .pipe(sourcemaps.write(`.`))
    .pipe(dest(`build/css/`))
    .pipe(browserSync.stream());
}

function img() {
  return src(`source/img/**/*.{jpg,png,svg}`)
    .pipe(imagemin([
      imagemin.mozjpeg({ quality: 75, progressive: true }),
      imagemin.optipng({ optimizationLevel: 5 }),
      imagemin.svgo({
        plugins: [
          { removeViewBox: false },
          { cleanupIDs: false }
        ]
      })
    ]))
    .pipe(dest(`build/img/`));
}


function imgWebp() {
  return src(`build/img/**/*.{jpg,png}`)
    .pipe(webp({ quality: 90 }))
    .pipe(dest(`build/img/`));
}

function sprite() {
  return src(`source/img/icons/*.svg`)
    .pipe(imagemin([
      imagemin.svgo({
        plugins: [
          { removeViewBox: false },
          { cleanupIDs: false }
        ]
      })
    ]))
    .pipe(svgstore({ inlineSvg: true }))
    .pipe(rename(`sprite_auto.svg`))
    .pipe(dest(`build/img`));
}

function html() {
  return src(`source/templates/**/[^_]*.twig`)
    .pipe(data(file => {
      const filename = path.basename(file.path, '.twig');
      if (fs.existsSync(`source/data/${filename}.json`)) {
        return JSON.parse(fs.readFileSync(`source/data/${filename}.json`))
      }
      return;
    }))
    .pipe(twig({
      base: 'source/templates'
    }))
    .pipe(dest(`build/`));
};

function js() {
  return browserify([`source/js/script.js`])
    .transform(babelify, { presets: [`@babel/preset-env`] })
    .bundle()
    .pipe(source(`script.js`))
    .pipe(dest(`build/js`))
    .pipe(buffer())
    .pipe(browserSync.stream());
}

function server() {
  browserSync.init({
    server: `./build`,
    notify: false,
    open: true,
    cors: true,
    ui: false
  });

  watch(`source/sass/**/*.scss`, css);
  watch(`source/js/**/*.js`, js);
  watch(`source/img/icons/*.svg`, series(sprite, html, refresh));
  watch([`source/templates/**/*.twig`, `source/data/*.json`], series(html, refresh));
}

function refresh(done) {
  browserSync.reload();
  done();
}

function copy() {
  return src([
    `source/fonts/**/*.{woff,woff2}`,
    `source/img/**`,
    `source//*.ico`
  ], {
    base: `source`
  })
    .pipe(dest(`build/`));
}

function clean() {
  return del(`build`);
}

exports.default = series(clean, copy, css, img, imgWebp, sprite, html, js, server);
exports.build = series(clean, copy, css, img, imgWebp, sprite, html, js);
exports.a = series(html);
