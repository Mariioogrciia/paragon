const id = "928fe04da2d74728bf4a85e819bf3f28";
const hashes = {
  playerProfile: ["ff954147a23d38a0e5b050962d442099487da001a0ab4b10ccbec8ac49755b3c", { epicAccountId: id }],
  playerProfilePrivate: ["47d0391fa5ec42d829e4a03f399cb586a29cf3cebd940cc4747aed0192c61114", { epicAccountId: id, locale: "es-ES", page: 1, accountId: id }],
} as const;
for (const [op, [hash, vars]] of Object.entries(hashes)) {
  const url = `https://store.epicgames.com/graphql?operationName=${op}&variables=${encodeURIComponent(JSON.stringify(vars))}&extensions=${encodeURIComponent(JSON.stringify({ persistedQuery: { version: 1, sha256Hash: hash } }))}`;
  const r = await fetch(url, { headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*", "Accept-Language": "es-ES,es;q=0.9", "Origin": "https://store.epicgames.com", "Referer": "https://store.epicgames.com/",
  } });
  const txt = await r.text();
  console.log(op, r.status, r.headers.get("cf-mitigated") ?? "", txt.slice(0, 300).replace(/\s+/g, " "));
}
