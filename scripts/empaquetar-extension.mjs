// Empaqueta extension/ en un .zip (23 oct 2026). Sirve para las dos cosas:
//   - public/descargas/paragon-extension.zip: la descarga de Ajustes →
//     Plataformas mientras la extensión no esté en la Chrome Web Store.
//   - el mismo archivo es el que se sube a la Chrome Web Store.
// Uso: npm run extension:zip  (volver a ejecutarlo al cambiar la extensión).
//
// Sin dependencias: ZIP "store" (sin comprimir) con su CRC-32. Son unos
// pocos KB de JS y un icono, comprimir no compensa una dependencia más.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const origen = join(raiz, "extension");
const destino = join(raiz, "public", "descargas", "paragon-extension.zip");
// El README es para desarrolladores: no va dentro del paquete.
const FUERA = new Set(["README.md"]);

const archivos = (dir) =>
  readdirSync(dir)
    .sort()
    .flatMap((nombre) => {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) return archivos(ruta);
      return FUERA.has(nombre) ? [] : [ruta];
    });

const TABLA = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = TABLA[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// Fecha fija (1 ene 2026): el mismo contenido da el mismo .zip, sin cambios falsos en git.
const HORA_DOS = 0;
const FECHA_DOS = ((2026 - 1980) << 9) | (1 << 5) | 1;

const locales = [];
const central = [];
let desplazamiento = 0;
for (const ruta of archivos(origen)) {
  const nombre = Buffer.from(relative(origen, ruta).split("\\").join("/"));
  const datos = readFileSync(ruta);
  const crc = crc32(datos);

  const cabecera = Buffer.alloc(30);
  cabecera.writeUInt32LE(0x04034b50, 0);
  cabecera.writeUInt16LE(20, 4);
  cabecera.writeUInt16LE(0x0800, 6); // nombres en UTF-8
  cabecera.writeUInt16LE(0, 8); // sin comprimir
  cabecera.writeUInt16LE(HORA_DOS, 10);
  cabecera.writeUInt16LE(FECHA_DOS, 12);
  cabecera.writeUInt32LE(crc, 14);
  cabecera.writeUInt32LE(datos.length, 18);
  cabecera.writeUInt32LE(datos.length, 22);
  cabecera.writeUInt16LE(nombre.length, 26);
  locales.push(cabecera, nombre, datos);

  const entrada = Buffer.alloc(46);
  entrada.writeUInt32LE(0x02014b50, 0);
  entrada.writeUInt16LE(20, 4);
  entrada.writeUInt16LE(20, 6);
  entrada.writeUInt16LE(0x0800, 8);
  entrada.writeUInt16LE(0, 10);
  entrada.writeUInt16LE(HORA_DOS, 12);
  entrada.writeUInt16LE(FECHA_DOS, 14);
  entrada.writeUInt32LE(crc, 16);
  entrada.writeUInt32LE(datos.length, 20);
  entrada.writeUInt32LE(datos.length, 24);
  entrada.writeUInt16LE(nombre.length, 28);
  entrada.writeUInt32LE(desplazamiento, 42);
  central.push(entrada, nombre);

  desplazamiento += cabecera.length + nombre.length + datos.length;
}

const tamCentral = central.reduce((s, b) => s + b.length, 0);
const fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054b50, 0);
fin.writeUInt16LE(central.length / 2, 8);
fin.writeUInt16LE(central.length / 2, 10);
fin.writeUInt32LE(tamCentral, 12);
fin.writeUInt32LE(desplazamiento, 16);

mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, Buffer.concat([...locales, ...central, fin]));
const version = JSON.parse(readFileSync(join(origen, "manifest.json"), "utf8")).version;
console.log(`✓ ${relative(raiz, destino)} · extensión ${version} · ${central.length / 2} archivos`);
