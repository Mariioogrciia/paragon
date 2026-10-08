package com.paragon.app.ui.precios

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.CabeceraNativa
import com.paragon.app.ui.common.EsqueletoTarjetas
import com.paragon.app.ui.common.huecoBarra
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Danger
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Good
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.app.util.formatDecimal
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.AlertaPrecioDto
import com.paragon.shared.red.NuevaAlertaPrecio
import com.paragon.shared.red.PlatinoOfertaDto
import com.paragon.shared.red.PreciosJuegoDto
import kotlinx.coroutines.launch

/**
 * Precios en la app (8 oct 2026): tarjeta de precio con alerta en la ficha y
 * "Platinos de oferta" — mismo backend que la web (lib/preciosJuego.ts,
 * lib/priceAlerts.ts, lib/platinosOferta.ts).
 */

private fun euros(v: Double): String = "${formatDecimal(v, 2)} €"

private fun dolares(v: Double): String = formatDecimal(v, 2)

/** "#c99a2e" → Color; el acento si no se entiende. */
private fun colorHex(hex: String): Color =
    hex.removePrefix("#").toLongOrNull(16)?.takeIf { hex.length == 7 }?.let { Color(0xFF000000 or it) } ?: Accent

/** Etiqueta traducida del nivel de dificultad (1-10, lib/difficulty.ts). */
private fun etiquetaDificultad(nivel: Int): String = Textos.t(
    when {
        nivel <= 1 -> T.dif_muy_facil
        nivel <= 2 -> T.dif_facil
        nivel <= 4 -> T.dif_media
        else -> T.dif_dificil
    },
)

/**
 * Tarjeta "Precio en PC" de la ficha. No pinta nada si el juego no tiene
 * versión de PC (o si falla la red): es información extra, no un error.
 */
@Composable
fun TarjetaPrecioFicha(gameId: String, titulo: String, tokenStore: TokenStore, modifier: Modifier = Modifier) {
    var datos by remember(gameId) { mutableStateOf<PreciosJuegoDto?>(null) }
    var dialogo by remember { mutableStateOf(false) }
    LaunchedEffect(gameId) {
        datos = try { ApiClient.preciosApi(tokenStore).getPrecios(gameId).precios } catch (e: Exception) { null }
    }
    val d = datos ?: return

    Column(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(16)))
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(Textos.t(T.precio_titulo), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        val p = d.precio
        if (p != null) {
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(euros(p.final), color = if (p.descuento > 0) Good else Foreground, fontSize = 24.sp, fontWeight = FontWeight.Bold)
                if (p.descuento > 0) {
                    Text(euros(p.inicial), color = Muted, fontSize = 13.sp, textDecoration = TextDecoration.LineThrough, modifier = Modifier.padding(bottom = 3.dp))
                    Text(
                        "-${p.descuento}%",
                        color = Color.Black,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(bottom = 3.dp).clip(RoundedCornerShape(50)).background(Good).padding(horizontal = 7.dp, vertical = 2.dp),
                    )
                }
                Spacer(Modifier.weight(1f))
                Text("Steam", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 3.dp))
            }
        } else {
            Text(Textos.t(T.precio_no_a_la_venta), color = Muted, fontSize = 14.sp)
        }
        d.ofertas.firstOrNull()?.let { o ->
            Text(Textos.t(T.precio_mas_barato, o.tienda, dolares(o.precio)), color = Muted, fontSize = 12.sp)
        }
        d.minimoHistoricoUsd?.let { Text(Textos.t(T.precio_minimo, dolares(it)), color = Muted, fontSize = 12.sp) }
        Spacer(Modifier.height(4.dp))
        Text(
            text = d.alerta?.let { Textos.t(T.precio_alerta_activa, euros(it)) } ?: Textos.t(T.precio_avisarme),
            color = Accent,
            fontSize = 14.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier
                .clip(RoundedCornerShape(radio(10)))
                .background(AccentSoft)
                .premiumClickable { dialogo = true }
                .padding(horizontal = 14.dp, vertical = 10.dp),
        )
    }

    if (dialogo) {
        DialogoAlertaPrecio(
            titulo = titulo,
            actual = d.alerta,
            sugerido = d.precio?.final,
            onGuardar = { objetivo ->
                ApiClient.preciosApi(tokenStore).guardarAlerta(NuevaAlertaPrecio(d.steamAppId, gameId, titulo, objetivo))
                datos = d.copy(alerta = objetivo)
            },
            onQuitar = {
                ApiClient.preciosApi(tokenStore).borrarAlerta(d.steamAppId)
                datos = d.copy(alerta = null)
            },
            onCerrar = { dialogo = false },
        )
    }
}

