package com.paragon.app.ui.social

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt
import com.paragon.app.data.AmigoRow
import com.paragon.app.data.ClanActionResult
import com.paragon.app.data.ClanInvite
import com.paragon.app.data.ClanSummary
import com.paragon.app.data.ClansRepository
import com.paragon.app.data.ClansResult
import com.paragon.app.data.League
import com.paragon.app.data.LeagueInvite
import com.paragon.app.data.LeaguesRepository
import com.paragon.app.data.LeaguesResult
import com.paragon.app.data.LigaRow
import com.paragon.app.data.SocialRepository
import com.paragon.app.data.SocialResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch

import com.paragon.app.data.theme.ThemeStore
import com.paragon.app.R
import androidx.compose.ui.res.stringResource
import com.paragon.app.util.Textos

/** Amigos y Liga reales contra GET /api/mobile/social (SocialRepository) — dos listas distintas, no la misma con otro orden. */
@Composable
fun SocialScreen(tokenStore: TokenStore, themeStore: ThemeStore, myHandle: String? = null, onCompareClick: (String) -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val cacheDao = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context).simpleCacheDao() }
    val repository = remember(tokenStore, cacheDao) { SocialRepository(tokenStore, cacheDao) }
    val leaguesRepository = remember(tokenStore, cacheDao) { LeaguesRepository(tokenStore, cacheDao) }
    val clansRepository = remember(tokenStore) { ClansRepository(tokenStore) }
    var result by remember { mutableStateOf<SocialResult?>(null) }
    var leaguesResult by remember { mutableStateOf<LeaguesResult?>(null) }
    var invites by remember { mutableStateOf<List<LeagueInvite>>(emptyList()) }
    var clansResult by remember { mutableStateOf<ClansResult?>(null) }
    var clanInvites by remember { mutableStateOf<List<ClanInvite>>(emptyList()) }
    var selectedTab by remember { mutableIntStateOf(0) }
    val retryCounter = remember { mutableIntStateOf(0) }
    val leaguesRefresh = remember { mutableIntStateOf(0) }
    val clansRefresh = remember { mutableIntStateOf(0) }
    var selectedHandle by remember { mutableStateOf<String?>(null) }
    var selectedLeagueId by remember { mutableStateOf<String?>(null) }
    var selectedClanTag by remember { mutableStateOf<String?>(null) }
    var showNewLeagueDialog by remember { mutableStateOf(false) }
    var showNewClanDialog by remember { mutableStateOf(false) }
    var clanCreateError by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()
    val tabs = listOf(
        stringResource(R.string.social_tab_ligas),
        stringResource(R.string.social_tab_mis_ligas),
        stringResource(R.string.social_tab_amigos),
        stringResource(R.string.social_tab_clan),
    )

    LaunchedEffect(retryCounter.value) {
        result = null
        result = repository.getSocial()
    }

    LaunchedEffect(leaguesRefresh.value) {
        leaguesResult = leaguesRepository.getLeagues()
        invites = leaguesRepository.getInvites()
    }

    LaunchedEffect(clansRefresh.value) {
        clansResult = clansRepository.getClans()
        clanInvites = clansRepository.getInvites()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
    ) {
        TabRow(
            selectedTabIndex = selectedTab,
            containerColor = Background,
            contentColor = Accent,
            divider = { HorizontalDivider(color = Border) },
            modifier = Modifier.padding(top = 16.dp, bottom = 8.dp)
        ) {
            tabs.forEachIndexed { index, title ->
                Tab(
                    selected = selectedTab == index,
                    onClick = { selectedTab = index },
                    text = { Text(text = title, fontWeight = FontWeight.Bold) },
                    selectedContentColor = Accent,
                    unselectedContentColor = Muted
                )
            }
        }

        if (selectedTab == 3) {
            when (val current = clansResult) {
                null -> com.paragon.app.ui.common.EsqueletoLista(filas = 6)
                is ClansResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Foreground, fontSize = 14.sp)
                        Button(
                            onClick = { clansRefresh.value += 1 },
                            modifier = Modifier.padding(top = 16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text(stringResource(R.string.comun_reintentar))
                        }
                    }
                }
                is ClansResult.Ok -> LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp),
                ) {
                    if (clanInvites.isNotEmpty()) {
                        items(clanInvites, key = { it.clanId }) { invite ->
                            ClanInviteRow(
                                invite = invite,
                                onAccept = {
                                    coroutineScope.launch {
                                        if (clansRepository.acceptInvite(invite.clanId)) clansRefresh.value += 1
                                    }
                                },
                                onDecline = {
                                    coroutineScope.launch {
                                        if (clansRepository.declineInvite(invite.clanId)) clansRefresh.value += 1
                                    }
                                },
                            )
                        }
                    }
                    item {
                        val miClan = current.myClan
                        if (miClan != null) {
                            ClanCard(
                                title = stringResource(R.string.social_tu_clan),
                                subtitle = "[${miClan.tag}] ${miClan.name}",
                                onClick = { selectedClanTag = miClan.tag },
                            )
                        } else {
                            CreateClanHero(onClick = { showNewClanDialog = true })
                        }
                    }
                    if (current.clans.isEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.social_sin_clanes),
                                color = Muted,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    } else {
                        items(current.clans, key = { it.id }) { clan ->
                            ClanRowItem(clan, onClick = { selectedClanTag = clan.tag })
                        }
                    }
                }
            }
        } else if (selectedTab == 1) {
            when (val current = leaguesResult) {
                null -> com.paragon.app.ui.common.EsqueletoLista(filas = 6)
                is LeaguesResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Foreground, fontSize = 14.sp)
                        Button(
                            onClick = { leaguesRefresh.value += 1 },
                            modifier = Modifier.padding(top = 16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text(stringResource(R.string.comun_reintentar))
                        }
                    }
                }
                is LeaguesResult.Ok -> LazyColumn(
                    modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp),
                ) {
                    if (current.fromCache) {
                        item { OfflineBanner() }
                    }
                    if (invites.isNotEmpty()) {
                        items(invites, key = { it.id }) { invite ->
                            LeagueInviteRow(
                                invite = invite,
                                onAccept = {
                                    coroutineScope.launch {
                                        if (leaguesRepository.acceptInvite(invite.id)) leaguesRefresh.value += 1
                                    }
                                },
                                onDecline = {
                                    coroutineScope.launch {
                                        if (leaguesRepository.declineInvite(invite.id)) leaguesRefresh.value += 1
                                    }
                                },
                            )
                        }
                    }
                    item {
                        CreateLeagueHero(onClick = { showNewLeagueDialog = true })
                    }
                    if (current.leagues.isEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.social_mis_ligas_sub),
                                color = Muted,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                    } else {
                        items(current.leagues, key = { it.id }) { league ->
                            LeagueRowItem(league, onClick = { selectedLeagueId = league.id })
                        }
                    }
                }
            }
        } else {
            when (val current = result) {
                null -> com.paragon.app.ui.common.EsqueletoLista(filas = 6)
                is SocialResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Foreground, fontSize = 14.sp)
                        Button(
                            onClick = { retryCounter.value += 1 },
                            modifier = Modifier.padding(top = 16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text(stringResource(R.string.comun_reintentar))
                        }
                    }
                }
                is SocialResult.Ok -> {
                    // Antes, sin amigos (o sin nadie en el ranking) esta lista
                    // simplemente no pintaba nada — una pantalla en blanco,
                    // sin ninguna pista de qué hacer.
                    val vacioAmigos = selectedTab != 0 && current.data.amigos.isEmpty()
                    val vacioLiga = selectedTab == 0 && current.data.liga.isEmpty()
                    if (vacioAmigos) {
                        com.paragon.app.ui.common.EmptyState(
                            icon = Icons.Default.Add,
                            title = stringResource(R.string.social_sin_amigos),
                            description = stringResource(R.string.social_sin_amigos_sub),
                        )
                    } else if (vacioLiga) {
                        com.paragon.app.ui.common.EmptyState(
                            icon = Icons.Default.Add,
                            title = stringResource(R.string.social_sin_ranking),
                            description = stringResource(R.string.social_sin_ranking_sub),
                        )
                    } else {
                        LazyColumn(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 24.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            contentPadding = PaddingValues(top = 16.dp, bottom = 32.dp)
                        ) {
                            if (current.fromCache) {
                                item { OfflineBanner() }
                            }
                            if (selectedTab == 0) {
                                val liga = current.data.liga
                                val podio = liga.take(3)
                                val resto = liga.drop(3)
                                item {
                                    LeagueSeasonCard(
                                        totalParticipantes = liga.size,
                                        miPosicion = liga.indexOfFirst { it.handle != null && it.handle == myHandle }.let { if (it >= 0) it + 1 else null },
                                        misPuntos = liga.firstOrNull { it.handle != null && it.handle == myHandle }?.points,
                                    )
                                }
                                if (podio.isNotEmpty()) {
                                    item {
                                        LeaguePodium(podio, onClick = { handle -> selectedHandle = handle })
                                    }
                                }
                                itemsIndexed(resto, key = { _, row -> row.userId }) { index, row ->
                                    SwipeToCompareRow(handle = row.handle, onCompareClick = onCompareClick) {
                                        LigaRowItem(row, index + 4, onClick = { selectedHandle = row.handle })
                                    }
                                }
                            } else {
                                itemsIndexed(current.data.amigos, key = { _, row -> row.userId }) { index, row ->
                                    SwipeToCompareRow(handle = row.handle, onCompareClick = onCompareClick) {
                                        AmigoRowItem(row, index + 1, onClick = { selectedHandle = row.handle })
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        selectedHandle?.let { handle ->
            FriendProfileBottomSheet(
                handle = handle,
                tokenStore = tokenStore,
                themeStore = themeStore,
                onDismiss = { selectedHandle = null },
                onCompareClick = onCompareClick
            )
        }

        selectedLeagueId?.let { leagueId ->
            LeagueDetailSheet(
                leagueId = leagueId,
                tokenStore = tokenStore,
                amigos = (result as? SocialResult.Ok)?.data?.amigos ?: emptyList(),
                onDismiss = { selectedLeagueId = null },
                onChanged = { leaguesRefresh.value += 1 },
            )
        }

        if (showNewLeagueDialog) {
            NewLeagueDialog(
                onDismiss = { showNewLeagueDialog = false },
                onCreate = { name, durationValue, durationUnit ->
                    coroutineScope.launch {
                        val created = leaguesRepository.createLeague(name, durationValue, durationUnit)
                        showNewLeagueDialog = false
                        if (created != null) {
                            leaguesRefresh.value += 1
                            selectedLeagueId = created.id
                        }
                    }
                },
            )
        }

        selectedClanTag?.let { tag ->
            ClanDetailSheet(
                tag = tag,
                tokenStore = tokenStore,
                onDismiss = { selectedClanTag = null },
                onChanged = { clansRefresh.value += 1 },
                onOpenProfile = { handle -> selectedHandle = handle },
            )
        }

        if (showNewClanDialog) {
            NewClanDialog(
                error = clanCreateError,
                onDismiss = { showNewClanDialog = false; clanCreateError = null },
                onCreate = { name, tag, description ->
                    coroutineScope.launch {
                        when (val res = clansRepository.createClan(name, tag, description)) {
                            is ClanActionResult.Ok -> {
                                showNewClanDialog = false
                                clanCreateError = null
                                clansRefresh.value += 1
                                selectedClanTag = tag.uppercase()
                            }
                            is ClanActionResult.Error -> clanCreateError = res.message
                        }
                    }
                },
            )
        }
    }
}

/** Mismo aviso que Biblioteca/Panel/Ficha de juego/Comunidad cuando se sirve la caché de respaldo. */
@Composable
private fun OfflineBanner() {
    Text(
        text = stringResource(R.string.comun_sin_conexion_copia),
        color = Muted,
        fontSize = 11.sp,
    )
}

@Composable
private fun LeagueInviteRow(invite: LeagueInvite, onAccept: () -> Unit, onDecline: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .padding(16.dp),
    ) {
        Text(invite.name, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        Text(stringResource(R.string.social_te_ha_invitado, invite.ownerName), color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = stringResource(R.string.comun_aceptar),
                color = Accent,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onAccept),
            )
            Text(
                text = stringResource(R.string.comun_rechazar),
                color = Muted,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onDecline),
            )
        }
    }
}

private val UNIDADES_DURACION get() = listOf("dias" to Textos.t(R.string.duracion_dias), "semanas" to Textos.t(R.string.duracion_semanas), "meses" to Textos.t(R.string.duracion_meses), "anios" to Textos.t(R.string.duracion_anios))

@Composable
private fun NewLeagueDialog(onDismiss: () -> Unit, onCreate: (String, Int?, String?) -> Unit) {
    var name by remember { mutableStateOf("") }
    var durationValue by remember { mutableStateOf("") }
    var durationUnit by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(stringResource(R.string.social_nueva_liga), color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { if (it.length <= 60) name = it },
                    placeholder = { Text(stringResource(R.string.social_liga_ph)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = Border,
                        focusedTextColor = Foreground,
                        unfocusedTextColor = Foreground,
                    ),
                )
                Spacer(Modifier.height(12.dp))
                Text(stringResource(R.string.social_duracion), color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                Spacer(Modifier.height(6.dp))
                OutlinedTextField(
                    value = durationValue,
                    onValueChange = { if (it.all { c -> c.isDigit() } && it.length <= 3) durationValue = it },
                    placeholder = { Text("3") },
                    singleLine = true,
                    modifier = Modifier.width(80.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = Border,
                        focusedTextColor = Foreground,
                        unfocusedTextColor = Foreground,
                    ),
                )
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    UNIDADES_DURACION.forEach { (value, label) ->
                        val selected = durationUnit == value
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (selected) Accent else Surface2)
                                .clickable { durationUnit = if (selected) null else value }
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                        ) {
                            Text(label, color = if (selected) androidx.compose.ui.graphics.Color.White else Muted, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onCreate(name, durationValue.toIntOrNull(), durationUnit) },
                enabled = name.isNotBlank(),
            ) {
                Text(stringResource(R.string.comun_crear), color = Accent, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.comun_cancelar), color = Muted) }
        },
    )
}

