#!/usr/bin/env bash
# Recorre las pantallas de la app en el emulador (modo demo, kmp/androidApp/
# src/debug/.../ModoDemo.kt) y guarda una captura de cada una en $SALIDA.
# Lo lanza .github/workflows/capturas-app.yml; las capturas acaban en la rama
# `capturas-app` para revisarlas (auditoría de pantallas, 8 nov 2026).
set -u
SALIDA=${SALIDA:-capturas-salida}
mkdir -p "$SALIDA"
PAQ=com.paragon.app
ACT=$PAQ/.ComposeMainActivity
AQUI=$(dirname "$0")

foto() { sleep "${2:-2}"; adb exec-out screencap -p > "$SALIDA/$1.png"; echo "foto $1"; }
abrir() { adb shell am start -n "$ACT" -a android.intent.action.VIEW -d "paragon://open?path=$1" >/dev/null; sleep 4; }
bajar() { adb shell input swipe 540 1900 540 650 400; sleep 1.5; }
atras() { adb shell input keyevent KEYCODE_BACK; sleep 1.5; }
tocar() { python3 "$AQUI/tocar.py" "$1"; sleep "${2:-2.5}"; }
pantalla() { # nombre ruta [veces que baja]
  abrir "$2"; foto "$1"
  for i in $(seq 1 "${3:-0}"); do bajar; foto "$1-$((i + 1))" 0.5; done
}

# Español, sin animaciones, permiso de avisos dado y modo demo encendido.
adb root >/dev/null 2>&1; sleep 3
adb shell setprop persist.sys.locale es-ES
adb shell setprop ctl.restart zygote; sleep 25; adb wait-for-device
until adb shell getprop sys.boot_completed 2>/dev/null | grep -q 1; do sleep 2; done; sleep 5
for a in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $a 0; done
adb install -r -g "$APK"
adb shell pm grant $PAQ android.permission.POST_NOTIFICATIONS 2>/dev/null
# «Entrar» (sin sesión, antes del modo demo): con animaciones, para ver el muro moverse.
for a in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $a 1; done
adb shell am start -n "$ACT" >/dev/null; foto 00-entrar 15; foto 00-entrar-2 4
adb shell am force-stop $PAQ
for a in window_animation_scale transition_animation_scale animator_duration_scale; do adb shell settings put global $a 0; done
# Dos órdenes sueltas: `adb shell` junta los argumentos y se perderían las comillas de un `sh -c`.
adb shell run-as $PAQ mkdir -p files
adb shell run-as $PAQ touch files/modo_demo
adb shell run-as $PAQ ls files

adb shell am start -n "$ACT" >/dev/null; sleep 15
pantalla 01-panel /panel 2

pantalla 02-biblioteca /biblioteca 2
pantalla 03-comunidad /feed 1
pantalla 04-ligas /ligas 1
tocar "Mes de|Month of|Evento del mes"; foto 04-ligas-evento; atras
tocar "Mis ligas|My leagues"; foto 04-ligas-mis-ligas
tocar "Amigos|Friends"; foto 04-ligas-amigos
tocar "Clan"; foto 04-ligas-clan
pantalla 05-perfil /perfil 1
pantalla 06-perfil-otra-persona /u/nerea 3
pantalla 07-perfil-propio /u/lagrena 1
pantalla 08-ficha /juego/psn-elden 4
tocar "Lista de coleccionables|Collectibles list"; foto 08-ficha-coleccionables; atras
pantalla 09-ficha-platinada /juego/steam-1145360 2
pantalla 10-estadisticas /estadisticas 4
pantalla 11-ritmo /ritmo 2
pantalla 12-enfoque /enfoque 1
pantalla 13-atascados /atascados
pantalla 14-carpetas /carpetas
pantalla 15-ofertas /ofertas 1
pantalla 16-sesiones /sesiones 1
pantalla 17-sesion /sesiones/s0 1
pantalla 18-avisos /avisos
pantalla 19-ajustes /ajustes 2
pantalla 20-apariencia /ajustes/apariencia 3
pantalla 21-cuentas /ajustes/plataformas 1
pantalla 22-preferencias-avisos /ajustes/avisos 2
pantalla 23-preguntar /preguntar
tocar "fin|weekend"; foto 23-preguntar-respuesta 3
pantalla 24-comparar /comparar/nerea 2
pantalla 25-retirados /ajustes/ocultar

# Tema oscuro (el del sistema) y otra pasada por las principales.
adb shell cmd uimode night yes; sleep 3
pantalla 30-oscuro-panel /panel 1
pantalla 31-oscuro-ficha /juego/psn-elden 2
pantalla 32-oscuro-perfil /u/nerea 1
pantalla 33-oscuro-ligas /ligas
pantalla 34-oscuro-estadisticas /estadisticas 2
pantalla 35-oscuro-avisos /avisos
pantalla 36-oscuro-ajustes /ajustes 1
pantalla 37-oscuro-biblioteca /biblioteca
ls -1 "$SALIDA" | wc -l
