package com.paragon.app.ui.perfil

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.PersonAdd
import androidx.compose.material.icons.filled.PersonSearch
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.StarBorder
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.GlobalStats
import com.paragon.app.data.PanelRepository
import com.paragon.app.data.PanelResult
import com.paragon.app.data.UserProfileRepository
import com.paragon.app.data.UserProfileResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.isoAMillis
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.AvatarPersona
import com.paragon.app.ui.common.CabeceraNativa
import com.paragon.app.ui.common.ControlSegmentado
import com.paragon.app.ui.common.EmptyState
import com.paragon.app.ui.common.EsqueletoLista
import com.paragon.app.ui.common.rememberCoverAuraColor
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.AccentSoft
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Border
import com.paragon.app.ui.theme.Bronze
import com.paragon.app.ui.theme.Danger
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Gold
import com.paragon.app.ui.theme.Good
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.OnAccent
import com.paragon.app.ui.theme.Platinum
import com.paragon.app.ui.theme.Silver
import com.paragon.app.ui.theme.Surface
import com.paragon.app.ui.theme.Surface2
import com.paragon.app.ui.theme.radio
import com.paragon.app.ui.trofeos.FilaTrofeo
import com.paragon.app.ui.trofeos.aTrophyItem
import com.paragon.app.ui.trofeos.mover
import com.paragon.app.ui.trofeos.nombreDia
import com.paragon.app.ui.trofeos.nombreMes
import com.paragon.app.util.cifra
import com.paragon.app.util.fechaConPatron
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.DiaMesDto
import com.paragon.shared.red.HttpException
import com.paragon.shared.red.LadoMesDto
import com.paragon.shared.red.MesComparadoResponse
import com.paragon.shared.red.MesPerfilDto
import com.paragon.shared.red.RecentGameDto
import com.paragon.shared.red.UserProfileDto
import com.paragon.shared.red.paragonErrorMessage
import kotlinx.coroutines.launch

/**
 * El perfil de verdad de cualquiera (9 oct 2026), en pantalla completa: antes
 * era una hoja con tres cifras y los juegos recientes, y tu pestaña "Perfil"
 * solo un menú. Ahora es lo mismo que cuenta la web en /u/<handle>:
 *
 * - Cabecera con su color (sacado de la foto), nivel, plataformas y clan.
 * - Amistad, comparar y rival principal (si no eres tú).
 * - Cifras por metal, horas, rachas, este año y su mejor mes.
 * - Últimos 12 meses en barras.
 * - **Mes a mes día a día contra ti**: barras por día de los dos (o la
 *   carrera acumulada), con flechas para ir a cualquier mes; tocar un día
 *   enseña lo que sacó cada uno ese día.
 * - Últimos trofeos y jugado recientemente.
 *
 * Solo colores y radios del tema: Apariencia sigue mandando.
 */
@Composable
fun PerfilUsuarioScreen(
    handle: String,
    tokenStore: TokenStore,
    database: com.paragon.app.data.local.ParagonDatabase,
    themeStore: com.paragon.app.data.theme.ThemeStore,
    atras: String,
    onBack: () -> Unit,
    onComparar: (String) -> Unit,
) {
    val repository = remember(tokenStore) { UserProfileRepository(tokenStore) }
    // Tus cifras para "Rivalidad": las del Panel, que ya están en caché.
    val panelRepository = remember(tokenStore, database) { PanelRepository(tokenStore, database.panelDao()) }
    var result by remember { mutableStateOf<UserProfileResult?>(null) }
    var misCifras by remember { mutableStateOf<GlobalStats?>(null) }
    var recarga by remember { mutableStateOf(0) }

    LaunchedEffect(handle, recarga) {
        result = null
        result = repository.getProfile(handle)
    }
    LaunchedEffect(Unit) {
        val panel = panelRepository.getPanel()
        if (panel is PanelResult.Ok) misCifras = panel.stats
    }

    Column(Modifier.fillMaxSize().background(Background)) {
        CabeceraNativa(titulo = "@$handle", atras = atras, onBack = onBack)
        when (val r = result) {
            null -> EsqueletoLista()
            is UserProfileResult.Error -> EmptyState(Icons.Default.PersonSearch, r.message, "", Textos.t(T.comun_reintentar), { recarga++ })
            is UserProfileResult.Ok -> ContenidoPerfil(r.profile, misCifras, tokenStore, themeStore, onComparar)
        }
    }
}

