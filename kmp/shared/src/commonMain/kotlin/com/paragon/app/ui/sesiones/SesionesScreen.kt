@file:OptIn(ExperimentalTime::class, ExperimentalMaterial3Api::class)

package com.paragon.app.ui.sesiones

import androidx.compose.material.icons.filled.QrCode2
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTimePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.SesionResultado
import com.paragon.app.data.SesionesRepository
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.ahoraMillis
import com.paragon.app.data.isoAMillis
import com.paragon.app.ui.common.AvatarPersona
import com.paragon.app.ui.common.ConfirmDialog
import com.paragon.app.ui.common.EmptyState
import com.paragon.app.ui.common.EsqueletoLista
import com.paragon.app.ui.common.OpcionSelector
import com.paragon.app.ui.common.Selector
import com.paragon.app.ui.common.premiumClickable
import com.paragon.app.ui.common.urlImagenSegura
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.app.util.fechaConPatron
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.JuegoSesionDto
import com.paragon.shared.red.NuevaSesionRequest
import com.paragon.shared.red.SesionDto
import com.paragon.shared.red.SesionPersonaDto
import com.paragon.shared.red.TrofeoPendienteDto
import kotlinx.coroutines.launch
import kotlinx.datetime.LocalDateTime
import kotlinx.datetime.LocalTime
import kotlinx.datetime.TimeZone
import kotlinx.datetime.toInstant
import kotlinx.datetime.toLocalDateTime
import kotlin.time.ExperimentalTime
import kotlin.time.Instant

/*
 * Sesiones de trofeos online en las apps (5 oct 2026), lo mismo que /sesiones
 * en la web: lista compacta → ficha (quién está dentro, plazas libres, unirse)
 * y una hoja para organizar con el trofeo elegido de los que te faltan.
 * Plazas: siempre el total contando a quien organiza (4 = tú + 3 libres).
 */

private val PLATAFORMAS = mapOf("psn" to "PlayStation", "xbox" to "Xbox", "steam" to "Steam", "epic" to "Epic Games", "ubisoft" to "Ubisoft", "google" to "Google Play")
private const val OTRO = "__otro__"

private fun nombreCorto(p: SesionPersonaDto): String =
    p.name?.trim()?.split(Regex("\\s+"))?.firstOrNull()?.takeIf { it.isNotEmpty() } ?: p.handle?.let { "@$it" } ?: "?"

private fun textoLibres(libres: Int): String = when (libres) {
    0 -> Textos.t(T.sesiones_completa)
    1 -> Textos.t(T.sesiones_libres_1)
    else -> Textos.t(T.sesiones_libres_n, libres)
}

private fun fechaSesion(iso: String, larga: Boolean = false): String =
    isoAMillis(iso)?.let { fechaConPatron(it, if (larga) "EEEEdMMMMHHmm" else "EEEdMMMHHmm") } ?: iso

// ------------------------------------------------------------------ Lista

