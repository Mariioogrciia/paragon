package com.paragon.app.ui.compare

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import com.paragon.app.data.AmigoRow
import com.paragon.app.data.CompareData
import com.paragon.app.data.CompareRepository
import com.paragon.app.data.CompareResult
import com.paragon.app.data.CompareResultado
import com.paragon.app.data.CompareSide
import com.paragon.app.data.SharedGame
import com.paragon.app.data.SocialRepository
import com.paragon.app.data.SocialResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos


/**
 * Comparar con cualquier perfil público (no hace falta que sea amigo) contra
 * GET /api/mobile/compare/{handle}. Debajo del buscador, la lista de amigos
 * reales (mismo GET /api/mobile/social que SocialScreen) para elegir uno de
 * un toque sin tener que escribir su @handle a mano.
 */
@Composable
fun CompareScreen(tokenStore: TokenStore, initialHandle: String? = null, onBack: () -> Unit = {}) {
    val repository = remember(tokenStore) { CompareRepository(tokenStore) }
    val socialRepository = remember(tokenStore) { SocialRepository(tokenStore) }
    val coroutineScope = rememberCoroutineScope()
    var handle by remember(initialHandle) { mutableStateOf(initialHandle ?: "") }
    var result by remember { mutableStateOf<CompareResult?>(null) }
    var loading by remember { mutableStateOf(false) }
    var amigos by remember { mutableStateOf<List<AmigoRow>>(emptyList()) }

    // Declarada ANTES del LaunchedEffect que la usa — una función local de
    // Kotlin no se puede llamar antes de su propia declaración textual en
    // el mismo bloque, a diferencia de una función de nivel superior.
    fun buscar(query: String) {
        val limpio = query.trim().removePrefix("@")
        if (limpio.isBlank()) return
        loading = true
        result = null
        coroutineScope.launch {
            result = repository.compare(limpio)
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        val social = socialRepository.getSocial()
        amigos = (social as? SocialResult.Ok)?.data?.amigos.orEmpty()

        if (!initialHandle.isNullOrBlank()) {
            buscar(initialHandle)
        }
    }

    Column(modifier = Modifier.fillMaxSize().background(Background)) {
        com.paragon.app.ui.common.CabeceraNativa(titulo = Textos.t(T.comparar_titulo), onBack = onBack)

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = handle,
                onValueChange = { handle = it },
                modifier = Modifier.weight(1f),
                placeholder = { Text(Textos.t(T.comparar_ph), color = Muted) },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedContainerColor = Surface,
                    unfocusedContainerColor = Surface,
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground,
                    cursorColor = Accent,
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                ),
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(imeAction = androidx.compose.ui.text.input.ImeAction.Search),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onSearch = { buscar(handle) }),
            )
            Spacer(Modifier.width(12.dp))
            Button(onClick = { buscar(handle) }, colors = ButtonDefaults.buttonColors(containerColor = Accent)) {
                Text(Textos.t(T.nav_comparar))
            }
        }

        when {
            loading -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
            result is CompareResult.Error -> Box(modifier = Modifier.fillMaxWidth().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = (result as CompareResult.Error).message, color = Muted, fontSize = 14.sp)
                    // El buscador de arriba se queda con el @handle puesto,
                    // así que "reintentar" ya era posible tocando
                    // "Comparar" otra vez — este botón solo lo hace
                    // explícito, mismo patrón que el resto de pantallas
                    // con estado de error.
                    TextButton(onClick = { buscar(handle) }, modifier = Modifier.padding(top = 8.dp)) {
                        Text(Textos.t(T.comun_reintentar), color = Accent, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
            result is CompareResult.Ok -> CompareContent((result as CompareResult.Ok).data)
            else -> FriendsPicker(amigos = amigos, onPick = { buscar(it) })
        }
    }
}