@Composable
private fun ContenidoPerfil(
    p: UserProfileDto,
    misCifras: GlobalStats?,
    tokenStore: TokenStore,
    themeStore: com.paragon.app.data.theme.ThemeStore,
    onComparar: (String) -> Unit,
) {
    val esYo = p.amistad == "yo"
    val aura = rememberCoverAuraColor(p.image)
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 40.dp)) {
        Cabecera(p, aura)

        if (!esYo) {
            Column(Modifier.padding(horizontal = 20.dp).padding(top = 16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                BotonAmistad(p, tokenStore)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    BotonSecundario(Icons.AutoMirrored.Filled.CompareArrows, Textos.t(T.nav_comparar), Modifier.weight(1f)) { onComparar(p.handle) }
                    val esRival = themeStore.rivalHandle == p.handle
                    BotonSecundario(
                        if (esRival) Icons.Default.Star else Icons.Default.StarBorder,
                        Textos.t(if (esRival) T.perfil_rival else T.perfil_fijar_rival),
                        Modifier.weight(1f),
                        color = if (esRival) Platinum else Foreground,
                    ) { themeStore.setRivalHandle(if (esRival) null else p.handle) }
                }
            }
        }

        Seccion(Textos.t(T.perfil_cifras)) { Cifras(p) }
        Seccion(Textos.t(T.perfil_actividad)) { Actividad(p) }
        if (p.porMes.any { it.total > 0 }) Seccion(Textos.t(T.perfil_ultimos_12)) { UltimosMeses(p.porMes) }
        Seccion(Textos.t(T.perfil_mes_titulo)) { MesDiaADia(p, tokenStore) }
        if (!esYo && misCifras != null) Seccion(Textos.t(T.perfil_rivalidad)) { Rivalidad(misCifras, p) }
        if (p.ultimosTrofeos.isNotEmpty()) {
            Seccion(Textos.t(T.perfil_ultimos_trofeos)) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    p.ultimosTrofeos.forEach { t -> FilaTrofeo(t.aTrophyItem(), t.juego) }
                }
            }
        }
        if (p.recentGames.isNotEmpty()) {
            Seccion(Textos.t(T.perfil_recientes), conPadding = false) {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(horizontal = 20.dp)) {
                    items(p.recentGames, key = { it.id }) { JuegoReciente(it) }
                }
            }
        }
    }
}

/* ---------------------------------- Cabecera --------------------------------- */

private fun colorNivel(level: Int): Color = when {
    level >= 50 -> Platinum
    level >= 25 -> Color(0xFF9B59F6)
    level >= 10 -> Accent
    else -> Border
}

private fun arquetipo(level: Int): String = when {
    level >= 50 -> Textos.t(T.arquetipo_elite)
    level >= 25 -> Textos.t(T.arquetipo_veterano)
    level >= 10 -> Textos.t(T.arquetipo_cazador)
    else -> Textos.t(T.arquetipo_explorador)
}

