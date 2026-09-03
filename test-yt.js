fetch('https://www.youtube.com/results?search_query=Elden+Ring+Master+of+Rings+guide')
  .then(r=>r.text())
  .then(t => { 
    const match = t.match(/"videoId":"([a-zA-Z0-9_-]{11})"/); 
    console.log(match ? match[1] : 'not found'); 
  })
