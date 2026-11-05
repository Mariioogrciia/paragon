import { describe, expect, it } from "vitest";
import { rss } from "@/lib/rssFeed";

describe("rss", () => {
  it("escapa el texto y pone una entrada por trofeo", () => {
    const xml = rss(
      { titulo: "Trofeos de @a", enlace: "https://x.test/u/a", descripcion: "d", propio: "https://x.test/rss", idioma: "es" },
      [{ guid: "g:1", titulo: "Oro · <Tom & Jerry>", enlace: "https://x.test/u/a/g", fecha: new Date("2026-11-05T10:00:00Z"), imagen: "https://x.test/i.png" }],
    );
    expect(xml).toContain("<title>Oro · &lt;Tom &amp; Jerry&gt;</title>");
    expect(xml).toContain("<pubDate>Thu, 05 Nov 2026 10:00:00 GMT</pubDate>");
    expect(xml).toContain('type="image/png"');
    expect(xml.match(/<item>/g)).toHaveLength(1);
  });
});