@Composable
private fun Cabecera(p: UserProfileDto, aura: Color?) {
    val tinte = aura ?: Accent
    val anillo = colorNivel(p.level)
    Column(
        Modifier.padding(horizontal = 20.dp).fillMaxWidth()
            .clip(RoundedCornerShape(radio(24)))
            .background(Brush.verticalGradient(listOf(tinte.copy(alpha = 0.30f), Surface)))
            .border(1.dp, tinte.copy(alpha = 0.35f), RoundedCornerShape(radio(24)))
            .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.size(104.dp).clip(CircleShape).background(anillo).padding(3.dp)) {
            AvatarPersona(p.image, p.name, size = 98.dp, colorInicial = Accent, fondo = Background)
        }
        Text(p.name, color = Foreground, fontSize = 24.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 12.dp))
        Text(
            Textos.t(T.perfil_nivel_arquetipo, p.level, arquetipo(p.level)),
            color = if (anillo == Border) Muted else anillo,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(top = 2.dp),
        )
        val chips = buildList {
            p.clan?.let { add("[${it.tag}] ${it.name}") }
            p.accounts.forEach { add("${it.platform.uppercase()} · ${it.username}") }
        }
        if (chips.isNotEmpty()) {
            LazyRow(Modifier.padding(top = 12.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(chips) { c ->
                    Text(
                        c,
                        color = Foreground,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        modifier = Modifier.clip(RoundedCornerShape(50)).background(Background.copy(alpha = 0.55f)).border(1.dp, Border, RoundedCornerShape(50)).padding(horizontal = 10.dp, vertical = 5.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun BotonSecundario(icono: androidx.compose.ui.graphics.vector.ImageVector, texto: String, modifier: Modifier, color: Color = Foreground, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(46.dp),
        shape = RoundedCornerShape(radio(14)),
        contentPadding = PaddingValues(horizontal = 10.dp),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = color),
        border = BorderStroke(1.dp, if (color == Foreground) Border else color.copy(alpha = 0.5f)),
    ) {
        Icon(icono, contentDescription = null, modifier = Modifier.size(17.dp))
        Text(texto, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 6.dp))
    }
}

/** Amistad (6 oct 2026, como el botón del perfil en la web): enviar, aceptar o "Amigos ✓". */
@Composable
private fun BotonAmistad(profile: UserProfileDto, tokenStore: TokenStore) {
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current
    var estado by remember(profile.handle) { mutableStateOf(profile.amistad) }
    var trabajando by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val forma = RoundedCornerShape(radio(14))
    val relleno = estado == "ninguna" || estado == "solicitudRecibida"
    val texto = when (estado) {
        "amigos" -> Textos.t(T.amistad_amigos)
        "solicitudEnviada" -> Textos.t(T.amistad_enviada)
        "solicitudRecibida" -> Textos.t(T.amistad_aceptar)
        else -> Textos.t(T.amistad_anadir)
    }
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Row(
            Modifier.fillMaxWidth().height(50.dp).clip(forma)
                .background(if (relleno) Accent else Surface)
                .border(1.dp, if (relleno) Accent else Border, forma)
                .clickable(enabled = relleno && !trabajando) {
                    trabajando = true
                    error = null
                    scope.launch {
                        try {
                            val api = ApiClient.amigosApi(tokenStore)
                            if (estado == "solicitudRecibida") {
                                api.aceptar(profile.userId)
                                estado = "amigos"
                            } else {
                                val r = api.enviar(profile.handle)
                                estado = if (r.amigos) "amigos" else "solicitudEnviada"
                            }
                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                        } catch (e: HttpException) {
                            error = e.paragonErrorMessage() ?: Textos.t(T.error_conexion)
                        } catch (e: Exception) {
                            error = Textos.t(T.error_conexion)
                        }
                        trabajando = false
                    }
                },
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                when (estado) {
                    "amigos" -> Icons.Default.Check
                    "solicitudEnviada" -> Icons.Default.Schedule
                    else -> Icons.Default.PersonAdd
                },
                contentDescription = null,
                tint = if (relleno) OnAccent else Muted,
                modifier = Modifier.size(20.dp),
            )
            Text(if (trabajando) "…" else texto, color = if (relleno) OnAccent else Muted, fontSize = 15.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 8.dp))
        }
        error?.let { Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp)) }
    }
}

/* ----------------------------------- Bloques --------------------------------- */

@Composable
private fun Seccion(titulo: String, conPadding: Boolean = true, contenido: @Composable () -> Unit) {
    Text(
        titulo.uppercase(),
        color = Muted,
        fontSize = 12.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 1.sp,
        modifier = Modifier.padding(start = 24.dp, end = 24.dp, top = 24.dp, bottom = 10.dp),
    )
    Box(if (conPadding) Modifier.padding(horizontal = 20.dp) else Modifier) { contenido() }
}

