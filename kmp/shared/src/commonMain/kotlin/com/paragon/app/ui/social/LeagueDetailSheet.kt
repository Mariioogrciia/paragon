package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.AmigoRow
import com.paragon.app.data.ChallengeStanding
import com.paragon.app.data.LeagueDetail
import com.paragon.app.data.LeagueDetailResult
import com.paragon.app.data.LeagueStanding
import com.paragon.app.data.LeaguesRepository
import com.paragon.app.data.PendingMember
import com.paragon.app.data.LibraryGame
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.LibraryResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.common.ConfirmDialog
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

import com.paragon.app.ui.common.CabeceraHoja

/**
 * Clasificación de una liga propia (solo con amigos, a diferencia de la
 * Liga Mensual global) + gestión de miembros si eres el dueño — invitar
 * amigos que todavía no están dentro, quitar a alguien, o borrar la liga
 * entera. Si no eres el dueño, solo puedes salir. Incluye el "reto": un
 * juego concreto elegido por el dueño para picarse a ver quién platina
 * antes, aparte de la clasificación por puntos del mes.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeagueDetailSheet(
    leagueId: String,
    tokenStore: TokenStore,
    amigos: List<AmigoRow>,
    onDismiss: () -> Unit,
    onChanged: () -> Unit,
) {
    val repository = remember(tokenStore) { LeaguesRepository(tokenStore) }
    var result by remember { mutableStateOf<LeagueDetailResult?>(null) }
    val refreshKey = remember { mutableIntStateOf(0) }
    var showGamePicker by remember { mutableStateOf(false) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()

    LaunchedEffect(refreshKey.value) {
        result = repository.getLeagueDetail(leagueId)
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = Surface) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp)) {
            CabeceraHoja(onBack = onDismiss)
            when (val current = result) {
                null -> Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is LeagueDetailResult.Error -> Text(text = current.message, color = Muted, fontSize = 14.sp)
                is LeagueDetailResult.Ok -> LeagueDetailContent(
                    detail = current.detail,
                    amigosDisponibles = amigos.filter { amigo -> current.detail.standings.none { it.userId == amigo.userId } },
                    onInvite = { userId ->
                        scope.launch {
                            if (repository.addMember(leagueId, userId)) {
                                refreshKey.value += 1
                                onChanged()
                            }
                        }
                    },
                    onRemove = { userId ->
                        scope.launch {
                            if (repository.removeMember(leagueId, userId)) {
                                refreshKey.value += 1
                                onChanged()
                            }
                        }
                    },
                    onLeave = {
                        scope.launch {
                            if (repository.leaveLeague(leagueId)) {
                                onChanged()
                                onDismiss()
                            }
                        }
                    },
                    onDelete = {
                        scope.launch {
                            if (repository.deleteLeague(leagueId)) {
                                onChanged()
                                onDismiss()
                            }
                        }
                    },
                    onPickChallenge = { showGamePicker = true },
                    onClearChallenge = {
                        scope.launch {
                            if (repository.setChallenge(leagueId, null)) refreshKey.value += 1
                        }
                    },
                )
            }
        }
    }

    if (showGamePicker) {
        GamePickerDialog(
            tokenStore = tokenStore,
            onDismiss = { showGamePicker = false },
            onPick = { gameId ->
                showGamePicker = false
                scope.launch {
                    if (repository.setChallenge(leagueId, gameId)) refreshKey.value += 1
                }
            },
        )
    }
}

private class PendingConfirm(val title: String, val message: String, val confirmLabel: String, val onConfirm: () -> Unit)

@Composable
private fun LeagueDetailContent(
    detail: LeagueDetail,
    amigosDisponibles: List<AmigoRow>,
    onInvite: (String) -> Unit,
    onRemove: (String) -> Unit,
    onLeave: () -> Unit,
    onDelete: () -> Unit,
    onPickChallenge: () -> Unit,
    onClearChallenge: () -> Unit,
) {
    var confirm by remember { mutableStateOf<PendingConfirm?>(null) }

    Text(text = detail.name, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    Text(text = Textos.t(T.liga_clasif_sub), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
    Text(text = textoDuracion(detail.durationValue, detail.durationUnit, detail.endsAt), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(bottom = 16.dp))

    detail.standings.forEachIndexed { index, member ->
        // Puntos para superar al de arriba — dato nuevo, no venía de
        // ningún sitio: sale de la propia lista ya ordenada, sin tocar la
        // API. `null` para el primer puesto (no hay nadie por delante).
        val puntosParaSubir = if (index == 0) null else detail.standings[index - 1].points - member.points
        LeagueStandingRow(member, index + 1, puntosParaSubir)
        if (detail.isOwner && member.userId != detail.ownerId) {
            TextButton(
                onClick = {
                    confirm = PendingConfirm(
                        title = Textos.t(T.liga_quitar_titulo),
                        message = Textos.t(T.liga_quitar_texto, member.name),
                        confirmLabel = Textos.t(T.liga_quitar_si),
                        onConfirm = { onRemove(member.userId) },
                    )
                },
                modifier = Modifier.padding(start = 8.dp),
            ) {
                Text(Textos.t(T.liga_quitar), color = Danger, fontSize = 12.sp)
            }
        }
    }

    if (detail.isOwner && detail.pendingMembers.isNotEmpty()) {
        Spacer(Modifier.height(16.dp))
        Text(text = Textos.t(T.liga_invitaciones), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        detail.pendingMembers.forEach { pending ->
            PendingMemberRow(
                pending,
                onCancel = {
                    confirm = PendingConfirm(
                        title = Textos.t(T.liga_cancelar_inv_titulo),
                        message = Textos.t(T.liga_cancelar_inv_texto, pending.name),
                        confirmLabel = Textos.t(T.liga_cancelar_inv_si),
                        onConfirm = { onRemove(pending.userId) },
                    )
                },
            )
        }
    }

    Spacer(Modifier.height(16.dp))
    HorizontalDivider(color = Border)
    Spacer(Modifier.height(16.dp))
    Text(text = Textos.t(T.liga_reto), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Spacer(Modifier.height(8.dp))

    val challenge = detail.challenge
    if (challenge != null) {
        Text(text = Textos.t(T.liga_reto_texto, challenge.title), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 10.dp))
        challenge.standings.forEachIndexed { index, member ->
            ChallengeStandingRow(member, index + 1)
        }
        if (detail.isOwner) {
            Row(modifier = Modifier.padding(top = 4.dp)) {
                TextButton(onClick = onPickChallenge) { Text(Textos.t(T.comun_cambiar), color = Accent, fontSize = 12.sp) }
                TextButton(onClick = onClearChallenge) { Text(Textos.t(T.liga_quitar_reto), color = Danger, fontSize = 12.sp) }
            }
        }
    } else if (detail.isOwner) {
        Text(text = Textos.t(T.liga_reto_elige), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
        TextButton(onClick = onPickChallenge) {
            Text(Textos.t(T.liga_reto_elegir), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    } else {
        Text(text = Textos.t(T.liga_sin_reto), color = Muted, fontSize = 13.sp)
    }

    if (detail.isOwner) {
        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))
        Text(text = Textos.t(T.liga_invitar_amigo), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        if (amigosDisponibles.isEmpty()) {
            Text(text = Textos.t(T.liga_todos_dentro), color = Muted, fontSize = 13.sp)
        } else {
            LazyColumn(modifier = Modifier.heightIn(max = 220.dp)) {
                items(amigosDisponibles, key = { it.userId }) { amigo ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onInvite(amigo.userId) }
                            .padding(vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(text = amigo.name, color = Foreground, fontSize = 14.sp)
                        Text(text = Textos.t(T.comun_invitar), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        TextButton(
            onClick = {
                confirm = PendingConfirm(
                    title = Textos.t(T.liga_borrar_titulo),
                    message = Textos.t(T.liga_borrar_texto, detail.name),
                    confirmLabel = Textos.t(T.comun_si_borrar),
                    onConfirm = onDelete,
                )
            },
        ) {
            Text(Textos.t(T.liga_borrar), color = Danger, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    } else {
        Spacer(Modifier.height(20.dp))
        TextButton(
            onClick = {
                confirm = PendingConfirm(
                    title = Textos.t(T.liga_salir_titulo),
                    message = Textos.t(T.liga_salir_texto, detail.name),
                    confirmLabel = Textos.t(T.liga_salir_si),
                    onConfirm = onLeave,
                )
            },
        ) {
            Text(Textos.t(T.liga_salir), color = Danger, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }

    confirm?.let { pending ->
        ConfirmDialog(
            title = pending.title,
            message = pending.message,
            confirmLabel = pending.confirmLabel,
            onConfirm = pending.onConfirm,
            onDismiss = { confirm = null },
        )
    }
}

private val ETIQUETA_UNIDAD = mapOf(
    "dias" to (T.duracion_dias_1 to T.duracion_dias_n),
    "semanas" to (T.duracion_semanas_1 to T.duracion_semanas_n),
    "meses" to (T.duracion_meses_1 to T.duracion_meses_n),
    "anios" to (T.duracion_anios_1 to T.duracion_anios_n),
)

private fun textoDuracion(value: Int?, unit: String?, endsAt: String?): String {
    if (endsAt == null) return Textos.t(T.liga_sin_fin)
    val fecha = com.paragon.app.util.formatFechaLarga(endsAt)


    val etiqueta = unit?.let { ETIQUETA_UNIDAD[it] }
    return if (value != null && etiqueta != null) {
        val (singular, plural) = etiqueta
        Textos.t(T.liga_duracion_termina, Textos.t(if (value == 1) singular else plural, value), fecha)
    } else {
        Textos.t(T.liga_termina_el, fecha)
    }
}

@Composable
private fun PendingMemberRow(member: PendingMember, onCancel: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(radio(12)))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(text = member.name, color = Foreground, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(text = Textos.t(T.liga_esperando), color = Muted, fontSize = 11.sp)
        }
        TextButton(onClick = onCancel) {
            Text(Textos.t(T.comun_cancelar), color = Muted, fontSize = 12.sp)
        }
    }
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun LeagueStandingRow(member: LeagueStanding, position: Int, puntosParaSubir: Int? = null) {
    // El primer puesto se trata distinto a propósito (borde y fondo
    // dorados, avatar más grande) — antes las filas eran todas idénticas
    // salvo el número, y `member.image` ni se pintaba pese a venir del
    // backend.
    val esPrimero = position == 1
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (esPrimero) Platinum.copy(alpha = 0.12f) else Surface2,
                RoundedCornerShape(radio(12)),
            )
            .then(
                if (esPrimero) Modifier.border(1.dp, Platinum.copy(alpha = 0.45f), RoundedCornerShape(radio(12)))
                else Modifier,
            )
            .padding(14.dp),
    ) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(if (esPrimero) 36.dp else 30.dp)
                    .clip(CircleShape)
                    .background(Surface)
                    .then(if (esPrimero) Modifier.border(2.dp, Platinum, CircleShape) else Modifier),
                contentAlignment = Alignment.Center,
            ) {
                com.paragon.app.ui.common.AvatarPersona(member.image, member.name, size = if (esPrimero) 36.dp else 30.dp, fondo = Surface)
            }
            Spacer(Modifier.width(10.dp))
            Text(
                text = Textos.t(T.liga_posicion, position, member.name),
                color = if (esPrimero) Platinum else Foreground,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
            )
            // Sale de la foto semanal del cron — null hasta que corra una
            // vez para esta liga, o para alguien recién unido. 0 sí se
            // enseña (te has mantenido en el mismo puesto).
            val movimiento = member.movimiento
            if (movimiento != null && movimiento != 0) {
                Spacer(Modifier.width(6.dp))
                Text(
                    text = if (movimiento > 0) "▲ $movimiento" else "▼ ${-movimiento}",
                    color = if (movimiento > 0) Good else Danger,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                )
            }
        }
        Text(
            text = Textos.t(T.comun_pts, member.points),
            color = Platinum,
            fontWeight = FontWeight.Bold,
            fontSize = if (esPrimero) 16.sp else 14.sp,
        )
    }
    // Dato nuevo, calculado de la propia lista ya ordenada (sin tocar la
    // API) — antes no había ninguna pista de cuánto falta para el puesto
    // de arriba, solo el número de puntos de cada uno por separado.
    if (puntosParaSubir != null && puntosParaSubir > 0) {
        Text(
            text = Textos.t(T.liga_para_subir, puntosParaSubir),
            color = Muted,
            fontSize = 11.sp,
            modifier = Modifier.padding(top = 4.dp, start = 40.dp),
        )
    }
    }
    Spacer(Modifier.height(8.dp))
}

@Composable
private fun ChallengeStandingRow(member: ChallengeStanding, position: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(radio(12)))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = Textos.t(T.liga_posicion, position, member.name), color = Foreground, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        if (member.hasPlatinum) {
            Text(text = Textos.t(T.grado_platino), color = Platinum, fontWeight = FontWeight.Bold, fontSize = 13.sp)
        } else {
            Text(text = "${member.progressPercent}%", color = Muted, fontSize = 13.sp)
        }
    }
    Spacer(Modifier.height(8.dp))
}

/** Biblioteca del propio dueño (su token = su biblioteca) para elegir el juego de reto — mismo contrato "filtrado en cliente" que LibraryScreen. */
@Composable
private fun GamePickerDialog(tokenStore: TokenStore, onDismiss: () -> Unit, onPick: (String) -> Unit) {
    val repository = remember(tokenStore) { LibraryRepository(tokenStore) }
    var result by remember { mutableStateOf<LibraryResult?>(null) }
    var search by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        result = repository.getLibrary()
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(Textos.t(T.liga_reto_elegir), color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            when (val current = result) {
                null -> Box(modifier = Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is LibraryResult.Error -> Text(current.message, color = Muted, fontSize = 13.sp)
                is LibraryResult.Ok -> {
                    val filtrados = current.games.filter { it.title.contains(search, ignoreCase = true) }
                    // Un mismo título puede repetirse (p. ej. en PSN y en Xbox)
                    // — si se repite, se enseña la plataforma al lado.
                    val repetidos = current.games.groupingBy { it.title }.eachCount()
                    Column {
                        androidx.compose.material3.OutlinedTextField(
                            value = search,
                            onValueChange = { search = it },
                            placeholder = { Text(Textos.t(T.comun_buscar), fontSize = 13.sp) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = androidx.compose.material3.OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = Accent,
                                unfocusedBorderColor = Border,
                                focusedTextColor = Foreground,
                                unfocusedTextColor = Foreground,
                            ),
                        )
                        Spacer(Modifier.height(8.dp))
                        LazyColumn(modifier = Modifier.heightIn(max = 320.dp)) {
                            items(filtrados, key = { it.id }) { game: LibraryGame ->
                                val etiqueta = if ((repetidos[game.title] ?: 0) > 1 && game.platform.isNotBlank()) {
                                    "${game.title} (${game.platform.uppercase()})"
                                } else {
                                    game.title
                                }
                                Text(
                                    text = etiqueta,
                                    color = Foreground,
                                    fontSize = 14.sp,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable { onPick(game.id) }
                                        .padding(vertical = 10.dp),
                                )
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {},
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(Textos.t(T.comun_cancelar), color = Muted) }
        },
    )
}