/** Lista de amigos reales (GET /api/mobile/social) para comparar de un toque, sin escribir el @handle a mano. */
@Composable
private fun FriendsPicker(amigos: List<AmigoRow>, onPick: (String) -> Unit) {
    val conHandle = amigos.filter { !it.handle.isNullOrBlank() }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(top = 4.dp, bottom = 32.dp + com.paragon.app.ui.common.huecoBarra()),
    ) {
        item {
            Text(
                text = Textos.t(T.comparar_amigos),
                color = Muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(bottom = 4.dp),
            )
        }
        if (conHandle.isEmpty()) {
            item {
                Text(
                    text = Textos.t(T.comparar_sin_amigos),
                    color = Muted,
                    fontSize = 13.sp,
                )
            }
        } else {
            items(conHandle, key = { it.userId }) { amigo ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Surface, RoundedCornerShape(radio(14)))
                        .clickable { onPick(amigo.handle!!) }
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = amigo.name, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(text = Textos.t(T.comparar_handle_nivel, amigo.handle ?: "", amigo.level), color = Muted, fontSize = 12.sp)
                    }
                    Text(text = Textos.t(T.comun_n_platinos, amigo.platinos), color = Platinum, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun CompareContent(data: CompareData) {
    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(bottom = 32.dp + com.paragon.app.ui.common.huecoBarra()),
    ) {
        item { CompareSummary(data.me, data.them, data.resultado) }
        item {
            Text(
                text = Textos.t(T.comparar_en_comun, data.sharedGames.size),
                color = Foreground,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(top = 8.dp, bottom = 4.dp),
            )
        }
        if (data.sharedGames.isEmpty()) {
            item { Text(text = Textos.t(T.comparar_sin_comun), color = Muted, fontSize = 13.sp) }
        } else {
            items(data.sharedGames, key = { it.id }) { SharedGameRow(it, data.them.name) }
        }
    }
}

/**
 * Diseño v2 (maqueta "15 · Comparar"): las dos fotos con el VS en medio y
 * los platinos debajo, filas "tú | dato | el otro" con el que gana en el
 * acento, y la etiqueta de quién va ganando (por platinos, como la web).
 */
@Composable
private fun CompareSummary(me: CompareSide, them: CompareSide, resultado: CompareResultado) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(20)))
            .border(1.dp, Border, RoundedCornerShape(radio(20)))
            .padding(20.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            Lado(Textos.t(T.comparar_tu), me, destacado = resultado == CompareResultado.GANO)
            Text(
                text = "VS",
                color = Muted,
                fontSize = 15.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
            Lado(them.name, them, destacado = resultado == CompareResultado.PIERDO)
        }
        Spacer(Modifier.height(16.dp))
        FilaDato(me.level, Textos.t(T.comun_nivel), them.level)
        FilaDato(me.trofeos, Textos.t(T.comun_trofeos), them.trofeos)
        FilaDato(me.juegos, Textos.t(T.comun_juegos), them.juegos)
        Spacer(Modifier.height(14.dp))
        val (texto, color) = when (resultado) {
            CompareResultado.GANO -> Textos.t(T.comparar_ganando) to Good
            CompareResultado.PIERDO -> Textos.t(T.comparar_perdiendo) to Danger
            CompareResultado.EMPATE -> Textos.t(T.comparar_empate) to Muted
        }
        Text(
            text = texto,
            color = color,
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier
                .align(Alignment.CenterHorizontally)
                .background(color.copy(alpha = 0.14f), RoundedCornerShape(radio(20)))
                .padding(horizontal = 14.dp, vertical = 6.dp),
        )
    }
}

@Composable
private fun RowScope.Lado(etiqueta: String, side: CompareSide, destacado: Boolean) {
    Column(modifier = Modifier.weight(1f), horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(CircleShape)
                .background(Surface2)
                .then(if (destacado) Modifier.border(2.dp, Accent, CircleShape) else Modifier),
            contentAlignment = Alignment.Center,
        ) {
            com.paragon.app.ui.common.AvatarPersona(side.avatarUrl, side.name, size = 64.dp)
        }
        Text(
            text = etiqueta,
            color = Foreground,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 8.dp),
        )
        Text(text = Textos.t(T.comun_n_platinos, side.platinos), color = Platinum, fontSize = 13.sp, fontWeight = FontWeight.Bold)
    }
}

/** "tú | dato | el otro": el número mayor va en el acento. */
@Composable
private fun FilaDato(mio: Int, etiqueta: String, suyo: Int) {
    Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(
            text = com.paragon.app.util.cifra(mio),
            color = if (mio > suyo) Accent else Foreground,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Text(text = etiqueta, color = Muted, fontSize = 12.sp, modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Text(
            text = com.paragon.app.util.cifra(suyo),
            color = if (suyo > mio) Accent else Foreground,
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.weight(1f),
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}

/** Un juego en común con una barra por persona (tú en el acento, el otro en gris). */
@Composable
private fun SharedGameRow(game: SharedGame, nombreOtro: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(radio(14)))
            .padding(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = game.iconUrl,
            contentDescription = null,
            modifier = Modifier.size(48.dp).background(Surface2, RoundedCornerShape(radio(10))),
        )
        Spacer(Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(text = game.title, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            BarraPersona(Textos.t(T.comparar_tu).lowercase().replaceFirstChar { it.uppercase() }, game.myPercent, Accent)
            BarraPersona(nombreOtro, game.theirPercent, Muted)
        }
    }
}

@Composable
private fun BarraPersona(nombre: String, pct: Int, color: androidx.compose.ui.graphics.Color) {
    Row(Modifier.fillMaxWidth().padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(text = nombre, color = Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.width(56.dp))
        Box(Modifier.weight(1f).height(6.dp).clip(RoundedCornerShape(radio(3))).background(Surface2)) {
            Box(Modifier.fillMaxWidth(pct.coerceIn(0, 100) / 100f).fillMaxHeight().background(if (pct >= 100) Good else color))
        }
        Text(
            text = if (pct >= 100) "100% ✓" else "$pct%",
            color = if (pct >= 100) Good else Foreground,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            textAlign = androidx.compose.ui.text.style.TextAlign.End,
            modifier = Modifier.width(52.dp),
        )
    }
}