@Composable
private fun Tarjeta(modifier: Modifier = Modifier, contenido: @Composable () -> Unit) {
    Column(
        modifier.fillMaxWidth().clip(RoundedCornerShape(radio(18))).background(Surface).border(1.dp, Border, RoundedCornerShape(radio(18))).padding(16.dp),
    ) { contenido() }
}

@Composable
private fun Cifra(valor: String, etiqueta: String, color: Color, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(valor, color = color, fontSize = 20.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace, maxLines = 1)
        Text(etiqueta, color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun Cifras(p: UserProfileDto) {
    Tarjeta {
        Row {
            Cifra(cifra(p.platinos), Textos.t(T.comun_platinos), Platinum, Modifier.weight(1f))
            Cifra(cifra(p.oros), Textos.t(T.grado_oro), Gold, Modifier.weight(1f))
            Cifra(cifra(p.platas), Textos.t(T.grado_plata), Silver, Modifier.weight(1f))
            Cifra(cifra(p.bronces), Textos.t(T.grado_bronce), Bronze, Modifier.weight(1f))
        }
        Spacer(Modifier.height(14.dp))
        Row {
            Cifra(cifra(p.trofeos), Textos.t(T.comun_trofeos), Foreground, Modifier.weight(1f))
            Cifra(cifra(p.juegos), Textos.t(T.comun_juegos), Foreground, Modifier.weight(1f))
            Cifra(cifra(p.horas), Textos.t(T.perfil_horas), Foreground, Modifier.weight(1f))
            Cifra("${p.completadoMedio}%", Textos.t(T.perfil_completado_medio), Accent, Modifier.weight(1f))
        }
    }
}

@Composable
private fun Actividad(p: UserProfileDto) {
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Tarjeta(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Whatshot, contentDescription = null, tint = if (p.racha.actual > 0) Gold else Muted, modifier = Modifier.size(18.dp))
                Text(Textos.t(T.stats_racha_actual), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(start = 4.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(Textos.t(T.perfil_dias_n, p.racha.actual), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp))
            Text("${Textos.t(T.stats_mejor_racha)}: ${Textos.t(T.perfil_dias_n, p.racha.mejor)}", color = Muted, fontSize = 12.sp)
        }
        Tarjeta(Modifier.weight(1f)) {
            Text(Textos.t(T.perfil_este_anio), color = Muted, fontSize = 12.sp)
            Text(Textos.t(T.ritmo_n_trofeos, cifra(p.esteAnio)), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 4.dp), maxLines = 1)
            val mejor = p.mejorMes
            Text(
                if (mejor != null) "${Textos.t(T.perfil_mejor_mes)}: ${nombreMes(mejor.mes)} (${mejor.total})" else Textos.t(T.perfil_dias_activos, p.racha.diasActivos),
                color = Muted,
                fontSize = 12.sp,
                maxLines = 2,
            )
        }
    }
}

private fun inicialMes(mes: String): String =
    isoAMillis("$mes-15T12:00:00.000Z")?.let { fechaConPatron(it, "MMM") }?.take(3)?.replaceFirstChar { it.uppercase() } ?: mes.takeLast(2)

