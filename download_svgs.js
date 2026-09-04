const fs = require('fs');
const https = require('https');
const path = require('path');

const logos = {
  epicgames: "https://upload.wikimedia.org/wikipedia/commons/3/31/Epic_Games_logo.svg",
  ubisoft: "https://upload.wikimedia.org/wikipedia/commons/7/78/Ubisoft_logo.svg"
};

const publicDir = path.join(__dirname, 'public', 'logos');

async function downloadLogos() {
  for (const [name, url] of Object.entries(logos)) {
    const dest = path.join(publicDir, `${name}.svg`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2s to avoid 429
    await new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'ParagonApp/1.0 (test@example.com)' } }, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to get ${url} (${res.statusCode})`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    });
    console.log(`Downloaded ${name}.svg`);
  }
}

downloadLogos().catch(console.error);
