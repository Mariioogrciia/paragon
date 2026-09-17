package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.paragon.app.data.LibraryGame
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.LibraryResult
import com.paragon.app.data.auth.TokenStore
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
    Text(text = detail.name, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
    Text(text = "Clasificación de este mes — solo entre los miembros de esta liga.", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp, bottom = 16.dp))

    detail.standings.forEachIndexed { index, member ->
        LeagueStandingRow(member, index + 1)
        if (detail.isOwner && member.userId != detail.ownerId) {
            TextButton(onClick = { onRemove(member.userId) }, modifier = Modifier.padding(start = 8.dp)) {
                Text("Quitar de la liga", color = Danger, fontSize = 12.sp)
            }
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
        TextButton(onClick = onDelete) {
            Text("Borrar esta liga", color = Danger, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    } else {
        Spacer(Modifier.height(20.dp))
        TextButton(onClick = onLeave) {
            Text("Salir de esta liga", color = Danger, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun LeagueStandingRow(member: LeagueStanding, position: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(12.dp))
            .padding(14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = "${position}º  ${member.name}", color = Foreground, fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
        Text(text = "${member.points} pts", color = Platinum, fontWeight = FontWeight.Bold, fontSize = 14.sp)
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
                                Text(
                                    text = game.title,
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