@Composable
private fun UltimosMeses(meses: List<MesPerfilDto>) {
    val maximo = (meses.maxOfOrNull { it.total } ?: 0).coerceAtLeast(1)
    val mejor = meses.maxByOrNull { it.total }?.mes
    Tarjeta {
        Row(Modifier.fillMaxWidth().height(110.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.Bottom) {
            meses.forEach { m ->
                Column(Modifier.weight(1f).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                    if (m.mes == mejor && m.total > 0) Text(cifra(m.total), color = Accent, fontSize = 9.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                    Box(
                        Modifier.fillMaxWidth()
                            .fillMaxHeight(if (m.total == 0) 0.03f else (m.total.toFloat() / maximo * 0.85f).coerceAtLeast(0.05f))
                            .clip(RoundedCornerShape(topStart = 4.dp, topEnd = 4.dp))
                            .background(if (m.mes == mejor) Accent else Accent.copy(alpha = if (m.total == 0) 0.15f else 0.5f)),
                    )
                }
            }
        }
        Row(Modifier.fillMaxWidth().padding(top = 6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
            meses.forEach { m ->
                Text(inicialMes(m.mes).take(1), color = Muted, fontSize = 10.sp, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
            }
        }
    }
}

/* ------------------------------ Mes a mes, día a día ----------------------------- */

@Composable
private fun MesDiaADia(p: UserProfileDto, tokenStore: TokenStore) {
    var mes by remember(p.handle) { mutableStateOf<String?>(null) }
    var datos by remember(p.handle) { mutableStateOf<MesComparadoResponse?>(null) }
    var error by remember { mutableStateOf(false) }
    var recarga by remember { mutableStateOf(0) }
    var dia by remember { mutableStateOf<String?>(null) }
    var vista by remember { mutableStateOf(0) } // 0 = por día, 1 = acumulado

    LaunchedEffect(p.handle, mes, recarga) {
        // La primera carga (mes = null) ya trae el actual: no repetirla al fijar `mes`.
        if (mes != null && datos?.mes == mes) return@LaunchedEffect
        datos = null
        error = false
        dia = null
        try {
            val r = ApiClient.usersApi(tokenStore).getMesComparado(p.handle, mes)
            datos = r
            if (mes == null) mes = r.mes
        } catch (e: Exception) {
            error = true
        }
    }

    Tarjeta {
        val actual = mes
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { actual?.let { mes = mover(it, -1) } }, modifier = Modifier.size(36.dp)) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = null, tint = Foreground)
            }
            Text(actual?.let { nombreMes(it) } ?: "…", color = Foreground, fontSize = 16.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center, modifier = Modifier.weight(1f))
            IconButton(onClick = { actual?.let { mes = mover(it, 1) } }, modifier = Modifier.size(36.dp)) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = null, tint = Foreground)
            }
        }
        val d = datos
        when {
            error -> Text(
                Textos.t(T.error_conexion) + " " + Textos.t(T.comun_reintentar),
                color = Accent,
                fontSize = 13.sp,
                modifier = Modifier.padding(vertical = 20.dp).clickable { recarga++ },
            )
            d == null -> Box(Modifier.fillMaxWidth().height(160.dp))
            else -> ContenidoMes(p, d, dia, vista, onDia = { dia = if (dia == it) null else it }, onVista = { vista = it })
        }
    }
}