// Paleta de identidad para ligas privadas — antes "Goofy" era texto suelto
// dentro de una tarjeta idéntica a todas las demás, sin nada propio. El
// color sale del propio id (hash estable), no es aleatorio en cada recomposición.
private val LEAGUE_COLORS = listOf(
    androidx.compose.ui.graphics.Color(0xFF9B59F6), // púrpura
    androidx.compose.ui.graphics.Color(0xFF3EC9C0), // turquesa
    androidx.compose.ui.graphics.Color(0xFFF6A93E), // ámbar
    androidx.compose.ui.graphics.Color(0xFFF6568D), // rosa
    androidx.compose.ui.graphics.Color(0xFF5B8DF6), // azul
)
private fun leagueColor(id: String) = LEAGUE_COLORS[(id.hashCode().and(0x7FFFFFFF)) % LEAGUE_COLORS.size]

/** Cuántos días quedan hasta `endsAt` (mismo formato ISO que manda el backend) — null si no hay fecha o ya pasó. */
private fun diasHasta(endsAt: String?): Int? {
    if (endsAt == null) return null
    return try {
        val fecha = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .parse(endsAt) ?: return null
        val dias = ((fecha.time - System.currentTimeMillis()) / (1000 * 60 * 60 * 24)).toInt()
        if (dias >= 0) dias else null
    } catch (e: Exception) {
        null
    }
}

