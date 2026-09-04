require('dotenv').config({path: '.env.local'});
const id = process.env.IGDB_CLIENT_ID;
const secret = process.env.IGDB_CLIENT_SECRET;
fetch(`https://id.twitch.tv/oauth2/token?client_id=${id}&client_secret=${secret}&grant_type=client_credentials`, {method: 'POST'})
  .then(r => r.json())
  .then(d => {
    fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {'Client-ID': id, 'Authorization': 'Bearer ' + d.access_token},
      body: 'fields name, total_rating, total_rating_count, rating, rating_count, videos.video_id, videos.name, dlcs.name, dlcs.cover.image_id, dlcs.first_release_date, expansions.name, expansions.cover.image_id, franchises.name, collection.name, language_supports.language.native_name, language_supports.language_support_type.name; search "Cyberpunk 2077"; limit 1;'
    }).then(r => r.json()).then(res => console.dir(res, {depth: null}));
  });
