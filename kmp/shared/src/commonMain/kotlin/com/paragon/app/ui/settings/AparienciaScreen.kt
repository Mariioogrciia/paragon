package com.paragon.app.ui.settings

import com.paragon.shared.i18n.stringResource

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb

import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Texto
import com.paragon.shared.i18n.Textos
import com.paragon.app.data.AparienciaRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.theme.ThemeMode
import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.ui.theme.ACENTOS
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Accent2
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.AcentoDef
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.ESTILOS
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.OnAccent
import com.paragon.app.ui.theme.Platinum
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.TAMANOS_TEXTO
import com.paragon.app.ui.theme.colorDeHex
import com.paragon.app.ui.theme.radio
import kotlinx.coroutines.launch

/**
 * Ajustes → Apariencia (4 oct 2026): las mismas opciones que la web en
 * /ajustes/apariencia, guardadas en la cuenta (lo que se elige aquí sale en
 * la web y al revés). Arriba, una muestra en vivo con piezas reales de la
 * app (cifra de platinos, barra de progreso, botón y chip), para ver el
 * cambio sin salir de la pantalla.
 */
private data class TemaRapido(val nombre: Texto, val modo: ThemeMode, val acento: String, val estilo: String)

private val TEMAS_RAPIDOS = listOf(
    TemaRapido(T.tema_rapido_neon, ThemeMode.OLED, "accent-violet", "estilo-terminal"),
    TemaRapido(T.tema_rapido_dia, ThemeMode.CLARO, "accent-green", "estilo-vidrio"),
    TemaRapido(T.tema_rapido_combate, ThemeMode.OSCURO, "accent-red", "estilo-brutalista"),
    TemaRapido(T.tema_rapido_contraste, ThemeMode.CONTRASTE, "", ""),
)