/** Antes era una fila de texto clicable — la acción principal de la pestaña necesita más presencia que una fila más. */
@Composable
private fun CreateLeagueHero(onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                androidx.compose.ui.graphics.Brush.linearGradient(listOf(AccentSoft, Surface)),
                RoundedCornerShape(16.dp),
            )
            .border(1.dp, Accent.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(18.dp),
    ) {
        Text(stringResource(R.string.social_crea_liga), color = Accent, fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.sp)
        Text(
            stringResource(R.string.social_crea_liga_sub),
            color = Muted,
            fontSize = 12.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Add, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(16.dp))
            Text(stringResource(R.string.social_crear_liga), color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
        }
    }
}

@Composable
fun LeagueRowItem(league: League, onClick: () -> Unit) {
    val color = leagueColor(league.id)
    val dias = diasHasta(league.endsAt)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(color.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(league.name.take(1).uppercase(), color = color, fontWeight = FontWeight.Black, fontSize = 15.sp)
        }
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(text = league.name, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text(
                text = (if (league.memberCount == 1) stringResource(R.string.comun_miembros_1, league.memberCount) else stringResource(R.string.comun_miembros_n, league.memberCount)) +
                    (dias?.let { " · " + (if (it == 1) stringResource(R.string.comun_termina_en_1, it) else stringResource(R.string.comun_termina_en_n, it)) } ?: ""),
                color = Muted,
                fontSize = 12.sp,
            )
        }
    }
}

