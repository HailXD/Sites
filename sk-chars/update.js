const fs = require('fs');

fs.readFile('com.xml', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  const keyRegex = /<key>([^<]+)<\/key>/g;
  let match;
  while ((match = keyRegex.exec(data)) !== null) {
    const key = match[1];
    if (key.includes('c0') && !key.toLowerCase().includes('local')) {
      const segments = key.split('_');
      console.log(segments[0]);
      process.exit();
    }
  }
});

// *_gems
// *_c{char}_skin*