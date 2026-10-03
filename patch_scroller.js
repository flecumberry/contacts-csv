const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<script src="https:\/\/cdn.jsdelivr.net\/npm\/vue-virtual-scroller@2.0.0-beta.8\/dist\/vue-virtual-scroller.umd.js"><\/script>/, '');
html = html.replace(/<link rel="stylesheet" href="https:\/\/cdn.jsdelivr.net\/npm\/vue-virtual-scroller@2.0.0-beta.8\/dist\/vue-virtual-scroller.css" \/>/, '');
fs.writeFileSync('index.html', html);
