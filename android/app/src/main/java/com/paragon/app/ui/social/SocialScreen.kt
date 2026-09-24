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
    val tabs = listOf("Ligas", "Mis Ligas", "Amigos", "Clan")

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
                null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is ClansResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Foreground, fontSize = 14.sp)
                        Button(
                            onClick = { clansRefresh.value += 1 },
                            modifier = Modifier.padding(top = 16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text("Reintentar")
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
                                title = "TU CLAN",
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
                                text = "Todavía no hay ningún clan. ¡Sé el primero en crear uno!",
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
                null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is LeaguesResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Foreground, fontSize = 14.sp)
                        Button(
                            onClick = { leaguesRefresh.value += 1 },
                            modifier = Modifier.padding(top = 16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text("Reintentar")
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
                                text = "Solo con quien tú quieras — invita a amigos, no a toda la comunidad.",
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
                null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                is SocialResult.Error -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = current.message, color = Foreground, fontSize = 14.sp)
                        Button(
                            onClick = { retryCounter.value += 1 },
                            modifier = Modifier.padding(top = 16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = Accent),
                        ) {
                            Text("Reintentar")
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
                            title = "Todavía no tienes amigos en Paragon",
                            description = "Búscalos por su @handle desde Comparar, o compartiendo el tuyo — así podéis ver el progreso del otro.",
                        )
                    } else if (vacioLiga) {
                        com.paragon.app.ui.common.EmptyState(
                            icon = Icons.Default.Add,
                            title = "Sin ranking todavía",
                            description = "En cuanto tengas amigos en Paragon, aquí saldréis clasificados por Paragon Score.",
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
        text = "Sin conexión — mostrando la última copia guardada",
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
        Text("${invite.ownerName} te ha invitado", color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "Aceptar",
                color = Accent,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onAccept),
            )
            Text(
                text = "Rechazar",
                color = Muted,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onDecline),
            )
        }
    }
}

private val UNIDADES_DURACION = listOf("dias" to "Días", "semanas" to "Semanas", "meses" to "Meses", "anios" to "Años")

@Composable
private fun NewLeagueDialog(onDismiss: () -> Unit, onCreate: (String, Int?, String?) -> Unit) {
    var name by remember { mutableStateOf("") }
    var durationValue by remember { mutableStateOf("") }
    var durationUnit by remember { mutableStateOf<String?>(null) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text("Nueva liga", color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                OutlinedTextField(
                    value = name,
                    onValueChange = { if (it.length <= 60) name = it },
                    placeholder = { Text("Los de siempre") },
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
                Text("Duración (opcional)", color = Muted, fontSize = 11.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
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
                Text("Crear", color = Accent, fontWeight = FontWeight.SemiBold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar", color = Muted) }
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
        Text("CREA TU PROPIA LIGA", color = Accent, fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.sp)
        Text(
            "Compite con tus amigos durante el tiempo que quieras — solo entre quien tú invites.",
            color = Muted,
            fontSize = 12.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Add, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(16.dp))
            Text("Crear liga", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
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
                text = "${league.memberCount} ${if (league.memberCount == 1) "miembro" else "miembros"}" +
                    (dias?.let { " · Termina en $it ${if (it == 1) "día" else "días"}" } ?: ""),
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
        Text("${invite.invitedByName} te invita a unirte", color = Muted, fontSize = 12.sp)
        Spacer(Modifier.height(10.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(
                text = "Unirme",
                color = Accent,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier.clickable(onClick = onAccept),
            )
            Text(
                text = "Rechazar",
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
        Text("CREA TU PROPIO CLAN", color = Accent, fontWeight = FontWeight.Black, fontSize = 13.sp, letterSpacing = 1.sp)
        Text(
            "Necesitas ser al menos Nivel 5 de Paragon. Une fuerzas con tu gente y sumad XP juntos.",
            color = Muted,
            fontSize = 12.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp),
        )
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Add, contentDescription = null, tint = androidx.compose.ui.graphics.Color.White, modifier = Modifier.size(16.dp))
            Text("Crear clan", color = androidx.compose.ui.graphics.Color.White, fontWeight = FontWeight.Bold, fontSize = 13.sp, modifier = Modifier.padding(start = 6.dp))
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
            text = "${clan.memberCount} ${if (clan.memberCount == 1) "miembro" else "miembros"}",
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
        title = { Text("Nuevo clan", color = Foreground, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text(
                    "Necesitas ser al menos Nivel 5 de Paragon, y no pertenecer ya a otro clan.",
                    color = Muted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(bottom = 12.dp),
                )
                OutlinedTextField(
                    value = name,
                    onValueChange = { if (it.length <= 60) name = it },
                    placeholder = { Text("Nombre del clan") },
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
                    placeholder = { Text("ETIQ (máx. 5)") },
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
                    placeholder = { Text("Descripción (opcional)") },
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
                Text("Crear", color = Accent, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar", color = Muted) }
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
                Text("LIGA MENSUAL", color = Foreground, fontWeight = FontWeight.Black, fontSize = 14.sp, letterSpacing = 1.sp)
                Text("Los mejores cazatrofeos de este mes", color = Muted, fontSize = 12.sp, modifier = Modifier.padding(top = 2.dp))
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("⏱", fontSize = 13.sp)
                Text(
                    text = if (diasRestantes <= 0) "Termina hoy" else "Termina en $diasRestantes ${if (diasRestantes == 1) "día" else "días"}",
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
                Text("$misPuntos puntos", color = Platinum, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                Text("Puesto $miPosicion de $totalParticipantes", color = Muted, fontSize = 12.sp)
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
                Text("${primero.points} puntos", color = PodiumGold, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                val segundo = top3.getOrNull(1)
                if (segundo != null) {
                    val diferencia = primero.points - segundo.points
                    if (diferencia > 0) {
                        Text("+$diferencia frente al segundo", color = Muted, fontSize = 11.sp, modifier = Modifier.padding(top = 2.dp))
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
        Text("${row.points} puntos", color = Muted, fontSize = 11.sp)
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
                Text(text = "${row.points} puntos este mes", color = Muted, fontSize = 12.sp)
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
                Text(text = "Nivel Paragon ${row.level} · ${row.platinos} platinos", color = Muted, fontSize = 12.sp)
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