@Composable
private fun ContenidoMes(
    p: UserProfileDto,
    d: MesComparadoResponse,
    dia: String?,
    vista: Int,
    onDia: (String) -> Unit,
    onVista: (Int) -> Unit,
) {
    val ellos = d.ellos
    val yo = d.yo
    val colorEllos = Accent
    val colorYo = Foreground.copy(alpha = 0.55f)
    val nombre = p.name

    Text(
        Textos.t(if (yo != null) T.perfil_mes_vs else T.perfil_mes_propio),
        color = Muted,
        fontSize = 12.sp,
        modifier = Modifier.padding(top = 2.dp, bottom = 10.dp),
    )

    // Marcador del mes.
    Row(verticalAlignment = Alignment.CenterVertically) {
        Marcador(nombre, ellos, colorEllos, Modifier.weight(1f))
        if (yo != null) Marcador(Textos.t(T.perfil_leyenda_tu), yo, colorYo, Modifier.weight(1f), alFinal = true)
    }
    if (yo != null) {
        val dif = ellos.total - yo.total
        val (texto, color) = when {
            dif > 0 -> Textos.t(T.perfil_mes_gana, nombre, dif) to Danger
            dif < 0 -> Textos.t(T.perfil_mes_ganas, -dif) to Good
            else -> Textos.t(T.perfil_mes_empate) to Muted
        }
        val ganaEllos = ellos.porDia.zip(yo.porDia).count { (a, b) -> a.total > b.total }
        val ganoYo = ellos.porDia.zip(yo.porDia).count { (a, b) -> b.total > a.total }
        Text(texto, color = color, fontSize = 13.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp))
        Text(Textos.t(T.perfil_dias_ganados, ganaEllos, ganoYo), color = Muted, fontSize = 12.sp)
    }

    if (ellos.total == 0 && (yo == null || yo.total == 0)) {
        Text(Textos.t(T.ritmo_vacio_titulo), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(vertical = 24.dp))
        return
    }

    if (yo != null) {
        ControlSegmentado(
            opciones = listOf(Textos.t(T.perfil_por_dia), Textos.t(T.perfil_acumulado)),
            seleccion = vista,
            onCambio = onVista,
            modifier = Modifier.padding(top = 14.dp),
        )
    }

    if (vista == 1 && yo != null) {
        Carrera(ellos.porDia, yo.porDia, colorEllos, colorYo)
    } else {
        BarrasDobles(ellos.porDia, yo?.porDia, colorEllos, colorYo, dia, onDia)
    }

    // Lo que sacó cada uno el día elegido.
    if (vista == 0) {
        if (dia == null) {
            Text(Textos.t(T.perfil_toca_dia), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 8.dp))
        } else {
            DetalleDia(dia, nombre, ellos, yo, colorEllos)
        }
    }

    // Sus juegos del mes (y los tuyos).
    if (ellos.porJuego.isNotEmpty() || (yo?.porJuego?.isNotEmpty() == true)) {
        Text(Textos.t(T.perfil_juegos_mes), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp, modifier = Modifier.padding(top = 18.dp, bottom = 8.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            JuegosDelMes(ellos, colorEllos, Modifier.weight(1f))
            if (yo != null) JuegosDelMes(yo, colorYo, Modifier.weight(1f))
        }
    }
}

@Composable
private fun Marcador(nombre: String, lado: LadoMesDto, color: Color, modifier: Modifier, alFinal: Boolean = false) {
    val activos = lado.porDia.count { it.total > 0 }
    val mejor = lado.porDia.maxByOrNull { it.total }?.takeIf { it.total > 0 }
    Column(modifier, horizontalAlignment = if (alFinal) Alignment.End else Alignment.Start) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(10.dp).clip(CircleShape).background(color))
            Text(nombre, color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(start = 6.dp))
        }
        Text(cifra(lado.total), color = Foreground, fontSize = 28.sp, fontWeight = FontWeight.Bold, fontFamily = FontFamily.Monospace)
        Text(Textos.t(T.perfil_dias_activos, activos), color = Muted, fontSize = 11.sp)
        if (mejor != null) {
            Text(Textos.t(T.perfil_mejor_dia, mejor.dia.takeLast(2).trimStart('0'), mejor.total), color = Muted, fontSize = 11.sp)
        }
    }
}

/** Una columna por día con dos barras (la suya y la tuya); tocar un día lo elige. */
@Composable
private fun BarrasDobles(
    ellos: List<DiaMesDto>,
    yo: List<DiaMesDto>?,
    colorEllos: Color,
    colorYo: Color,
    elegido: String?,
    onDia: (String) -> Unit,
) {
    val maximo = maxOf(ellos.maxOfOrNull { it.total } ?: 0, yo?.maxOfOrNull { it.total } ?: 0).coerceAtLeast(1)
    val hoy = com.paragon.app.util.claveDia(com.paragon.app.data.ahoraMillis())
    Row(
        Modifier.fillMaxWidth().height(130.dp).padding(top = 14.dp),
        horizontalArrangement = Arrangement.spacedBy(2.dp),
        verticalAlignment = Alignment.Bottom,
    ) {
        ellos.forEachIndexed { i, e ->
            val m = yo?.getOrNull(i)
            val total = e.total + (m?.total ?: 0)
            val activo = e.dia == elegido
            Row(
                Modifier.weight(1f).fillMaxHeight()
                    .clip(RoundedCornerShape(3.dp))
                    .background(if (activo) AccentSoft else Color.Transparent)
                    .then(if (total > 0) Modifier.clickable { onDia(e.dia) } else Modifier),
                horizontalArrangement = Arrangement.spacedBy(1.dp),
                verticalAlignment = Alignment.Bottom,
            ) {
                Barra(e.total, maximo, colorEllos, e.dia > hoy, Modifier.weight(1f))
                if (m != null) Barra(m.total, maximo, colorYo, e.dia > hoy, Modifier.weight(1f))
            }
        }
    }
    Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
        listOf(1, 8, 15, 22).forEach { n ->
            Text("$n", color = Muted, fontSize = 10.sp, modifier = Modifier.weight(1f))
        }
        Text("${ellos.size}", color = Muted, fontSize = 10.sp)
    }
}

