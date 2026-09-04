require('dotenv').config({path: '.env.local'});
const id = process.env.IGDB_CLIENT_ID;
const secret = process.env.IGDB_CLIENT_SECRET;
fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, {method: 'POST'})
  .then(r => r.json())
  .then(d => {
    fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {'Client-ID': id, 'Authorization': 'Bearer ' + d.access_token},
      body: 'fields name, artworks.image_id, game_logos.image_id; search "Elden Ring"; limit 1;'
    }).then(r => r.json()).then(res => console.dir(res, {depth: null}));
  });