@Composable
private fun ClanInviteRow(invite: ClanInvite, onAccept: () -> Unit, onDecline: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .padding(16.dp),
    ) {
        Text("[${invite.clanTag}] ${invite.clanName}", color = Foreground, fontWeight = FontWeight.Bold, fontSize = 15.sp)
        Text(stringResource(R.string.social_te_invita, invite.invitedByName), color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = stringResource(R.string.social_unirme),
                color = Accent,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onAccept),
            )
            Text(
                text = stringResource(R.string.comun_rechazar),
                color = Muted,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onDecline),
            )
        }
    }
}

/** "Tu clan" cuando ya perteneces a uno — mismo hueco que ocuparía "Crea tu propio clan", pero llevando directo a la ficha en vez de invitar a crear otro. */
@Composable
private fun ClanCard(title: String, subtitle: String, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(16.dp))
            .border(1.dp, Border, RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(18.dp),
    ) {
        Text(title, color = Muted, fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
        Text(subtitle, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(top = 4.dp))
    }
}

@Composable
private fun CreateClanHero(onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                androidx.compose.ui.graphics.Brush.linearGradient(listOf(AccentSoft, Surface)),
                RoundedCornerShape(16.dp),
            )
            .border(1.dp, Accent.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(18.dp),
    ) {
        Text(stringResource(R.string.social_crea_clan), color = Accent, fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.sp)
        Text(
            stringResource(R.string.social_crea_clan_sub),
            color = Muted,
            fontSize = 12.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Add, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(16.dp))
            Text(stringResource(R.string.social_crear_clan), color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
        }
    }
}