@Composable
fun SesionesScreen(tokenStore: TokenStore, onBack: () -> Unit, onAbrir: (String) -> Unit, embebida: Boolean = false) {
    val repo = remember { SesionesRepository(tokenStore) }
    var estado by remember { mutableStateOf<SesionResultado<com.paragon.shared.red.SesionesResponse>?>(null) }
    var recarga by remember { mutableIntStateOf(0) }
    var organizando by remember { mutableStateOf(false) }

    LaunchedEffect(recarga) { estado = repo.listar() }

    Box(Modifier.fillMaxSize()) {
    Column(Modifier.fillMaxSize().background(Background)) {
        // Incrustada en Comunidad (pestaña Sesiones) no lleva cabecera propia:
        // "Organizar" pasa a ser un botón flotante en la zona del pulgar.
        if (!embebida) com.paragon.app.ui.common.CabeceraNativa(titulo = Textos.t(T.nav_sesiones), onBack = onBack) {
            val juegos = (estado as? SesionResultado.Ok<com.paragon.shared.red.SesionesResponse>)?.valor?.juegos
            if (juegos != null) {
                IconButton(onClick = { organizando = true }) {
                    Icon(Icons.Default.Add, contentDescription = Textos.t(T.sesiones_organizar), tint = Accent)
                }
            }
        }
        Text(
            Textos.t(T.sesiones_subtitulo),
            color = Muted,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            modifier = Modifier.padding(horizontal = 20.dp).padding(bottom = 12.dp),
        )

        when (val e = estado) {
            null -> EsqueletoLista()
            is SesionResultado.Error -> EmptyState(Icons.Default.Groups, e.mensaje, "", Textos.t(T.comun_reintentar), { recarga++ })
            is SesionResultado.Ok -> {
                val sesiones = e.valor.sesiones
                if (sesiones.isEmpty()) {
                    EmptyState(Icons.Default.Groups, Textos.t(T.sesiones_vacio_titulo), Textos.t(T.sesiones_vacio_texto))
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 16.dp, end = 16.dp, bottom = if (embebida) 96.dp else 32.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(sesiones, key = { it.id }) { s -> FilaSesion(s) { onAbrir(s.id) } }
                    }
                }
                if (organizando) {
                    NuevaSesionSheet(
                        repo = repo,
                        juegos = e.valor.juegos,
                        onDismiss = { organizando = false },
                        onCreada = { id ->
                            organizando = false
                            recarga++
                            onAbrir(id)
                        },
                    )
                }
            }
        }
    }
    if (embebida && (estado as? SesionResultado.Ok<com.paragon.shared.red.SesionesResponse>) != null) {
        Button(
            onClick = { organizando = true },
            colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = com.paragon.app.ui.theme.OnAccent),
            shape = RoundedCornerShape(radio(28)),
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp).height(56.dp),
        ) {
            Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(8.dp))
            Text(Textos.t(T.sesiones_organizar), fontWeight = FontWeight.Bold, fontSize = 16.sp)
        }
    }
    }
}

@Composable
private fun FilaSesion(s: SesionDto, onClick: () -> Unit) {
    val empezada = (isoAMillis(s.fechaHora) ?: Long.MAX_VALUE) <= ahoraMillis()
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(16)))
            .background(Surface)
            .border(1.dp, if (s.loTengo) Accent.copy(alpha = 0.35f) else Border, RoundedCornerShape(radio(16)))
            .premiumClickable(onClick = onClick)
            .padding(12.dp),
    ) {
        Caratula(s.juego.iconUrl, ancho = 40, alto = 56)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "${s.juego.titulo} · ${s.juego.deviceLabel}".uppercase(),
                    color = Muted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                val marca = when {
                    s.soyAnfitrion || s.estoyApuntado -> Textos.t(T.sesiones_dentro)
                    s.loTengo -> Textos.t(T.sesiones_lo_tienes)
                    else -> null
                }
                if (marca != null) Text("  $marca", color = Accent, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            }
            Text(s.trofeo, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                AvatarPersona(s.anfitrion.image, nombreCorto(s.anfitrion), size = 16.dp)
                Spacer(Modifier.width(6.dp))
                Text(
                    if (empezada) Textos.t(T.sesiones_en_curso) else fechaSesion(s.fechaHora),
                    color = Muted,
                    fontSize = 12.sp,
                    maxLines = 1,
                )
            }
        }
        Spacer(Modifier.width(8.dp))
        Column(horizontalAlignment = Alignment.End) {
            Plazas(s.ocupadas, s.plazasTotales)
            Text(textoLibres(s.libres), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
        }
    }
}