/** Pide el precio objetivo; guarda o quita la alerta (las mismas reglas que la web). */
@Composable
private fun DialogoAlertaPrecio(
    titulo: String,
    actual: Double?,
    sugerido: Double?,
    onGuardar: suspend (Double) -> Unit,
    onQuitar: suspend () -> Unit,
    onCerrar: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    // Por defecto: tu objetivo, o un 20 % por debajo del precio de ahora.
    var texto by remember { mutableStateOf((actual ?: sugerido?.let { it * 0.8 })?.let { formatDecimal(it, 2) } ?: "") }
    var error by remember { mutableStateOf<String?>(null) }
    var ocupado by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onCerrar,
        containerColor = Surface,
        title = { Text(Textos.t(T.precio_alerta_titulo), color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(Textos.t(T.precio_alerta_texto, titulo), color = Muted, fontSize = 14.sp)
                OutlinedTextField(
                    value = texto,
                    onValueChange = { texto = it.filter { c -> c.isDigit() || c == ',' || c == '.' }.take(7); error = null },
                    label = { Text(Textos.t(T.precio_alerta_campo)) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    isError = error != null,
                    supportingText = error?.let { { Text(it, color = Danger) } },
                )
            }
        },
        confirmButton = {
            TextButton(
                enabled = !ocupado,
                onClick = {
                    val valor = texto.replace(',', '.').toDoubleOrNull()
                    if (valor == null || valor < 0.01 || valor > 999) {
                        error = Textos.t(T.precio_alerta_error)
                        return@TextButton
                    }
                    ocupado = true
                    scope.launch {
                        try {
                            onGuardar(valor)
                            onCerrar()
                        } catch (e: Exception) {
                            error = Textos.t(T.error_conexion)
                        } finally {
                            ocupado = false
                        }
                    }
                },
            ) { Text(Textos.t(T.precio_alerta_guardar), color = Accent, fontWeight = FontWeight.Bold) }
        },
        dismissButton = {
            if (actual != null) {
                TextButton(
                    enabled = !ocupado,
                    onClick = {
                        ocupado = true
                        scope.launch {
                            try {
                                onQuitar()
                                onCerrar()
                            } catch (e: Exception) {
                                error = Textos.t(T.error_conexion)
                            } finally {
                                ocupado = false
                            }
                        }
                    },
                ) { Text(Textos.t(T.precio_alerta_quitar), color = Danger) }
            }
        },
    )
}

/**
 * Pantalla "Platinos de oferta" (desde Perfil): tus alertas de precio arriba
 * y, debajo, juegos de Steam rebajados con un 100 % asequible.
 */