@Composable
private fun ClanRowItem(clan: ClanSummary, onClick: () -> Unit) {
    val color = leagueColor(clan.id)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(38.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(color.copy(alpha = 0.16f)),
            contentAlignment = Alignment.Center,
        ) {
            Text(clan.tag.take(2).uppercase(), color = color, fontWeight = FontWeight.Black, fontSize = 12.sp)
        }
        Column(modifier = Modifier.weight(1f).padding(start = 12.dp)) {
            Text(text = "[${clan.tag}] ${clan.name}", color = Foreground, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            if (clan.description.isNotBlank()) {
                Text(text = clan.description, color = Muted, fontSize = 12.sp, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
            }
        }
        Text(
            text = if (clan.memberCount == 1) stringResource(R.string.comun_miembros_1, clan.memberCount) else stringResource(R.string.comun_miembros_n, clan.memberCount),
            color = Muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun NewClanDialog(error: String?, onDismiss: () -> Unit, onCreate: (String, String, String) -> Unit) {
    var name by remember { mutableStateOf("") }
    var tag by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(stringResource(R.string.social_nuevo_clan), color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text(
                    stringResource(R.string.social_nuevo_clan_sub),
                    color = Muted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 12.dp),
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { if (it.length <= 60) name = it },
                    placeholder = { Text(stringResource(R.string.social_clan_nombre)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = Border,
                        focusedTextColor = Foreground,
                        unfocusedTextColor = Foreground,
                    ),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = tag,
                    onValueChange = { if (it.length <= 5) tag = it.uppercase() },
                    placeholder = { Text(stringResource(R.string.social_clan_tag)) },
                    singleLine = true,
                    modifier = Modifier.width(140.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = Border,
                        focusedTextColor = Foreground,
                        unfocusedTextColor = Foreground,
                    ),
                )
                Spacer(Modifier.height(10.dp))
                OutlinedTextField(
                    value = description,
                    onValueChange = { if (it.length <= 200) description = it },
                    placeholder = { Text(stringResource(R.string.social_clan_desc)) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 70.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = Border,
                        focusedTextColor = Foreground,
                        unfocusedTextColor = Foreground,
                    ),
                )
                if (error != null) {
                    Text(text = error, color = Danger, fontSize = 12.sp, modifier = Modifier.padding(top = 10.dp))
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank() && tag.isNotBlank(),
                onClick = { onCreate(name.trim(), tag.trim(), description.trim()) },
            ) {
                Text(stringResource(R.string.comun_crear), color = Accent, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.comun_cancelar), color = Muted) }
        },
    )
}

/**
 * Tarjeta de temporada de la Liga Mensual global — antes la lista arrancaba
 * directa en la primera fila, sin ningún contexto de "esto es una
 * competición con reloj", solo un listado. `diaDelMes`/días restantes se
 * calculan del propio calendario, no llegan del backend (la liga mensual no
 * tiene fecha de fin propia, se resetea el día 1).
 */
@Composable
private fun LeagueSeasonCard(totalParticipantes: Int, miPosicion: Int?, misPuntos: Int?) {
    val cal = remember { java.util.Calendar.getInstance() }
    val diasRestantes = remember { cal.getActualMaximum(java.util.Calendar.DAY_OF_MONTH) - cal.get(java.util.Calendar.DAY_OF_MONTH) }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                androidx.compose.ui.graphics.Brush.linearGradient(listOf(Platinum.copy(alpha = 0.14f), Surface)),
                RoundedCornerShape(16.dp),
            )
            .border(1.dp, Platinum.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
            .padding(18.dp),
    ) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Column {
                Text(stringResource(R.string.social_liga_mensual), color = Foreground, fontWeight = FontWeight.Black, fontSize = 14.sp, letterSpacing = 1.sp)
                Text(stringResource(R.string.social_liga_mensual_sub), color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("⏱", fontSize = 13.sp)
                Text(
                    text = if (diasRestantes <= 0) stringResource(R.string.comun_termina_hoy) else if (diasRestantes == 1) stringResource(R.string.comun_termina_en_1, diasRestantes) else stringResource(R.string.comun_termina_en_n, diasRestantes),
                    color = if (diasRestantes <= 2) PodiumGold else Muted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(start = 4.dp),
                )
            }
        }
        if (miPosicion != null && misPuntos != null) {
            Spacer(Modifier.height(12.dp))
            HorizontalDivider(color = Platinum.copy(alpha = 0.2f))
            Spacer(Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(stringResource(R.string.comun_puntos, misPuntos), color = Platinum, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text(stringResource(R.string.social_puesto, miPosicion, totalParticipantes), color = Muted, fontSize = 12.sp)
            }
        }
    }
}

// Mismo Platinum que ya usa LeagueStandingRow (LeagueDetailSheet.kt) para el
// #1 — no el "Gold" de trofeos (Color.kt), que es un color distinto y
// rompería la consistencia entre las dos pantallas de liga.
private val PodiumGold get() = com.paragon.app.ui.theme.Platinum
// `get()`, no `val` fijo (bug real de auditoría): un `val` de nivel de
// archivo se calcula UNA vez al cargar la clase, así que nunca reaccionaba
// al cambiar de modo claro/oscuro — y encima "Silver" tapaba silenciosamente
// al `Silver` de tema (import `ui.theme.*`) con el mismo nombre, así que un
// futuro cambio del import ni siquiera habría avisado del conflicto.
// Nombrados "Podium*" para que no vuelva a pasar.
private val PodiumSilver get() = com.paragon.app.ui.theme.Silver
private val PodiumBronze get() = com.paragon.app.ui.theme.Bronze

/**
 * Podio para el top 3 — antes las tres primeras filas eran indistinguibles
 * del resto salvo por el número. El primero se lleva su propia tarjeta
 * ancha (borde/halo dorado, más presencia); segundo y tercero van en un
 * par de tarjetas compactas debajo, como un podio real.
 */
@Composable
private fun LeaguePodium(top3: List<LigaRow>, onClick: (String?) -> Unit) {
    Column(modifier = Modifier.padding(top = 12.dp)) {
        top3.getOrNull(0)?.let { primero ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(PodiumGold.copy(alpha = 0.12f), RoundedCornerShape(16.dp))
                    .border(1.dp, PodiumGold.copy(alpha = 0.4f), RoundedCornerShape(16.dp))
                    .clickable { onClick(primero.handle) }
                    .padding(vertical = 18.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(contentAlignment = Alignment.BottomEnd) {
                    RowAvatar(primero.name, primero.avatarUrl, size = 56.dp)
                    Text("🥇", fontSize = 20.sp)
                }
                Text(primero.name, color = Foreground, fontWeight = FontWeight.Black, fontSize = 17.sp, modifier = Modifier.padding(top = 8.dp))
                Text(stringResource(R.string.comun_puntos, primero.points), color = PodiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                val segundo = top3.getOrNull(1)
                if (segundo != null) {
                    val diferencia = primero.points - segundo.points
                    if (diferencia > 0) {
                        Text(stringResource(R.string.social_ventaja, diferencia), color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
                    }
                }
            }
        }
        if (top3.size > 1) {
            Spacer(Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                top3.getOrNull(1)?.let { PodiumSecondaryCard(it, "🥈", PodiumSilver, Modifier.weight(1f), onClick) }
                top3.getOrNull(2)?.let { PodiumSecondaryCard(it, "🥉", PodiumBronze, Modifier.weight(1f), onClick) }
            }
        }
    }
}

@Composable
private fun PodiumSecondaryCard(row: LigaRow, medalla: String, color: androidx.compose.ui.graphics.Color, modifier: Modifier, onClick: (String?) -> Unit) {
    Column(
        modifier = modifier
            .background(Surface, RoundedCornerShape(14.dp))
            .border(1.dp, color.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
            .clickable { onClick(row.handle) }
            .padding(14.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.BottomEnd) {
            RowAvatar(row.name, row.avatarUrl, size = 40.dp)
            Text(medalla, fontSize = 14.sp)
        }
        Text(row.name, color = Foreground, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, maxLines = 1, modifier = Modifier.padding(top = 6.dp))
        Text(stringResource(R.string.comun_puntos, row.points), color = Muted, fontSize = 11.sp)
    }
}

/**
 * Foto real si la hay (mismo criterio que el resto de la app — foto
 * subida a mano / PSN / Steam), inicial como respaldo — antes estas dos
 * listas eran solo texto, sin ninguna cara que distinga a un vistazo
 * quién es quién.
 */
@Composable
private fun RowAvatar(name: String, avatarUrl: String?, size: androidx.compose.ui.unit.Dp = 40.dp) {
    Box(
        modifier = Modifier.size(size).background(Surface2, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        if (!avatarUrl.isNullOrBlank()) {
            coil3.compose.AsyncImage(
                model = avatarUrl,
                contentDescription = null,
                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                modifier = Modifier.fillMaxSize().clip(CircleShape),
            )
        } else {
            Text(name.take(1).uppercase(), color = Muted, fontWeight = FontWeight.Bold, fontSize = (size.value / 2.4).sp)
        }
    }
}

@Composable
fun LigaRowItem(row: LigaRow, position: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            RowAvatar(row.name, row.avatarUrl)
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Text(text = row.name, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(text = stringResource(R.string.social_puntos_mes, row.points), color = Muted, fontSize = 12.sp)
            }
        }
        Text(text = "${position}º", color = Muted, fontWeight = FontWeight.Bold, fontSize = 16.sp)
    }
}

@Composable
fun AmigoRowItem(row: AmigoRow, position: Int, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(12.dp))
            .border(1.dp, Border, RoundedCornerShape(12.dp))
            .clickable { onClick() }
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            RowAvatar(row.name, row.avatarUrl)
            Column(modifier = Modifier.padding(start = 12.dp)) {
                Text(text = row.name, color = Foreground, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Text(text = stringResource(R.string.social_nivel_platinos, row.level, row.platinos), color = Muted, fontSize = 12.sp)
                if (row.accounts.isNotEmpty()) {
                    Text(
                        text = row.accounts.joinToString(" · ") { "${it.platform.uppercase()}: ${it.username}" },
                        color = Muted,
                        fontSize = 11.sp,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
        }
        Text(text = "${position}º", color = Platinum, fontWeight = FontWeight.Bold, fontSize = 20.sp)
    }
}

/**
 * Deslizar una fila (de Ligas o Amigos) hacia la izquierda salta directo a
 * Comparar contra esa persona, sin pasar por su perfil — pensado para
 * cuando ya sabes con quién te quieres picar, no para descubrir su ficha.
 * El toque normal (`onClick` dentro del contenido) sigue abriendo el
 * perfil tal cual, esto es un atajo aparte, no lo sustituye.
 */
@Composable
private fun SwipeToCompareRow(
    handle: String?,
    onCompareClick: (String) -> Unit,
    content: @Composable () -> Unit,
) {
    val haptic = LocalHapticFeedback.current
    val offsetX = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val density = LocalDensity.current
    val thresholdPx = with(density) { 72.dp.toPx() }
    var crossedThreshold by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxSize().padding(end = 24.dp),
            horizontalArrangement = Arrangement.End,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(Icons.AutoMirrored.Filled.CompareArrows, contentDescription = null, tint = Accent)
        }
        Box(
            modifier = Modifier
                .offset { IntOffset(offsetX.value.roundToInt(), 0) }
                .pointerInput(handle) {
                    if (handle == null) return@pointerInput
                    detectHorizontalDragGestures(
                        onDragStart = { crossedThreshold = false },
                        onDragEnd = {
                            scope.launch {
                                if (offsetX.value <= -thresholdPx) onCompareClick(handle)
                                offsetX.animateTo(0f, animationSpec = tween(200))
                            }
                        },
                        onDragCancel = {
                            scope.launch { offsetX.animateTo(0f, animationSpec = tween(200)) }
                        },
                        onHorizontalDrag = { change, dragAmount ->
                            change.consume()
                            val next = (offsetX.value + dragAmount).coerceIn(-thresholdPx * 1.4f, 0f)
                            scope.launch { offsetX.snapTo(next) }
                            val nowCrossed = next <= -thresholdPx
                            if (nowCrossed && !crossedThreshold) {
                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                            }
                            crossedThreshold = nowCrossed
                        },
                    )
                },
        ) {
            content()
        }
    }
}