/** Un punto por plaza (lleno = ocupada) y "2/4". Con muchas, solo el número. */
@Composable
private fun Plazas(ocupadas: Int, total: Int, grande: Boolean = false) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        if (grande || total <= 8) {
            val punto = if (grande) 11.dp else 8.dp
            Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                repeat(total) { i ->
                    Box(
                        Modifier.size(punto).clip(CircleShape)
                            .background(if (i < ocupadas) Accent else Background)
                            .border(1.dp, if (i < ocupadas) Accent else Border, CircleShape),
                    )
                }
            }
            Spacer(Modifier.width(6.dp))
        }
        Text("$ocupadas/$total", color = Foreground, fontSize = if (grande) 15.sp else 12.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Caratula(url: String?, ancho: Int, alto: Int) {
    Box(Modifier.size(ancho.dp, alto.dp).clip(RoundedCornerShape(radio(8))).background(Surface2)) {
        urlImagenSegura(url)?.let { AsyncImage(model = it, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
    }
}

// ------------------------------------------------------------------ Ficha

@Composable
fun SesionDetalleScreen(tokenStore: TokenStore, sesionId: String, onBack: () -> Unit) {
    val repo = remember { SesionesRepository(tokenStore) }
    val scope = rememberCoroutineScope()
    var estado by remember { mutableStateOf<SesionResultado<SesionDto>?>(null) }
    var recarga by remember { mutableIntStateOf(0) }
    var trabajando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var confirmarCancelar by remember { mutableStateOf(false) }
    var verQr by remember { mutableStateOf(false) }

    LaunchedEffect(sesionId, recarga) { estado = repo.ficha(sesionId) }

    fun ejecutar(accion: suspend () -> SesionResultado<*>) {
        trabajando = true
        error = null
        scope.launch {
            when (val r = accion()) {
                is SesionResultado.Error -> error = r.mensaje
                is SesionResultado.Ok -> {
                    val nueva = r.valor as? SesionDto
                    if (nueva != null) estado = SesionResultado.Ok(nueva) else recarga++
                }
            }
            trabajando = false
        }
    }

    Column(Modifier.fillMaxSize().background(Background)) {
        // Solo la fila de volver: el título grande es el trofeo, más abajo.
        Row(Modifier.fillMaxWidth().height(44.dp).padding(start = 6.dp).premiumClickable(onClick = onBack), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = Textos.t(T.comun_atras), tint = Accent, modifier = Modifier.size(32.dp))
            Text(Textos.t(T.nav_sesiones), color = Accent, fontSize = 17.sp)
        }
        when (val e = estado) {
            null -> EsqueletoLista()
            is SesionResultado.Error -> EmptyState(Icons.Default.Groups, e.mensaje, "", Textos.t(T.comun_reintentar), { recarga++ })
            is SesionResultado.Ok -> {
                val s = e.valor
                val ahora = ahoraMillis()
                val inicio = isoAMillis(s.fechaHora) ?: ahora
                val empezada = inicio <= ahora
                val terminada = inicio < ahora - 2 * 60 * 60 * 1000L
                val estadoTexto = when {
                    s.cancelada -> Textos.t(T.sesiones_cancelada)
                    terminada -> Textos.t(T.sesiones_terminada)
                    empezada -> Textos.t(T.sesiones_en_curso)
                    else -> null
                }
                Column(
                    Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 32.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Tarjeta {
                        Row {
                            Caratula(s.juego.iconUrl, ancho = 72, alto = 100)
                            Spacer(Modifier.width(14.dp))
                            Column(Modifier.weight(1f)) {
                                Text("${s.juego.titulo} · ${s.juego.deviceLabel}".uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                                    s.trofeoInfo?.iconUrl?.let { url ->
                                        urlImagenSegura(url)?.let {
                                            AsyncImage(model = it, contentDescription = null, modifier = Modifier.size(30.dp).clip(RoundedCornerShape(radio(6))))
                                            Spacer(Modifier.width(8.dp))
                                        }
                                    }
                                    Text(
                                        s.trofeo,
                                        color = Foreground,
                                        fontSize = 20.sp,
                                        fontWeight = FontWeight.Bold,
                                        lineHeight = 24.sp,
                                    )
                                }
                                s.trofeoInfo?.detail?.takeIf { it.isNotBlank() }?.let {
                                    Text(it, color = Muted, fontSize = 13.sp, lineHeight = 18.sp, modifier = Modifier.padding(top = 4.dp))
                                }
                                Text("📅 " + fechaSesion(s.fechaHora, larga = true), color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
                                estadoTexto?.let {
                                    Text(it, color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp).clip(RoundedCornerShape(50)).background(Surface2).padding(horizontal = 8.dp, vertical = 2.dp))
                                }
                            }
                        }
                    }

                    s.descripcion?.takeIf { it.isNotBlank() }?.let {
                        Tarjeta {
                            Etiqueta(Textos.t(T.sesiones_detalles))
                            Text(it, color = Foreground, fontSize = 14.sp, lineHeight = 20.sp)
                        }
                    }

                    Tarjeta {
                        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 10.dp)) {
                            Etiqueta(Textos.t(T.sesiones_quien_esta), Modifier.weight(1f))
                            Plazas(s.ocupadas, s.plazasTotales, grande = true)
                        }
                        Text(textoLibres(s.libres), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 8.dp))
                        Persona(s.anfitrion, organiza = true, soyYo = s.soyAnfitrion)
                        s.participantes.forEach { Persona(it, organiza = false, soyYo = false, ayuda = it.ayuda) }
                        repeat(s.libres) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
                                    .border(BorderStroke(1.dp, Border), RoundedCornerShape(radio(12)))
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                            ) {
                                Box(Modifier.size(34.dp).clip(CircleShape).border(1.dp, Border, CircleShape), contentAlignment = Alignment.Center) {
                                    Icon(Icons.Default.Add, contentDescription = null, tint = Muted, modifier = Modifier.size(16.dp))
                                }
                                Spacer(Modifier.width(12.dp))
                                Text(Textos.t(T.sesiones_plaza_libre), color = Muted, fontSize = 14.sp)
                            }
                        }
                    }

                    Tarjeta {
                        if (s.cancelada || empezada) {
                            Text(Textos.t(T.sesiones_ya_no_abierta), color = Muted, fontSize = 13.sp)
                        } else {
                            Text(
                                when {
                                    s.soyAnfitrion -> Textos.t(T.sesiones_eres_anfitrion)
                                    s.estoyApuntado -> Textos.t(T.sesiones_estas_dentro)
                                    s.libres == 0 -> Textos.t(T.sesiones_sin_plazas)
                                    s.yaLoTengo -> Textos.t(T.sesiones_ya_lo_tienes_ayuda)
                                    s.loTengo -> Textos.t(T.sesiones_puedes_unirte)
                                    else -> Textos.t(T.sesiones_no_lo_tienes, s.juego.deviceLabel)
                                },
                                color = Muted,
                                fontSize = 13.sp,
                                lineHeight = 18.sp,
                            )
                            Spacer(Modifier.height(10.dp))
                            // Diseño v2: la acción a lo ancho y, al lado, compartir la sesión con QR.
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(Modifier.weight(1f)) {
                            when {
                                s.soyAnfitrion -> OutlinedButton(
                                    onClick = { confirmarCancelar = true },
                                    enabled = !trabajando,
                                    border = BorderStroke(1.dp, Border),
                                    modifier = Modifier.fillMaxWidth(),
                                ) { Text(Textos.t(T.sesiones_cancelar), color = Muted) }
                                s.estoyApuntado -> OutlinedButton(
                                    onClick = { ejecutar { repo.salir(s.id) } },
                                    enabled = !trabajando,
                                    border = BorderStroke(1.dp, Border),
                                    modifier = Modifier.fillMaxWidth(),
                                ) { Text(Textos.t(T.sesiones_salirme), color = Muted) }
                                else -> Button(
                                    onClick = { ejecutar { repo.unirse(s.id) } },
                                    enabled = !trabajando && s.libres > 0,
                                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Background),
                                    shape = RoundedCornerShape(radio(10)),
                                    modifier = Modifier.fillMaxWidth(),
                                ) { Text(if (s.yaLoTengo) Textos.t(T.sesiones_unirme_ayudar) else Textos.t(T.sesiones_unirme), fontWeight = FontWeight.Bold) }
                            }
                                }
                                Spacer(Modifier.width(10.dp))
                                IconButton(
                                    onClick = { verQr = true },
                                    modifier = Modifier.size(48.dp).clip(RoundedCornerShape(radio(14))).background(Surface),
                                ) { Icon(Icons.Default.QrCode2, contentDescription = Textos.t(T.qr_compartir_sesion), tint = Foreground) }
                            }
                        }
                        error?.let { Text(it, color = com.paragon.app.ui.theme.Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
                    }
                }
                if (verQr) HojaQrSesion(sesionId) { verQr = false }
                if (confirmarCancelar) {
                    ConfirmDialog(
                        title = Textos.t(T.sesiones_cancelar_titulo),
                        message = Textos.t(T.sesiones_cancelar_texto),
                        onConfirm = {
                            confirmarCancelar = false
                            ejecutar { repo.cancelar(s.id) }
                        },
                        onDismiss = { confirmarCancelar = false },
                    )
                }
            }
        }
    }
}