@Composable
private fun Barra(valor: Int, maximo: Int, color: Color, futuro: Boolean, modifier: Modifier) {
    Box(
        modifier
            .fillMaxHeight(if (valor == 0) 0.025f else (valor.toFloat() / maximo).coerceAtLeast(0.05f))
            .clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp))
            .background(if (valor == 0) Border.copy(alpha = if (futuro) 0.3f else 1f) else color),
    )
}

/** La carrera del mes: el total acumulado de cada uno, día a día. */
@Composable
private fun Carrera(ellos: List<DiaMesDto>, yo: List<DiaMesDto>, colorEllos: Color, colorYo: Color) {
    val hoy = com.paragon.app.util.claveDia(com.paragon.app.data.ahoraMillis())
    // Los días que aún no han llegado no se pintan: la línea se queda en hoy.
    val hasta = ellos.indexOfLast { it.dia <= hoy }.let { if (it < 0) ellos.size - 1 else it }
    val acumEllos = ellos.take(hasta + 1).runningFold(0) { a, d -> a + d.total }.drop(1)
    val acumYo = yo.take(hasta + 1).runningFold(0) { a, d -> a + d.total }.drop(1)
    val maximo = maxOf(acumEllos.lastOrNull() ?: 0, acumYo.lastOrNull() ?: 0).coerceAtLeast(1)
    val rejilla = Border
    Canvas(Modifier.fillMaxWidth().height(150.dp).padding(top = 14.dp)) {
        val ancho = size.width
        val alto = size.height
        val pasos = (ellos.size - 1).coerceAtLeast(1)
        for (k in 0..3) {
            val y = alto * k / 3f
            drawLine(rejilla, Offset(0f, y), Offset(ancho, y), strokeWidth = 1f)
        }
        fun linea(valores: List<Int>, color: Color) {
            if (valores.isEmpty()) return
            val camino = Path()
            valores.forEachIndexed { i, v ->
                val x = ancho * i / pasos
                val y = alto - alto * v / maximo
                if (i == 0) camino.moveTo(x, y) else camino.lineTo(x, y)
            }
            drawPath(camino, color, style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
            val ultimo = valores.lastIndex
            drawCircle(color, radius = 4.dp.toPx(), center = Offset(ancho * ultimo / pasos, alto - alto * valores.last() / maximo))
        }
        linea(acumYo, colorYo)
        linea(acumEllos, colorEllos)
    }
    Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
        Text("1", color = Muted, fontSize = 10.sp, modifier = Modifier.weight(1f))
        Text("${ellos.size}", color = Muted, fontSize = 10.sp)
    }
}

@Composable
private fun DetalleDia(dia: String, nombre: String, ellos: LadoMesDto, yo: LadoMesDto?, colorEllos: Color) {
    val suyos = ellos.trofeos.filter { it.earnedAt.startsWith(dia) }
    val mios = yo?.trofeos?.filter { it.earnedAt.startsWith(dia) }.orEmpty()
    Column(Modifier.padding(top = 14.dp)) {
        Text(nombreDia(dia).replaceFirstChar { it.uppercase() }, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.Bold)
        if (suyos.isEmpty() && mios.isEmpty()) {
            Text(Textos.t(T.perfil_dia_vacio), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
        }
        if (suyos.isNotEmpty()) {
            Text("$nombre · ${suyos.size}", color = colorEllos, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 10.dp, bottom = 6.dp))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { suyos.forEach { FilaTrofeo(it.aTrophyItem(), it.juego) } }
        }
        if (mios.isNotEmpty()) {
            Text("${Textos.t(T.perfil_leyenda_tu)} · ${mios.size}", color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 12.dp, bottom = 6.dp))
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { mios.forEach { FilaTrofeo(it.aTrophyItem(), it.juego) } }
        }
    }
}