private val MODOS = listOf(
    ThemeMode.SISTEMA to T.tema_sistema,
    ThemeMode.OSCURO to T.tema_oscuro,
    ThemeMode.CLARO to T.tema_claro,
    ThemeMode.OLED to T.tema_oled,
    ThemeMode.CONTRASTE to T.tema_contraste,
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun AparienciaScreen(tokenStore: TokenStore, themeStore: ThemeStore, onBack: () -> Unit) {
    val scope = rememberCoroutineScope()
    val repo = remember(tokenStore, themeStore) { AparienciaRepository(tokenStore, themeStore) }
    fun guardar() { scope.launch { repo.guardar() } }
    var editandoLibre by remember { mutableStateOf(false) }
    val materialYou = themeStore.useDynamicColor

    Scaffold(
        containerColor = Background,
        topBar = {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = Textos.t(T.comun_atras), tint = Foreground)
                }
                Text(
                    text = Textos.t(T.apariencia_titulo),
                    color = Foreground,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(start = 16.dp),
                )
            }
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            Muestra()

            Seccion(T.apariencia_temas)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                TEMAS_RAPIDOS.forEach { t ->
                    val bloqueado = (themeStore.requisitosEstilo[t.estilo] ?: 0) > themeStore.nivel
                    val activo = themeStore.mode == t.modo && themeStore.acento == t.acento && themeStore.estilo == t.estilo &&
                        themeStore.acentoLibre.isEmpty() && themeStore.paletaJuego == null
                    Chip(stringResource(t.nombre), activo, enabled = !bloqueado) {
                        themeStore.setMode(t.modo)
                        themeStore.setAcento(t.acento)
                        themeStore.setEstilo(t.estilo)
                        guardar()
                    }
                }
            }

            Seccion(T.apariencia_modo)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                MODOS.forEach { (modo, nombre) ->
                    Chip(stringResource(nombre), themeStore.mode == modo) { themeStore.setMode(modo) }
                }
            }
            Nota(T.apariencia_modo_nota)

            Seccion(T.apariencia_acento)
            // Material You solo existe en Android 12+ (en iOS, nunca).
            if (com.paragon.app.ui.theme.platformDynamicColorScheme(true) != null) {
                FilaInterruptor(
                    titulo = Textos.t(T.ajustes_material),
                    subtitulo = Textos.t(T.apariencia_material_sub),
                    activo = materialYou,
                ) { themeStore.setUseDynamicColor(it) }
                Spacer(Modifier.height(12.dp))
            }
            Column(Modifier.alpha(if (materialYou) 0.45f else 1f)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    ACENTOS.forEach { a ->
                        val activo = !materialYou && themeStore.paletaJuego == null && themeStore.acentoLibre.isEmpty() && themeStore.acento == a.clave
                        Muestrario(a, activo, stringResource(a.nombre), enabled = !materialYou) {
                            themeStore.setAcento(a.clave)
                            guardar()
                        }
                    }
                    val libre = themeStore.acentoLibre.takeIf { it.isNotEmpty() }?.let { colorDeHex(it) }
                    MuestrarioLibre(libre, activo = !materialYou && libre != null && themeStore.paletaJuego == null, enabled = !materialYou) {
                        editandoLibre = true
                    }
                    themeStore.paletaJuego?.let { p ->
                        MuestrarioColor(colorDeHex(p.color) ?: p.oscuro, p.suelo.background, activo = !materialYou, descripcion = Textos.t(T.apariencia_juego), enabled = false) {}
                    }
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    text = when {
                        materialYou -> Textos.t(T.apariencia_material_activo)
                        themeStore.paletaJuego != null -> Textos.t(T.apariencia_juego_nota)
                        themeStore.acentoLibre.isNotEmpty() -> Textos.t(T.apariencia_libre_actual, themeStore.acentoLibre.uppercase())
                        else -> stringResource(ACENTOS.first { it.clave == themeStore.acento }.nombre)
                    },
                    color = Muted,
                    fontSize = 13.sp,
                )
            }

            Seccion(T.apariencia_estilo)
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                ESTILOS.forEach { e ->
                    val requisito = themeStore.requisitosEstilo[e.clave] ?: 0
                    val bloqueado = requisito > themeStore.nivel
                    FilaEstilo(
                        nombre = stringResource(e.nombre),
                        descripcion = if (bloqueado) Textos.t(T.apariencia_estilo_nivel, requisito, themeStore.nivel) else stringResource(e.descripcion),
                        activo = themeStore.estilo == e.clave,
                        bloqueado = bloqueado,
                    ) {
                        themeStore.setEstilo(e.clave)
                        guardar()
                    }
                }
            }

            Seccion(T.apariencia_texto)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface, RoundedCornerShape(radio(14)))
                    .border(1.dp, Border, RoundedCornerShape(radio(14)))
                    .padding(4.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                TAMANOS_TEXTO.forEach { t ->
                    val activo = themeStore.tamanoTexto == t.clave
                    val nombre = stringResource(t.nombre)
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(radio(10)))
                            .background(if (activo) Accent else Color.Transparent)
                            .clickable(role = Role.RadioButton) { themeStore.setTamanoTexto(t.clave); guardar() }
                            .semantics { selected = activo }
                            .heightIn(min = 56.dp)
                            .padding(vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center,
                    ) {
                        // "Aa" a la escala de cada opción, sin contar la del sistema: se ve la diferencia antes de elegir.
                        Text("Aa", color = if (activo) OnAccent else Foreground, fontSize = (16 * t.escala).sp, fontWeight = FontWeight.Bold)
                        Text(nombre, color = if (activo) OnAccent else Muted, fontSize = 11.sp, maxLines = 1)
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
            Text(Textos.t(T.apariencia_sincronizada), color = Muted, fontSize = 12.sp, lineHeight = 17.sp)
            Spacer(Modifier.height(32.dp))
        }
    }

    if (editandoLibre) {
        DialogoColorLibre(
            inicial = themeStore.acentoLibre.takeIf { it.isNotEmpty() }?.let { colorDeHex(it) } ?: Accent,
            onDismiss = { editandoLibre = false },
            onElegir = { hex ->
                editandoLibre = false
                themeStore.setAcentoLibre(hex)
                guardar()
            },
        )
    }
}