@Composable
private fun Tarjeta(contenido: @Composable () -> Unit) {
    Column(
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(18)))
            .background(Surface)
            .border(1.dp, Border, RoundedCornerShape(radio(18)))
            .padding(16.dp),
    ) { contenido() }
}

@Composable
private fun Etiqueta(texto: String, modifier: Modifier = Modifier) {
    Text(texto.uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp, modifier = modifier.padding(bottom = 4.dp))
}

@Composable
private fun Persona(p: SesionPersonaDto, organiza: Boolean, soyYo: Boolean, ayuda: Boolean = false) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)
            .clip(RoundedCornerShape(radio(12)))
            .background(Surface2)
            .padding(horizontal = 12.dp, vertical = 8.dp),
    ) {
        AvatarPersona(p.image, nombreCorto(p), size = 34.dp)
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(nombreCorto(p) + if (soyYo) " (${Textos.t(T.sesiones_tu)})" else "", color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1)
            p.handle?.let { Text("@$it", color = Muted, fontSize = 12.sp, maxLines = 1) }
        }
        if (ayuda) {
            Text(
                Textos.t(T.sesiones_ayuda),
                color = Muted,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clip(RoundedCornerShape(50)).border(1.dp, Border, RoundedCornerShape(50)).padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
        if (organiza) {
            Text(
                Textos.t(T.sesiones_organiza),
                color = Accent,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.clip(RoundedCornerShape(50)).background(AccentSoft).padding(horizontal = 8.dp, vertical = 3.dp),
            )
        }
    }
}