@Composable
private fun JuegosDelMes(lado: LadoMesDto, color: Color, modifier: Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        lado.porJuego.take(3).forEach { j ->
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(30.dp).clip(RoundedCornerShape(radio(6))).background(Surface2)) {
                    if (!j.iconUrl.isNullOrBlank()) {
                        AsyncImage(model = j.iconUrl, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                    }
                }
                Column(Modifier.padding(start = 8.dp).weight(1f)) {
                    Text(j.juego, color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text(Textos.t(T.ritmo_n_trofeos, j.total), color = color, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

/* ---------------------------------- Rivalidad --------------------------------- */

/** Tú contra ellos en lo que hay de los dos (tus cifras salen del Panel). */
@Composable
private fun Rivalidad(mias: GlobalStats, suyo: UserProfileDto) {
    val filas = listOf(
        Triple(Textos.t(T.comun_platinos), mias.platinums, suyo.platinos),
        Triple(Textos.t(T.comun_trofeos), mias.trophies, suyo.trofeos),
        Triple(Textos.t(T.comun_juegos), mias.games, suyo.juegos),
    )
    val voyGanando = filas.count { (_, yo, ellos) -> yo > ellos }
    Tarjeta {
        Text(
            Textos.t(T.perfil_ventaja, voyGanando, filas.size) + if (voyGanando == filas.size) Textos.t(T.perfil_ventaja_todo) else ".",
            color = if (voyGanando > filas.size / 2) Good else Muted,
            fontSize = 13.sp,
            fontWeight = FontWeight.SemiBold,
        )
        filas.forEach { (etiqueta, yo, ellos) ->
            val total = (yo + ellos).coerceAtLeast(1)
            Column(Modifier.padding(top = 12.dp)) {
                Row {
                    Text(etiqueta, color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Text(Textos.t(T.perfil_tu, cifra(yo)), color = if (yo >= ellos) Good else Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Text("  ·  ", color = Muted, fontSize = 12.sp)
                    Text(cifra(ellos), color = if (ellos > yo) Danger else Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                // Tira repartida: tu parte a la izquierda, la suya a la derecha.
                Row(Modifier.fillMaxWidth().padding(top = 6.dp).height(6.dp).clip(RoundedCornerShape(50))) {
                    if (yo > 0) Box(Modifier.weight(yo.toFloat() / total).fillMaxHeight().background(if (yo >= ellos) Good else Muted.copy(alpha = 0.5f)))
                    if (ellos > 0) Box(Modifier.weight(ellos.toFloat() / total).fillMaxHeight().background(if (ellos > yo) Accent else Border))
                    if (yo == 0 && ellos == 0) Box(Modifier.fillMaxSize().background(Border))
                }
            }
        }
    }
}

/* ------------------------------- Jugado recientemente ------------------------------ */

@Composable
private fun JuegoReciente(game: RecentGameDto) {
    Column(Modifier.width(120.dp)) {
        Box(Modifier.size(120.dp).clip(RoundedCornerShape(radio(14))).background(Surface2)) {
            if (game.coverUrl.isNotBlank()) {
                AsyncImage(model = game.coverUrl, contentDescription = game.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            }
            // Progreso como una tira abajo de la carátula.
            Box(Modifier.align(Alignment.BottomStart).fillMaxWidth().height(4.dp).background(Background.copy(alpha = 0.6f))) {
                Box(Modifier.fillMaxWidth(game.percent.coerceIn(0, 100) / 100f).fillMaxHeight().background(if (game.percent >= 100) Platinum else Accent))
            }
        }
        Text(game.title, color = Foreground, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 6.dp))
        Text(Textos.t(T.comun_completado, game.percent), color = Muted, fontSize = 11.sp)
    }
}
