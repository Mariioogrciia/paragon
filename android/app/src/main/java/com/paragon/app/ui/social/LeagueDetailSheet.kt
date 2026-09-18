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
    Text(text = "Clasificación desde que se creó — solo entre los miembros de esta liga.", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
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
                        title = "¿Quitar de la liga?",
                        message = "${member.name} dejará de aparecer en la clasificación.",
                        confirmLabel = "Sí, quitar",
                        onConfirm = { onRemove(member.userId) },
                    )
                },
                modifier = Modifier.padding(start = 8.dp),
            ) {
                Text("Quitar de la liga", color = Danger, fontSize = 12.sp)
            }
        }
    }

    if (detail.isOwner && detail.pendingMembers.isNotEmpty()) {
        Spacer(Modifier.height(16.dp))
        Text(text = "INVITACIONES SIN RESPONDER", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        detail.pendingMembers.forEach { pending ->
            PendingMemberRow(
                pending,
                onCancel = {
                    confirm = PendingConfirm(
                        title = "¿Cancelar la invitación?",
                        message = "${pending.name} ya no podrá aceptarla.",
                        confirmLabel = "Sí, cancelar",
                        onConfirm = { onRemove(pending.userId) },
                    )
                },
            )
        }
    }

    Spacer(Modifier.height(16.dp))
    HorizontalDivider(color = Border)
    Spacer(Modifier.height(16.dp))
    Text(text = "RETO", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Spacer(Modifier.height(8.dp))

    val challenge = detail.challenge
    if (challenge != null) {
        Text(text = "A ver quién le pilla antes el platino a ${challenge.title}.", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(bottom = 10.dp))
        challenge.standings.forEachIndexed { index, member ->
            ChallengeStandingRow(member, index + 1)
        }
        if (detail.isOwner) {
            Row(modifier = Modifier.padding(top = 4.dp)) {
                TextButton(onClick = onPickChallenge) { Text("Cambiar", color = Accent, fontSize = 12.sp) }
                TextButton(onClick = onClearChallenge) { Text("Quitar reto", color = Danger, fontSize = 12.sp) }
            }
        }
    } else if (detail.isOwner) {
        Text(text = "Elige un juego de tu biblioteca para picaros a ver quién lo platina antes.", color = Muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
        TextButton(onClick = onPickChallenge) {
            Text("Elegir juego de reto", color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    } else {
        Text(text = "Sin reto todavía — el dueño de la liga puede elegir un juego para picarse.", color = Muted, fontSize = 13.sp)
    }

    if (detail.isOwner) {
        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))
        Text(text = "INVITAR A UN AMIGO", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        if (amigosDisponibles.isEmpty()) {
            Text(text = "Ya están todos tus amigos disponibles en esta liga.", color = Muted, fontSize = 13.sp)
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
                        Text(text = "Invitar", color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }

        Spacer(Modifier.height(20.dp))
        TextButton(
            onClick = {
                confirm = PendingConfirm(
                    title = "¿Borrar esta liga?",
                    message = "\"${detail.name}\" desaparece para todos sus miembros, con su clasificación y su reto. No se puede deshacer.",
                    confirmLabel = "Sí, borrar",
                    onConfirm = onDelete,
                )
            },
        ) {
            Text("Borrar esta liga", color = Danger, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    } else {
        Spacer(Modifier.height(20.dp))
        TextButton(
            onClick = {
                confirm = PendingConfirm(
                    title = "¿Salir de esta liga?",
                    message = "Dejarás de aparecer en la clasificación de \"${detail.name}\" — el dueño tendría que volver a invitarte para que entres otra vez.",
                    confirmLabel = "Sí, salir",
                    onConfirm = onLeave,
                )
            },
        ) {
            Text("Salir de esta liga", color = Danger, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
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
    "dias" to ("día" to "días"),
    "semanas" to ("semana" to "semanas"),
    "meses" to ("mes" to "meses"),
    "anios" to ("año" to "años"),
)

private fun textoDuracion(value: Int?, unit: String?, endsAt: String?): String {
    if (endsAt == null) return "Sin fecha de fin."
    val fecha = try {
        java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .parse(endsAt)
            ?.let { java.text.SimpleDateFormat("d 'de' MMMM 'de' yyyy", java.util.Locale("es", "ES")).format(it) }
    } catch (e: Exception) {
        null
    } ?: return "Con fecha de fin."

    val etiqueta = unit?.let { ETIQUETA_UNIDAD[it] }
    return if (value != null && etiqueta != null) {
        val (singular, plural) = etiqueta
        "$value ${if (value == 1) singular else plural} — termina el $fecha."
    } else {
        "Termina el $fecha."
    }
}

@Composable
private fun PendingMemberRow(member: PendingMember, onCancel: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(12.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column {
            Text(text = member.name, color = Foreground, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
            Text(text = "esperando respuesta", color = Muted, fontSize = 11.sp)
        }
        TextButton(onClick = onCancel) {
            Text("Cancelar", color = Muted, fontSize = 12.sp)
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
                RoundedCornerShape(12.dp),
            )
            .then(
                if (esPrimero) Modifier.border(1.dp, Platinum.copy(alpha = 0.45f), RoundedCornerShape(12.dp))
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
                if (member.image != null) {
                    AsyncImage(
                        model = member.image,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                    )
                } else {
                    Text(member.name.take(1).uppercase(), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(10.dp))
            Text(
                text = "${position}º  ${member.name}",
                color = if (esPrimero) Platinum else Foreground,
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp,
            )
            // Sale de la foto semanal del cron — null hasta que corra una
            // vez para esta liga, o para alguien recién unido. 0 sí se
            // enseña (te has mantenido en el mismo puesto).
            if (member.movimiento != null && member.movimiento != 0) {
                Spacer(Modifier.width(6.dp))
                Text(
                    text = if (member.movimiento > 0) "▲ ${member.movimiento}" else "▼ ${-member.movimiento}",
                    color = if (member.movimiento > 0) Good else Danger,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                )
            }
        }
        Text(
            text = "${member.points} pts",
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
            text = "$puntosParaSubir pts para superar al puesto de arriba",
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
            .background(Surface2, RoundedCornerShape(12.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = "${position}º  ${member.name}", color = Foreground, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        if (member.hasPlatinum) {
            Text(text = "Platino", color = Platinum, fontWeight = FontWeight.Bold, fontSize = 13.sp)
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
        title = { Text("Elegir juego de reto", color = Foreground, fontWeight = FontWeight.Bold) },
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
                            placeholder = { Text("Buscar…", fontSize = 13.sp) },
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
            TextButton(onClick = onDismiss) { Text("Cancelar", color = Muted) }
        },
    )
}
