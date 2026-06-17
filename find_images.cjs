const fs = require('fs');
const path = require('path');

function walk(dir) {
  let list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    let stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.aistudio')) {
        walk(file);
      }
    } else {
      if (file.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        console.log(file);
      }
    }
  }
}

walk('.');
