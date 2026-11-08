"""Toca en el emulador el primer elemento cuyo texto o descripción coincida.

Uso: python3 tocar.py "Mis ligas|My leagues"   (alternativas separadas por |)
Primero busca coincidencia exacta y luego parcial. Si no lo encuentra, lo dice
y sale sin error: una captura de menos no debe parar el recorrido.
"""
import re
import subprocess
import sys
import xml.etree.ElementTree as ET


def adb(*args):
    return subprocess.run(["adb", *args], capture_output=True, text=True).stdout


def nodos():
    adb("shell", "uiautomator", "dump", "/sdcard/vista.xml")
    xml = adb("shell", "cat", "/sdcard/vista.xml")
    if "<" not in xml:
        return []
    return list(ET.fromstring(xml[xml.index("<"):]).iter("node"))


def tocar(nodo):
    x1, y1, x2, y2 = map(int, re.findall(r"\d+", nodo.get("bounds")))
    adb("shell", "input", "tap", str((x1 + x2) // 2), str((y1 + y2) // 2))


opciones = [o.strip() for o in sys.argv[1].split("|") if o.strip()]
lista = nodos()
for exacta in (True, False):
    for o in opciones:
        for n in lista:
            for campo in ("text", "content-desc"):
                v = (n.get(campo) or "").strip()
                if (v == o) if exacta else (o.lower() in v.lower() and v):
                    tocar(n)
                    print("tocado:", o)
                    sys.exit(0)
print("NO ENCONTRADO:", sys.argv[1])
