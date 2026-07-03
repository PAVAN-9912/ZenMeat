const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const outdir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(outdir)) fs.mkdirSync(outdir);

esbuild.build({
  entryPoints: ['app.js'],
  bundle: false,
  minify: false,
  sourcemap: true,
  outfile: path.join(outdir, 'app.js'),
  loader: {
    '.js': 'js'
  }
}).then(() => {
  fs.copyFileSync('index.html', path.join(outdir, 'index.html'));
  fs.copyFileSync('styles.css', path.join(outdir, 'styles.css'));
  console.log('Build complete. Output in dist/');
}).catch(err => {
  console.error(err);
  process.exit(1);
});