/** Piezas reales de la app con la apariencia actual: cifra de platinos, barra, botón y chip. */
@Composable
private fun Muestra() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Brush.verticalGradient(listOf(Surface2, Surface)), RoundedCornerShape(radio(20)))
            .border(1.dp, Border, RoundedCornerShape(radio(20)))
            .padding(20.dp),
    ) {
        Text(Textos.t(T.panel_platinos), color = Platinum, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.5.sp)
        Text("87", color = Foreground, fontSize = 40.sp, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(12.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(8.dp)
                .background(Surface2, RoundedCornerShape(radio(4))),
        ) {
            Box(
                Modifier
                    .fillMaxWidth(0.68f)
                    .height(8.dp)
                    .background(Brush.horizontalGradient(listOf(Accent, Accent2)), RoundedCornerShape(radio(4))),
            )
        }
        Spacer(Modifier.height(16.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                Modifier
                    .background(Accent, RoundedCornerShape(radio(12)))
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) {
                Text(Textos.t(T.apariencia_muestra_boton), color = OnAccent, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
            Spacer(Modifier.width(10.dp))
            Box(
                Modifier
                    .background(AccentSoft, CircleShape)
                    .padding(horizontal = 12.dp, vertical = 6.dp),
            ) {
                Text(Textos.t(T.apariencia_muestra_chip), color = Accent, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun Seccion(titulo: Texto) {
    Spacer(Modifier.height(28.dp))
    Text(stringResource(titulo), color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold)
    Spacer(Modifier.height(10.dp))
}

@Composable
private fun Nota(texto: Texto) {
    Text(stringResource(texto), color = Muted, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(top = 8.dp))
}

@Composable
private fun Chip(texto: String, activo: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(radio(24)))
            .background(if (activo) Accent else Surface)
            .border(1.dp, if (activo) Accent else Border, RoundedCornerShape(radio(24)))
            .clickable(enabled = enabled, role = Role.RadioButton, onClick = onClick)
            .semantics { selected = activo }
            .alpha(if (enabled) 1f else 0.45f)
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(texto, color = if (activo) OnAccent else Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
    }
}

/** Círculo de un acento; las paletas completas enseñan su fondo (mitad) y su acento (mitad), como en la web. */
@Composable
private fun Muestrario(a: AcentoDef, activo: Boolean, nombre: String, enabled: Boolean, onClick: () -> Unit) {
    MuestrarioColor(a.oscuro, a.suelo?.background, activo, nombre, enabled, onClick)
}

@Composable
private fun MuestrarioColor(color: Color, fondo: Color?, activo: Boolean, descripcion: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .border(BorderStroke(if (activo) 3.dp else 1.dp, if (activo) Foreground else Border), CircleShape)
            .clickable(enabled = enabled, role = Role.RadioButton, onClick = onClick)
            .semantics { contentDescription = descripcion; selected = activo },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.size(42.dp).clip(CircleShape)) {
            if (fondo != null) {
                drawRect(fondo)
                // Diagonal: fondo arriba a la izquierda, acento abajo a la derecha.
                val p = androidx.compose.ui.graphics.Path().apply {
                    moveTo(size.width, 0f); lineTo(size.width, size.height); lineTo(0f, size.height); close()
                }
                drawPath(p, color)
            } else {
                drawRect(color)
            }
        }
        if (activo) Icon(Icons.Default.Check, contentDescription = null, tint = if (fondo != null) Color.White else contraste(color), modifier = Modifier.size(18.dp))
    }
}

/** Color libre: arcoíris si no hay ninguno, o el elegido. */
@Composable
private fun MuestrarioLibre(color: Color?, activo: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val descripcion = Textos.t(T.apariencia_libre)
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .border(BorderStroke(if (activo) 3.dp else 1.dp, if (activo) Foreground else Border), CircleShape)
            .clickable(enabled = enabled, role = Role.Button, onClick = onClick)
            .semantics { contentDescription = descripcion; selected = activo },
        contentAlignment = Alignment.Center,
    ) {
        Canvas(Modifier.size(42.dp).clip(CircleShape)) {
            if (color != null) drawRect(color)
            else drawRect(Brush.sweepGradient(listOf(Color(0xFFFF4D4D), Color(0xFFFFD84D), Color(0xFF4DFF88), Color(0xFF4DC3FF), Color(0xFFB84DFF), Color(0xFFFF4D4D))))
        }
        Text("+", color = if (color != null) contraste(color) else Color.White, fontWeight = FontWeight.Bold, fontSize = 18.sp)
    }
}

private fun contraste(c: Color): Color =
    if ((0.2126f * c.red + 0.7152f * c.green + 0.0722f * c.blue) > 0.5f) Color(0xFF0A0D13) else Color.White

@Composable
private fun FilaEstilo(nombre: String, descripcion: String, activo: Boolean, bloqueado: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(14)))
            .background(if (activo) AccentSoft else Surface)
            .border(if (activo) 2.dp else 1.dp, if (activo) Accent else Border, RoundedCornerShape(radio(14)))
            .clickable(enabled = !bloqueado, role = Role.RadioButton, onClick = onClick)
            .semantics { selected = activo }
            .heightIn(min = 56.dp)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(nombre, color = if (bloqueado) Muted else Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text(descripcion, color = Muted, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
        }
        when {
            bloqueado -> Icon(Icons.Default.Lock, contentDescription = null, tint = Muted, modifier = Modifier.size(18.dp))
            activo -> Icon(Icons.Default.Check, contentDescription = null, tint = Accent, modifier = Modifier.size(20.dp))
        }
    }
}

@Composable
private fun FilaInterruptor(titulo: String, subtitulo: String, activo: Boolean, onCambio: (Boolean) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(14)))
            .border(1.dp, Border, RoundedCornerShape(radio(14)))
            .clickable(role = Role.Switch) { onCambio(!activo) }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 16.dp)) {
            Text(titulo, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
            Text(subtitulo, color = Muted, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
        }
        Switch(
            checked = activo,
            onCheckedChange = onCambio,
            colors = SwitchDefaults.colors(checkedThumbColor = OnAccent, checkedTrackColor = Accent),
        )
    }
}

