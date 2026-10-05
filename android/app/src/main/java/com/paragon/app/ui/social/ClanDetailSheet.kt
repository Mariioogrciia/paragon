package com.paragon.app.ui.social

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.paragon.app.data.ClanActionResult
import com.paragon.app.data.ClanActivityItem
import com.paragon.app.data.ClanDetail
import com.paragon.app.data.ClanDetailResult
import com.paragon.app.data.ClanMember
import com.paragon.app.data.ClansRepository
import com.paragon.app.data.InvitableFriend
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.mensajeClanActividad
import com.paragon.app.ui.common.ConfirmDialog
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.app.R
import androidx.compose.ui.res.stringResource
import com.paragon.app.ui.common.CabeceraHoja

private val MEDALLA = mapOf(0 to "🥇", 1 to "🥈", 2 to "🥉")

/**
 * Ficha de un clan: ranking interno (Paragon Score de cada miembro),
 * actividad reciente (sin reacciones ni comentarios, es un escaparate de
 * que el clan está vivo, no una segunda red social — ver
 * `mensajeClanActividad`) y gestión si eres el owner (invitar amigos). Si
 * el owner abandona, el clan entero desaparece — de ahí el diálogo de
 * confirmación distinto para ese caso.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClanDetailSheet(
    tag: String,
    tokenStore: TokenStore,
    onDismiss: () -> Unit,
    onChanged: () -> Unit,
    onOpenProfile: (String) -> Unit = {},
) {
    val repository = remember(tokenStore) { ClansRepository(tokenStore) }
    var result by remember { mutableStateOf<ClanDetailResult?>(null) }
    val refreshKey = remember { mutableIntStateOf(0) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val scope = rememberCoroutineScope()
    var confirmLeave by remember { mutableStateOf(false) }
    var inviteError by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(tag, refreshKey.value) {
        result = repository.getClanDetail(tag)
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = Surface) {
        Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp)) {
            CabeceraHoja(onBack = onDismiss)
            when (val current = result) {
                null -> Box(modifier = Modifier.fillMaxWidth().height(200.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is ClanDetailResult.Error -> Text(text = current.message, color = Muted, fontSize = 14.sp)
                is ClanDetailResult.Ok -> ClanDetailContent(
                    detail = current.detail,
                    onMemberClick = { handle -> handle?.let(onOpenProfile) },
                    onJoin = {
                        scope.launch {
                            if (repository.joinClan(tag) is ClanActionResult.Ok) {
                                refreshKey.value += 1
                                onChanged()
                            }
                        }
                    },
                    onRequestLeave = { confirmLeave = true },
                    onInvite = { userId ->
                        scope.launch {
                            val res = repository.inviteToClan(tag, userId)
                            if (res is ClanActionResult.Ok) {
                                refreshKey.value += 1
                                onChanged()
                            } else if (res is ClanActionResult.Error) {
                                inviteError = res.message
                            }
                        }
                    },
                )
            }
        }
    }

    if (confirmLeave) {
        val detail = (result as? ClanDetailResult.Ok)?.detail
        val esOwner = detail?.amIOwner == true
        ConfirmDialog(
            title = if (esOwner) stringResource(R.string.clan_abandonar_propio) else stringResource(R.string.clan_salir_titulo),
            message = if (esOwner) {
                stringResource(R.string.clan_abandonar_propio_texto)
            } else {
                stringResource(R.string.clan_salir_texto, detail?.name ?: "")
            },
            confirmLabel = if (esOwner) stringResource(R.string.clan_borrar_si) else stringResource(R.string.liga_salir_si),
            onConfirm = {
                confirmLeave = false
                scope.launch {
                    if (repository.leaveClan(tag)) {
                        onChanged()
                        onDismiss()
                    }
                }
            },
            onDismiss = { confirmLeave = false },
        )
    }

    inviteError?.let { message ->
        ConfirmDialog(
            title = stringResource(R.string.clan_invitar_error),
            message = message,
            confirmLabel = stringResource(R.string.comun_vale),
            onConfirm = { inviteError = null },
            onDismiss = { inviteError = null },
        )
    }
}

@Composable
private fun ClanDetailContent(
    detail: ClanDetail,
    onMemberClick: (String?) -> Unit,
    onJoin: () -> Unit,
    onRequestLeave: () -> Unit,
    onInvite: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = "[${detail.tag}]",
                color = Accent,
                fontSize = 16.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .background(AccentSoft, RoundedCornerShape(radio(6)))
                    .padding(horizontal = 8.dp, vertical = 3.dp),
            )
            Spacer(Modifier.width(10.dp))
            Text(text = detail.name, color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
        }
        if (detail.description.isNotBlank()) {
            Text(text = detail.description, color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
        }

        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Column {
                Text(text = stringResource(R.string.clan_xp_total), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(text = "${detail.score}".reversed().chunked(3).joinToString(".").reversed(), color = Platinum, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            Column {
                Text(text = stringResource(R.string.clan_miembros), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(text = detail.leaderboard.size.toString(), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(16.dp))
        if (!detail.amIMember) {
            TextButton(onClick = onJoin) {
                Text(stringResource(R.string.clan_unirme), color = Accent, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        } else {
            TextButton(onClick = onRequestLeave) {
                Text(if (detail.amIOwner) stringResource(R.string.clan_abandonar_borra) else stringResource(R.string.clan_abandonar), color = Danger, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
        }

        Spacer(Modifier.height(8.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))

        Text(text = stringResource(R.string.clan_ranking), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        detail.leaderboard.forEachIndexed { index, member ->
            ClanMemberRow(member, index, onClick = { onMemberClick(member.handle) })
        }

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))

        Text(text = stringResource(R.string.clan_actividad), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        if (detail.activity.isEmpty()) {
            Text(text = stringResource(R.string.clan_actividad_vacia), color = Muted, fontSize = 13.sp)
        } else {
            detail.activity.forEach { item -> ClanActivityRow(item) }
        }

        if (detail.amIOwner) {
            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = Border)
            Spacer(Modifier.height(16.dp))
            Text(text = stringResource(R.string.liga_invitar_amigo), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(Modifier.height(8.dp))
            if (detail.invitables.isEmpty()) {
                Text(
                    text = stringResource(R.string.clan_sin_amigos),
                    color = Muted,
                    fontSize = 13.sp,
                )
            } else {
                LazyColumn(modifier = Modifier.heightIn(max = 220.dp)) {
                    items(detail.invitables, key = { it.userId }) { friend ->
                        InvitableFriendRow(friend, onInvite = { onInvite(friend.userId) })
                    }
                }
            }
        }
    }
}

@Composable
private fun ClanMemberRow(member: ClanMember, index: Int, onClick: () -> Unit) {
    val esPrimero = index == 0
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(12)))
            .background(if (esPrimero) Platinum.copy(alpha = 0.12f) else Surface2)
            .then(if (esPrimero) Modifier.border(1.dp, Platinum.copy(alpha = 0.45f), RoundedCornerShape(radio(12))) else Modifier)
            .clickable(enabled = member.handle != null, onClick = onClick)
            .padding(12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
            Text(
                text = MEDALLA[index] ?: stringResource(R.string.clan_posicion, index + 1),
                color = Muted,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(28.dp),
            )
            Box(
                modifier = Modifier.size(32.dp).clip(CircleShape).background(Surface),
                contentAlignment = Alignment.Center,
            ) {
                if (member.image != null) {
                    AsyncImage(model = member.image, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize().clip(CircleShape))
                } else {
                    Text(member.name.take(1).uppercase(), color = Muted, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
            Spacer(Modifier.width(10.dp))
            Column {
                Text(text = member.name, color = if (esPrimero) Platinum else Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                Text(text = stringResource(R.string.clan_rol_trofeos, if (member.role == "owner") stringResource(R.string.clan_lider) else stringResource(R.string.clan_miembro), member.trofeos), color = Muted, fontSize = 11.sp)
            }
        }
        Text(text = "${member.score}", color = Platinum, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
    Spacer(Modifier.height(6.dp))
}

@Composable
private fun ClanActivityRow(item: ClanActivityItem) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface2, RoundedCornerShape(radio(10)))
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Text(
            text = "${item.userName} ${mensajeClanActividad(item)}",
            color = Foreground,
            fontSize = 12.sp,
        )
    }
    Spacer(Modifier.height(6.dp))
}

@Composable
private fun InvitableFriendRow(friend: InvitableFriend, onInvite: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onInvite)
            .padding(vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(text = friend.name, color = Foreground, fontSize = 14.sp)
        Text(text = stringResource(R.string.comun_invitar), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}