// ------------------------------------------------------------------ Organizar

@Composable
private fun NuevaSesionSheet(
    repo: SesionesRepository,
    juegos: List<JuegoSesionDto>,
    onDismiss: () -> Unit,
    onCreada: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var gameId by remember { mutableStateOf(juegos.firstOrNull()?.id) }
    var trofeos by remember { mutableStateOf<List<TrofeoPendienteDto>?>(null) }
    var trophyId by remember { mutableStateOf<String?>(null) }
    var trofeoLibre by remember { mutableStateOf("") }
    var fechaMillisUtc by remember { mutableStateOf<Long?>(null) }
    var hora by remember { mutableStateOf<LocalTime?>(null) }
    var plazas by remember { mutableIntStateOf(4) }
    var descripcion by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var enviando by remember { mutableStateOf(false) }
    var eligiendoFecha by remember { mutableStateOf(false) }
    var eligiendoHora by remember { mutableStateOf(false) }

    LaunchedEffect(gameId) {
        val id = gameId ?: return@LaunchedEffect
        trofeos = null
        val lista = repo.trofeosPendientes(id)
        trofeos = lista
        trophyId = if (lista.isEmpty()) OTRO else null
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true), containerColor = Surface) {
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp).padding(bottom = 32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(Textos.t(T.sesiones_nueva_titulo), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            if (juegos.isEmpty()) {
                Text(Textos.t(T.sesiones_sin_juegos), color = Muted, fontSize = 14.sp)
                return@Column
            }

            Campo(Textos.t(T.sesiones_juego)) {
                // Agrupados por plataforma y con la consola: el mismo juego en PS4 y PS5 se distingue.
                val opciones = juegos
                    .sortedWith(compareBy({ PLATAFORMAS[it.platform] ?: "~" }, { it.titulo }, { it.deviceLabel }))
                    .map { OpcionSelector(it.id, it.titulo, detalle = "${it.deviceLabel} · ${it.progreso}%", grupo = PLATAFORMAS[it.platform] ?: Textos.t(T.sesiones_otras)) }
                Selector(valor = gameId, opciones = opciones, onElegir = { gameId = it; trophyId = null }, buscable = true)
            }

            Campo(Textos.t(T.sesiones_trofeo)) {
                val lista = trofeos
                val hayDlc = lista?.any { it.grupo != null } == true
                val opciones = listOf(OpcionSelector(OTRO, Textos.t(T.sesiones_trofeo_otro))) +
                    (lista ?: emptyList()).map {
                        OpcionSelector(it.trophyId, it.name, imagen = it.iconUrl, grupo = it.grupo ?: if (hayDlc) Textos.t(T.sesiones_juego_base) else null)
                    }
                Selector(
                    valor = trophyId,
                    opciones = opciones,
                    onElegir = { trophyId = it },
                    activo = lista != null,
                    placeholder = if (lista == null) Textos.t(T.sesiones_trofeo_cargando) else Textos.t(T.sesiones_trofeo_elige),
                )
                if (lista != null && lista.isEmpty()) Text(Textos.t(T.sesiones_sin_lista), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
            }

            if (trophyId == OTRO) {
                Campo(Textos.t(T.sesiones_trofeo_escrito)) {
                    CampoTexto(trofeoLibre, { if (it.length <= 120) trofeoLibre = it }, Textos.t(T.sesiones_trofeo_escrito))
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Campo(Textos.t(T.sesiones_fecha), Modifier.weight(1f)) {
                    BotonCampo(fechaMillisUtc?.let { fechaConPatron(it, "EEEdMMM", ) } ?: "—") { eligiendoFecha = true }
                }
                Campo(Textos.t(T.sesiones_hora), Modifier.weight(1f)) {
                    BotonCampo(hora?.let { "${it.hour.toString().padStart(2, '0')}:${it.minute.toString().padStart(2, '0')}" } ?: "—") { eligiendoHora = true }
                }
            }

            Campo(Textos.t(T.sesiones_plazas)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (plazas > 2) plazas-- }, enabled = plazas > 2) { Icon(Icons.Default.Remove, contentDescription = null, tint = Foreground) }
                    Text("$plazas", color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.width(40.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    IconButton(onClick = { if (plazas < 16) plazas++ }, enabled = plazas < 16) { Icon(Icons.Default.Add, contentDescription = null, tint = Foreground) }
                    Spacer(Modifier.width(8.dp))
                    Plazas(1, plazas)
                }
                Text(Textos.t(T.sesiones_plazas_ayuda, plazas - 1), color = Muted, fontSize = 12.sp)
            }

            Campo(Textos.t(T.sesiones_descripcion)) {
                CampoTexto(descripcion, { if (it.length <= 500) descripcion = it }, Textos.t(T.sesiones_descripcion_placeholder), lineas = 3)
            }

            error?.let { Text(it, color = com.paragon.app.ui.theme.Danger, fontSize = 13.sp) }

            Button(
                onClick = {
                    error = null
                    val fecha = fechaMillisUtc
                    val h = hora
                    val id = gameId
                    val trofeo = trophyId
                    when {
                        id == null -> return@Button
                        trofeo == null -> { error = Textos.t(T.sesiones_falta_trofeo); return@Button }
                        fecha == null || h == null -> { error = Textos.t(T.sesiones_falta_fecha); return@Button }
                    }
                    // El DatePicker da la medianoche UTC del día elegido; la hora es la del teléfono.
                    val dia = Instant.fromEpochMilliseconds(fecha!!).toLocalDateTime(TimeZone.UTC).date
                    val cuando = LocalDateTime(dia, h!!).toInstant(TimeZone.currentSystemDefault())
                    enviando = true
                    scope.launch {
                        val r = repo.crear(
                            NuevaSesionRequest(
                                gameId = id!!,
                                trophyId = trofeo.takeIf { it != OTRO },
                                trofeo = if (trofeo == OTRO) trofeoLibre else "",
                                descripcion = descripcion,
                                fechaHora = cuando.toString(),
                                plazasTotales = plazas,
                            ),
                        )
                        enviando = false
                        when (r) {
                            is SesionResultado.Ok -> onCreada(r.valor)
                            is SesionResultado.Error -> error = r.mensaje
                        }
                    }
                },
                enabled = !enviando,
                colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Background),
                shape = RoundedCornerShape(radio(10)),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) { Text(Textos.t(T.sesiones_publicar), fontWeight = FontWeight.Bold) }
        }
    }

    if (eligiendoFecha) {
        val estado = rememberDatePickerState(initialSelectedDateMillis = fechaMillisUtc)
        DatePickerDialog(
            onDismissRequest = { eligiendoFecha = false },
            confirmButton = {
                TextButton(onClick = { fechaMillisUtc = estado.selectedDateMillis; eligiendoFecha = false }) { Text(Textos.t(T.comun_aceptar), color = Accent) }
            },
            dismissButton = { TextButton(onClick = { eligiendoFecha = false }) { Text(Textos.t(T.comun_cancelar), color = Muted) } },
        ) { DatePicker(state = estado) }
    }
    if (eligiendoHora) {
        val estado = rememberTimePickerState(initialHour = hora?.hour ?: 21, initialMinute = hora?.minute ?: 0, is24Hour = true)
        androidx.compose.material3.AlertDialog(
            onDismissRequest = { eligiendoHora = false },
            confirmButton = {
                TextButton(onClick = { hora = LocalTime(estado.hour, estado.minute); eligiendoHora = false }) { Text(Textos.t(T.comun_aceptar), color = Accent) }
            },
            dismissButton = { TextButton(onClick = { eligiendoHora = false }) { Text(Textos.t(T.comun_cancelar), color = Muted) } },
            text = { TimePicker(state = estado) },
            containerColor = Surface,
        )
    }
}