/** Color libre: un tono (0-360) con la saturación y la luz que se leen bien como acento sobre fondo oscuro. */
/** Tono (0-360), saturación y valor de un color (lo que daba android.graphics.Color.colorToHSV). */
private fun tonoSaturacionValor(c: Color): FloatArray {
    val max = maxOf(c.red, c.green, c.blue)
    val min = minOf(c.red, c.green, c.blue)
    val d = max - min
    val tono = when {
        d == 0f -> 0f
        max == c.red -> 60f * (((c.green - c.blue) / d) % 6f)
        max == c.green -> 60f * (((c.blue - c.red) / d) + 2f)
        else -> 60f * (((c.red - c.green) / d) + 4f)
    }.let { if (it < 0f) it + 360f else it }
    return floatArrayOf(tono, if (max == 0f) 0f else d / max, max)
}

@Composable
private fun DialogoColorLibre(inicial: Color, onDismiss: () -> Unit, onElegir: (String) -> Unit) {
    val hsv = tonoSaturacionValor(inicial)
    var tono by remember { mutableFloatStateOf(hsv[0]) }
    val color = Color.hsv(tono, 0.62f, 0.95f)
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(Textos.t(T.apariencia_libre), color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .background(color, RoundedCornerShape(radio(12))),
                )
                Spacer(Modifier.height(16.dp))
                Canvas(Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(radio(5)))) {
                    drawRect(
                        Brush.horizontalGradient((0..6).map { Color.hsv(it * 60f % 360f, 0.62f, 0.95f) }),
                        topLeft = Offset.Zero,
                        size = Size(size.width, size.height),
                    )
                }
                Slider(
                    value = tono,
                    onValueChange = { tono = it },
                    valueRange = 0f..360f,
                    colors = SliderDefaults.colors(thumbColor = color, activeTrackColor = Color.Transparent, inactiveTrackColor = Color.Transparent),
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onElegir("#" + (color.toArgb() and 0xFFFFFF).toString(16).padStart(6, '0')) }) {
                Text(Textos.t(T.comun_guardar), color = Accent, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(Textos.t(T.comun_cancelar), color = Muted) }
        },
    )
}
