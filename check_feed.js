const Parser = require('rss-parser');
const parser = new Parser();

async function check() {
  try {
    const feed = await parser.parseURL('https://blog.playstation.com/tag/ps-plus/feed/');
    console.log("Feed items:");
    feed.items.forEach(item => console.log(item.title));
  } catch (e) {
    console.error(e);
  }
}
check();