@Composable
private fun Campo(etiqueta: String, modifier: Modifier = Modifier, contenido: @Composable () -> Unit) {
    Column(modifier) {
        Text(etiqueta, color = Muted, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(bottom = 6.dp))
        contenido()
    }
}

@Composable
private fun BotonCampo(texto: String, onClick: () -> Unit) {
    Box(
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(radio(8)))
            .background(Background)
            .border(1.dp, Border, RoundedCornerShape(radio(8)))
            .premiumClickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 12.dp),
    ) { Text(texto, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold) }
}

@Composable
private fun CampoTexto(valor: String, onCambio: (String) -> Unit, placeholder: String, lineas: Int = 1) {
    OutlinedTextField(
        value = valor,
        onValueChange = onCambio,
        modifier = Modifier.fillMaxWidth(),
        singleLine = lineas == 1,
        minLines = lineas,
        maxLines = lineas.coerceAtLeast(1) + 1,
        placeholder = { Text(placeholder, color = Muted, fontSize = 14.sp) },
        textStyle = androidx.compose.ui.text.TextStyle(color = Foreground, fontSize = 14.sp),
        shape = RoundedCornerShape(radio(8)),
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = Accent.copy(alpha = 0.6f),
            unfocusedBorderColor = Border,
            cursorColor = Accent,
            focusedContainerColor = Background,
            unfocusedContainerColor = Background,
        ),
    )
}

/** El QR de una sesión (diseño v2): con la cámara normal abre la sesión en la web; con el lector de la app, aquí. */
@Composable
private fun HojaQrSesion(id: String, onDismiss: () -> Unit) {
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface) {
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(Textos.t(T.qr_compartir_sesion), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(Textos.t(T.qr_compartir_sesion_sub), color = Muted, fontSize = 14.sp, modifier = Modifier.padding(top = 4.dp, bottom = 20.dp))
            Box(Modifier.size(240.dp).clip(RoundedCornerShape(radio(24))).background(androidx.compose.ui.graphics.Color.White).padding(18.dp)) {
                androidx.compose.foundation.Image(
                    painter = io.github.alexzhirkevich.qrose.rememberQrCodePainter(com.paragon.app.util.enlaceSesion(id)),
                    contentDescription = Textos.t(T.qr_compartir_sesion),
                    modifier = Modifier.fillMaxSize(),
                )
            }
        }
    }
}
