// Adds the home-screen app tags to the exported web page. iPhones need these
// (and a home-screen install) before a web page may show alerts.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(file, 'utf8');
const tags = [
  '<link rel="manifest" href="/manifest.json">',
  '<link rel="apple-touch-icon" href="/icon-180.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="Chores">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
  '<meta name="theme-color" content="#17221f">',
].join('');
if (!html.includes('rel="manifest"')) html = html.replace('</head>', tags + '</head>');
fs.writeFileSync(file, html);
console.log('Added home-screen tags to dist/index.html');