@Composable
fun PlatinosOfertaScreen(tokenStore: TokenStore, onBack: () -> Unit, onAbrirJuego: (String) -> Unit) {
    val uri = LocalUriHandler.current
    var alertas by remember { mutableStateOf<List<AlertaPrecioDto>?>(null) }
    var ofertas by remember { mutableStateOf<List<PlatinoOfertaDto>?>(null) }
    LaunchedEffect(Unit) {
        alertas = try { ApiClient.preciosApi(tokenStore).getAlertas().alertas } catch (e: Exception) { emptyList() }
    }
    LaunchedEffect(Unit) {
        ofertas = try { ApiClient.preciosApi(tokenStore).getPlatinosOferta().ofertas } catch (e: Exception) { emptyList() }
    }

    LazyColumn(
        Modifier.fillMaxSize().background(Background),
        contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = huecoBarra() + 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            CabeceraNativa(titulo = Textos.t(T.ofertas_titulo), atras = Textos.t(T.nav_perfil), onBack = onBack)
        }

        // Tus alertas
        item {
            Text(Textos.t(T.ofertas_tus_alertas), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, modifier = Modifier.padding(top = 4.dp))
        }
        val listaAlertas = alertas
        if (listaAlertas != null && listaAlertas.isEmpty()) {
            item { Text(Textos.t(T.ofertas_sin_alertas), color = Muted, fontSize = 13.sp) }
        }
        items(listaAlertas.orEmpty(), key = { "alerta-${it.steamAppId}" }) { a ->
            val ahora = a.precio?.final
            val porDebajo = ahora != null && ahora <= a.precioObjetivo
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(radio(12)))
                    .background(Surface2)
                    .clickable { onAbrirJuego(a.gameId) }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(a.titulo, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(
                        Textos.t(T.ofertas_alerta_fila, euros(a.precioObjetivo), ahora?.let { euros(it) } ?: Textos.t(T.ofertas_ahora_sin_precio)),
                        color = Muted,
                        fontSize = 12.sp,
                    )
                }
                if (porDebajo) {
                    Text(Textos.t(T.ofertas_por_debajo), color = Good, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        // Platinos de oferta
        item {
            Column(Modifier.padding(top = 12.dp)) {
                Text(Textos.t(T.ofertas_titulo).uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(Textos.t(T.ofertas_texto), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
        val listaOfertas = ofertas
        if (listaOfertas == null) {
            item { EsqueletoTarjetas(tarjetas = 3, alto = 220.dp, modifier = Modifier.fillMaxWidth()) }
        } else if (listaOfertas.isEmpty()) {
            item { Text(Textos.t(T.ofertas_vacio), color = Muted, fontSize = 13.sp) }
        }
        items(listaOfertas.orEmpty(), key = { "oferta-${it.steamAppId}" }) { o ->
            TarjetaPlatinoOferta(o, onClick = { o.gameId?.let(onAbrirJuego) ?: uri.openUri(o.url) })
        }
        if (!listaOfertas.isNullOrEmpty()) {
            item { Text(Textos.t(T.ofertas_nota), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 4.dp)) }
        }
    }
}

@Composable
private fun TarjetaPlatinoOferta(o: PlatinoOfertaDto, onClick: () -> Unit) {
    val forma = RoundedCornerShape(radio(16))
    Column(
        Modifier
            .fillMaxWidth()
            .clip(forma)
            .background(Surface)
            .border(1.dp, Border, forma)
            .premiumClickable(onClick = onClick),
    ) {
        Box(Modifier.fillMaxWidth().aspectRatio(460f / 215f).background(Surface2)) {
            AsyncImage(model = o.caratula, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            if (o.ahorro > 0) {
                Text(
                    "-${o.ahorro}%",
                    color = Color.Black,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.align(Alignment.TopEnd).padding(8.dp).clip(RoundedCornerShape(50)).background(Good).padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
        }
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(o.titulo, color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    etiquetaDificultad(o.dificultad.nivel),
                    color = Color.White,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clip(RoundedCornerShape(radio(6))).background(colorHex(o.dificultad.color)).padding(horizontal = 7.dp, vertical = 2.dp),
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    Textos.t(T.ofertas_logros, o.logros, formatDecimal(o.logroMasRaro, 1)) +
                        (o.horas?.let { " · " + Textos.t(T.ofertas_horas, it.toInt()) } ?: ""),
                    color = Muted,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                val p = o.precio
                if (p != null) {
                    Text(euros(p.final), color = Good, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    if (p.inicial > p.final) {
                        Text(euros(p.inicial), color = Muted, fontSize = 12.sp, textDecoration = TextDecoration.LineThrough, modifier = Modifier.padding(bottom = 3.dp))
                    }
                } else {
                    Text("${dolares(o.precioUsd)} US$", color = Good, fontSize = 20.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
