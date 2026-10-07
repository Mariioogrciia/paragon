package com.paragon.app.ui.social

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import kotlin.math.roundToInt
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
import androidx.compose.ui.text.style.TextOverflow
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
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos

import com.paragon.app.ui.common.CabeceraHoja
import com.paragon.app.ui.common.premiumClickable
import androidx.compose.material3.IconButton
import androidx.compose.material3.Icon
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.MoreVert

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
    var guerraError by remember { mutableStateOf<String?>(null) }
    var editandoEscudo by remember { mutableStateOf(false) }
    var editandoInfo by remember { mutableStateOf(false) }
    var gestionando by remember { mutableStateOf<com.paragon.app.data.ClanMember?>(null) }
    var errorGestion by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(tag, refreshKey.value) {
        result = repository.getClanDetail(tag)
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = com.paragon.app.ui.theme.SurfaceSolida) {
        androidx.compose.foundation.layout.Box {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp)
                    .padding(bottom = 32.dp),
            ) {
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
                    onEditarEscudo = { editandoEscudo = true },
                    onEditarInfo = { editandoInfo = true },
                    onGestionar = { gestionando = it },
                    onRetar = { rivalId ->
                        scope.launch {
                            when (val res = repository.retarClan(tag, rivalId)) {
                                is ClanActionResult.Ok -> refreshKey.value += 1
                                is ClanActionResult.Error -> guerraError = res.message
                            }
                        }
                    },
                    onResponder = { guerraId, aceptar ->
                        scope.launch {
                            when (val res = repository.responderGuerra(guerraId, aceptar)) {
                                is ClanActionResult.Ok -> refreshKey.value += 1
                                is ClanActionResult.Error -> guerraError = res.message
                            }
                        }
                    },
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
    }

    // Rango de un miembro / expulsar (solo lo que tu rango permite, ver ClanRangos).
    gestionando?.let { miembro ->
        val detalle = (result as? ClanDetailResult.Ok)?.detail
        GestionMiembroSheet(
            miembro = miembro,
            miRango = detalle?.miRango,
            onElegir = { accion ->
                gestionando = null
                scope.launch {
                    val res = if (accion == "expulsar") repository.expulsar(tag, miembro.userId) else repository.cambiarRango(tag, miembro.userId, accion)
                    when (res) {
                        is ClanActionResult.Ok -> { refreshKey.value += 1; onChanged() }
                        is ClanActionResult.Error -> errorGestion = res.message
                    }
                }
            },
            onDismiss = { gestionando = null },
        )
    }

    errorGestion?.let { message ->
        ConfirmDialog(
            title = Textos.t(T.clan_gestion_error),
            message = message,
            confirmLabel = Textos.t(T.comun_vale),
            onConfirm = { errorGestion = null },
            onDismiss = { errorGestion = null },
        )
    }

    if (editandoInfo) {
        val detalle = (result as? ClanDetailResult.Ok)?.detail
        EditarInfoClanDialog(
            nombre = detalle?.name ?: "",
            descripcion = detalle?.description ?: "",
            onGuardar = { n, d ->
                when (val res = repository.editarClan(tag, n, d)) {
                    is ClanActionResult.Ok -> { refreshKey.value += 1; onChanged(); null }
                    is ClanActionResult.Error -> res.message
                }
            },
            onDismiss = { editandoInfo = false },
        )
    }

    if (editandoEscudo) {
        EditorEscudoSheet(
            inicial = (result as? ClanDetailResult.Ok)?.detail?.emblema,
            onGuardar = { texto ->
                when (val res = repository.setEmblema(tag, texto)) {
                    is ClanActionResult.Ok -> { refreshKey.value += 1; onChanged(); null }
                    is ClanActionResult.Error -> res.message
                }
            },
            onDismiss = { editandoEscudo = false },
        )
    }

    if (confirmLeave) {
        val detail = (result as? ClanDetailResult.Ok)?.detail
        val esOwner = detail?.amIOwner == true
        // Si eres el líder, el liderazgo pasa a otro; solo si estás solo se borra el clan.
        val sucesor = if (esOwner) detail?.leaderboard?.let { com.paragon.app.data.ClanRangos.sucesor(it) } else null
        ConfirmDialog(
            title = if (esOwner && sucesor == null) Textos.t(T.clan_abandonar_propio) else Textos.t(T.clan_salir_titulo),
            message = when {
                esOwner && sucesor != null -> Textos.t(T.clan_salir_lider_sucesor, sucesor.name)
                esOwner -> Textos.t(T.clan_abandonar_propio_texto)
                else -> Textos.t(T.clan_salir_texto, detail?.name ?: "")
            },
            confirmLabel = if (esOwner && sucesor == null) Textos.t(T.clan_borrar_si) else Textos.t(T.liga_salir_si),
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

    guerraError?.let { message ->
        ConfirmDialog(
            title = Textos.t(T.guerra_titulo),
            message = message,
            confirmLabel = Textos.t(T.comun_vale),
            onConfirm = { guerraError = null },
            onDismiss = { guerraError = null },
        )
    }

    inviteError?.let { message ->
        ConfirmDialog(
            title = Textos.t(T.clan_invitar_error),
            message = message,
            confirmLabel = Textos.t(T.comun_vale),
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
    onEditarEscudo: () -> Unit = {},
    onEditarInfo: () -> Unit = {},
    onGestionar: (com.paragon.app.data.ClanMember) -> Unit = {},
    onRetar: (String) -> Unit = {},
    onResponder: (String, Boolean) -> Unit = { _, _ -> },
    modifier: Modifier = Modifier,
) {
    Column(modifier = modifier) {
        // Escudo del clan (ver EscudoClan.kt); el líder lo cambia tocándolo.
        Row(verticalAlignment = Alignment.CenterVertically) {
            EscudoClan(
                detail.emblema,
                72.dp,
                modifier = if (detail.puedoEditar) Modifier.premiumClickable(onClick = onEditarEscudo) else Modifier,
            )
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    text = "[${detail.tag}]",
                    color = Accent,
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .background(AccentSoft, RoundedCornerShape(radio(6)))
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                )
                Text(text = detail.name, color = Foreground, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(top = 4.dp))
                if (detail.puedoEditar) {
                    Text(
                        Textos.t(T.clan_editar_info),
                        color = Accent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 4.dp).clip(RoundedCornerShape(radio(6))).premiumClickable(onClick = onEditarInfo).padding(vertical = 2.dp),
                    )
                    Text(
                        Textos.t(T.clan_escudo_editar),
                        color = Accent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(top = 4.dp).clip(RoundedCornerShape(radio(6))).premiumClickable(onClick = onEditarEscudo).padding(vertical = 2.dp),
                    )
                }
            }
        }
        if (detail.description.isNotBlank()) {
            Text(text = detail.description, color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 6.dp))
        }

        Spacer(Modifier.height(14.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(20.dp)) {
            Column {
                Text(text = Textos.t(T.clan_puntos_clan), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(text = miles(detail.score), color = Platinum, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            Column {
                Text(text = Textos.t(T.clan_trofeos_clan), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(text = miles(detail.leaderboard.sumOf { it.trofeosEnClan }), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
            Column {
                Text(text = Textos.t(T.clan_miembros), color = Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Text(text = detail.leaderboard.size.toString(), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(Modifier.height(16.dp))
        if (!detail.amIMember) {
            TextButton(onClick = onJoin) {
                Text(Textos.t(T.clan_unirme), color = Accent, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            }
        } else {
            TextButton(onClick = onRequestLeave) {
                // "(lo borra)" solo si eres el líder y estás solo: si no, el liderazgo pasa a otro.
                val borraria = detail.amIOwner && detail.leaderboard.size <= 1
                Text(if (borraria) Textos.t(T.clan_abandonar_borra) else Textos.t(T.clan_abandonar), color = Danger, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
            }
        }

        Spacer(Modifier.height(8.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))

        // Contribución: lo que ha ganado cada uno estando en el clan (el servidor ya lo ordena).
        Text(text = Textos.t(T.clan_contribucion), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Text(text = Textos.t(T.clan_contribucion_texto), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
        Spacer(Modifier.height(10.dp))
        detail.leaderboard.sortedByDescending { it.contribucion }.forEachIndexed { index, member ->
            // "⋯" solo en quien está por debajo de tu rango (ver ClanRangos).
            val gestionable = com.paragon.app.data.ClanRangos.puedeExpulsar(detail.miRango, member.role) ||
                com.paragon.app.data.ClanRangos.TODOS.any { com.paragon.app.data.ClanRangos.puedeCambiar(detail.miRango, member.role, it) }
            ClanMemberRow(
                member, index, totalClan = detail.score,
                onClick = { onMemberClick(member.handle) },
                onGestionar = if (gestionable) ({ onGestionar(member) }) else null,
            )
        }

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))

        GuerraDeClanes(detail, onRetar, onResponder)

        Spacer(Modifier.height(16.dp))
        HorizontalDivider(color = Border)
        Spacer(Modifier.height(16.dp))

        Text(text = Textos.t(T.clan_actividad), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
        Spacer(Modifier.height(8.dp))
        if (detail.activity.isEmpty()) {
            Text(text = Textos.t(T.clan_actividad_vacia), color = Muted, fontSize = 13.sp)
        } else {
            detail.activity.forEach { item -> ClanActivityRow(item) }
        }

        if (detail.puedoInvitar) {
            Spacer(Modifier.height(16.dp))
            HorizontalDivider(color = Border)
            Spacer(Modifier.height(16.dp))
            Text(text = Textos.t(T.liga_invitar_amigo), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(Modifier.height(8.dp))
            if (detail.invitables.isEmpty()) {
                Text(
                    text = Textos.t(T.clan_sin_amigos),
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
private fun ClanMemberRow(member: ClanMember, index: Int, totalClan: Int, onClick: () -> Unit, onGestionar: (() -> Unit)? = null) {
    val esPrimero = index == 0 && member.contribucion > 0
    val parte = if (totalClan > 0) member.contribucion.toFloat() / totalClan else 0f
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radio(12)))
            .background(if (esPrimero) Platinum.copy(alpha = 0.12f) else Surface2)
            .then(if (esPrimero) Modifier.border(1.dp, Platinum.copy(alpha = 0.45f), RoundedCornerShape(radio(12))) else Modifier)
            .clickable(enabled = member.handle != null, onClick = onClick)
            .padding(12.dp),
    ) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
            Text(
                text = MEDALLA[index] ?: Textos.t(T.clan_posicion, index + 1),
                color = Muted,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.width(28.dp),
            )
            Box(
                modifier = Modifier.size(32.dp).clip(CircleShape).background(Surface),
                contentAlignment = Alignment.Center,
            ) {
                com.paragon.app.ui.common.AvatarPersona(member.image, member.name, size = 32.dp, fondo = Surface)
            }
            Spacer(Modifier.width(10.dp))
            Column {
                Text(text = member.name, color = if (esPrimero) Platinum else Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(text = Textos.t(T.clan_contribucion_fila, nombreRango(member.role), member.trofeosEnClan), color = Muted, fontSize = 11.sp)
            }
        }
        Column(horizontalAlignment = Alignment.End) {
            Text(text = miles(member.contribucion), color = Platinum, fontSize = 15.sp, fontWeight = FontWeight.Bold)
            Text(text = Textos.t(T.clan_parte, (parte * 100).roundToInt()), color = Muted, fontSize = 10.sp)
        }
        if (onGestionar != null) {
            IconButton(onClick = onGestionar, modifier = Modifier.size(36.dp)) {
                Icon(Icons.Default.MoreVert, contentDescription = Textos.t(T.clan_gestionar, member.name), tint = Muted)
            }
        }
    }
    // Su parte de los puntos del clan.
    Box(
        modifier = Modifier
            .padding(top = 10.dp)
            .fillMaxWidth()
            .height(4.dp)
            .clip(RoundedCornerShape(radio(4)))
            .background(Surface),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth(if (member.contribucion > 0) parte.coerceAtLeast(0.02f) else 0f)
                .fillMaxHeight()
                .background(Platinum),
        )
    }
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
        Text(text = friend.name, color = Foreground, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(text = Textos.t(T.comun_invitar), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}

/** Duración de una guerra (DURACION_DIAS en lib/clanWars.ts). */
private const val DIAS_GUERRA = 14

/**
 * Guerra de clanes, como en la web (clanes/[tag]/GuerraDeClanes.tsx): la
 * abierta con marcador en vivo, el reto pendiente (aceptar/rechazar si eres
 * el líder retado), retar a otro clan si eres el líder y no hay ninguna, y
 * las últimas terminadas.
 */
@Composable
private fun GuerraDeClanes(detail: ClanDetail, onRetar: (String) -> Unit, onResponder: (String, Boolean) -> Unit) {
    val abierta = detail.guerra.abierta
    Text(text = Textos.t(T.guerra_titulo).uppercase(), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    Spacer(Modifier.height(8.dp))
    when {
        abierta != null && abierta.estado == "activa" -> {
            Column(
                Modifier.fillMaxWidth()
                    .background(AccentSoft, RoundedCornerShape(radio(12)))
                    .padding(14.dp),
            ) {
                Text(Textos.t(T.guerra_contra, abierta.rival.tag, abierta.rival.name), color = Foreground, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Spacer(Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("[${detail.tag}] ${abierta.misPuntos ?: 0}", color = Accent, fontWeight = FontWeight.Black, fontSize = 22.sp)
                    Text("  –  ", color = Muted, fontSize = 18.sp)
                    Text("${abierta.susPuntos ?: 0} [${abierta.rival.tag}]", color = Foreground, fontWeight = FontWeight.Black, fontSize = 22.sp)
                }
                val dias = abierta.diasRestantes
                if (dias != null) {
                    Spacer(Modifier.height(6.dp))
                    Text(if (dias <= 0) Textos.t(T.guerra_ultimo_dia) else Textos.t(T.guerra_dias, dias), color = Muted, fontSize = 12.sp)
                }
            }
        }
        abierta != null && abierta.estado == "pendiente" && abierta.soyRetador -> {
            Text(Textos.t(T.guerra_esperando, abierta.rival.tag), color = Muted, fontSize = 13.sp)
        }
        abierta != null && abierta.estado == "pendiente" -> {
            Text(Textos.t(T.guerra_os_retan, abierta.rival.tag, abierta.rival.name, DIAS_GUERRA), color = Foreground, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
            if (detail.amIOwner) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 8.dp)) {
                    TextButton(onClick = { onResponder(abierta.id, true) }) {
                        Text(Textos.t(T.guerra_aceptar), color = Accent, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = { onResponder(abierta.id, false) }) {
                        Text(Textos.t(T.guerra_rechazar), color = Danger, fontWeight = FontWeight.SemiBold)
                    }
                }
            } else {
                Text(Textos.t(T.guerra_responde_lider), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
            }
        }
        else -> {
            Text(Textos.t(T.guerra_ninguna), color = Muted, fontSize = 13.sp)
            if (detail.amIOwner) {
                Text(Textos.t(T.guerra_reglas, DIAS_GUERRA), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 4.dp))
                Spacer(Modifier.height(8.dp))
                if (detail.retables.isEmpty()) {
                    Text(Textos.t(T.guerra_sin_rivales), color = Muted, fontSize = 12.sp)
                } else {
                    var elegido by remember { mutableStateOf<com.paragon.shared.red.ClanRivalDto?>(null) }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        com.paragon.app.ui.common.Selector(
                            valor = elegido?.id,
                            opciones = detail.retables.map { com.paragon.app.ui.common.OpcionSelector(it.id, it.name, detalle = "[${it.tag}]") },
                            onElegir = { id -> elegido = detail.retables.firstOrNull { it.id == id } },
                            placeholder = Textos.t(T.guerra_elige_rival),
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        TextButton(onClick = { elegido?.let { onRetar(it.id) } }, enabled = elegido != null) {
                            Text(Textos.t(T.guerra_retar), color = if (elegido != null) Accent else Muted, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
    if (detail.guerra.historial.isNotEmpty()) {
        Spacer(Modifier.height(12.dp))
        Text(Textos.t(T.guerra_historial), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        detail.guerra.historial.forEach { g ->
            val (resultado, color) = when (g.gane) {
                true -> Textos.t(T.guerra_ganada) to Accent
                false -> Textos.t(T.guerra_perdida) to Danger
                null -> Textos.t(T.guerra_empate) to Muted
            }
            Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text("[${g.rival.tag}] ${g.rival.name}", color = Foreground, fontSize = 13.sp, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("${g.misPuntos ?: 0} – ${g.susPuntos ?: 0}", color = Muted, fontSize = 12.sp)
                Spacer(Modifier.width(10.dp))
                Text(resultado, color = color, fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/** 18450 → "18.450". */
private fun miles(n: Int): String = n.toString().reversed().chunked(3).joinToString(".").reversed()

/** "Líder", "Colíder", "Veterano" o "Miembro". */
private fun nombreRango(role: String?): String = when (com.paragon.app.data.ClanRangos.normalizar(role)) {
    "owner" -> Textos.t(T.clan_lider)
    "colider" -> Textos.t(T.clan_rango_colider)
    "veterano" -> Textos.t(T.clan_rango_veterano)
    else -> Textos.t(T.clan_miembro)
}

/** Opciones sobre un miembro: los rangos a los que tu rango puede moverlo y expulsar. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GestionMiembroSheet(
    miembro: com.paragon.app.data.ClanMember,
    miRango: String?,
    onElegir: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val r = com.paragon.app.data.ClanRangos
    var confirmar by remember { mutableStateOf<String?>(null) }
    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = com.paragon.app.ui.theme.SurfaceSolida) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
            Text(miembro.name, color = Foreground, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
            Text(nombreRango(miembro.role), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(bottom = 8.dp))
            r.TODOS.filter { r.puedeCambiar(miRango, miembro.role, it) }.forEach { nuevo ->
                val texto = when {
                    nuevo == "owner" -> Textos.t(T.clan_hacer_lider)
                    r.nivel(nuevo) > r.nivel(miembro.role) -> Textos.t(T.clan_ascender_a, nombreRango(nuevo))
                    else -> Textos.t(T.clan_degradar_a, nombreRango(nuevo))
                }
                Text(
                    texto,
                    color = Foreground,
                    fontSize = 15.sp,
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(10)))
                        .premiumClickable { if (nuevo == "owner") confirmar = nuevo else onElegir(nuevo) }
                        .padding(vertical = 14.dp, horizontal = 4.dp),
                )
            }
            if (r.puedeExpulsar(miRango, miembro.role)) {
                Text(
                    Textos.t(T.clan_expulsar),
                    color = Danger,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(10)))
                        .premiumClickable { confirmar = "expulsar" }
                        .padding(vertical = 14.dp, horizontal = 4.dp),
                )
            }
        }
    }
    confirmar?.let { accion ->
        ConfirmDialog(
            title = miembro.name,
            message = if (accion == "owner") Textos.t(T.clan_confirmar_lider, miembro.name) else Textos.t(T.clan_confirmar_expulsar, miembro.name),
            confirmLabel = if (accion == "owner") Textos.t(T.clan_hacer_lider) else Textos.t(T.clan_expulsar),
            onConfirm = { confirmar = null; onElegir(accion) },
            onDismiss = { confirmar = null },
        )
    }
}

/** Nombre y descripción del clan (líder y colíderes). */
@Composable
private fun EditarInfoClanDialog(nombre: String, descripcion: String, onGuardar: suspend (String, String) -> String?, onDismiss: () -> Unit) {
    var n by remember { mutableStateOf(nombre) }
    var d by remember { mutableStateOf(descripcion) }
    var error by remember { mutableStateOf<String?>(null) }
    var guardando by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = com.paragon.app.ui.theme.SurfaceSolida,
        title = { Text(Textos.t(T.clan_editar_info), color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                OutlinedTextField(value = n, onValueChange = { if (it.length <= 40) n = it }, label = { Text(Textos.t(T.clan_campo_nombre)) }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(value = d, onValueChange = { if (it.length <= 200) d = it }, label = { Text(Textos.t(T.clan_campo_descripcion)) }, minLines = 3, modifier = Modifier.fillMaxWidth())
                error?.let { Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
            }
        },
        confirmButton = {
            TextButton(enabled = !guardando, onClick = {
                guardando = true
                scope.launch {
                    error = onGuardar(n, d)
                    guardando = false
                    if (error == null) onDismiss()
                }
            }) { Text(Textos.t(T.clan_guardar), color = Accent, fontWeight = FontWeight.Bold) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(Textos.t(T.comun_cancelar), color = Muted) } },
    )
}
