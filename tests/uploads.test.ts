import { describe, expect, it } from "vitest";
import { firmaCoincide } from "@/lib/uploads";

const bytes = (...b: number[]) => Buffer.from([...b, ...new Array(16).fill(0)]);
const ascii = (texto: string, relleno = 16) => Buffer.concat([Buffer.from(texto, "latin1"), Buffer.alloc(relleno)]);

describe("firmaCoincide", () => {
  it("reconoce cada formato por su firma", () => {
    expect(firmaCoincide("image/jpeg", bytes(0xff, 0xd8, 0xff))).toBe(true);
    expect(firmaCoincide("image/png", bytes(0x89, 0x50, 0x4e, 0x47))).toBe(true);
    expect(firmaCoincide("image/gif", ascii("GIF89a"))).toBe(true);
    expect(firmaCoincide("image/webp", ascii("RIFF\0\0\0\0WEBP"))).toBe(true);
    expect(firmaCoincide("video/mp4", ascii("\0\0\0\x18ftypmp42"))).toBe(true);
    expect(firmaCoincide("video/webm", bytes(0x1a, 0x45, 0xdf, 0xa3))).toBe(true);
  });

  it("rechaza un HTML disfrazado de imagen", () => {
    const html = ascii("<!doctype html><script>alert(1)</script>");
    for (const mime of ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"]) {
      expect(firmaCoincide(mime, html)).toBe(false);
    }
  });

  it("rechaza tipos no admitidos", () => {
    expect(firmaCoincide("text/html", bytes(0xff, 0xd8, 0xff))).toBe(false);
  });
});
