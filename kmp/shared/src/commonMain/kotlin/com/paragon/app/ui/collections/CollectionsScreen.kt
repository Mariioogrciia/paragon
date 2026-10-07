package com.paragon.app.ui.collections

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.HideImage
import androidx.compose.material.icons.filled.Check
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController
import coil3.compose.AsyncImage
import com.paragon.app.data.Coleccion
import com.paragon.app.data.CollectionsRepository
import com.paragon.app.data.CollectionsResult
import com.paragon.app.data.LibraryGame
import com.paragon.app.data.LibraryRepository
import com.paragon.app.data.LibraryResult
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.ui.navigation.Screen
import com.paragon.app.ui.theme.*
import kotlinx.coroutines.launch
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos


/**
 * Carpetas de juegos, contra GET/POST/PATCH/DELETE /api/mobile/collections
 * (CollectionsRepository). Para meter/sacar juegos de una carpeta, ver
 * `AddToCollectionSheet` — se abre desde GameDetailScreen.
 */
@Composable
fun CollectionsScreen(navController: NavController, tokenStore: TokenStore, onBack: () -> Unit = {}) {
    val repository = remember(tokenStore) { CollectionsRepository(tokenStore) }
    val context = com.paragon.shared.contextoPlataforma()
    val db = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context) }
    val libraryRepository = remember(tokenStore, db) { LibraryRepository(tokenStore, db.libraryDao(), context) }
    val coroutineScope = rememberCoroutineScope()

    var result by remember { mutableStateOf<CollectionsResult?>(null) }
    var libraryGames by remember { mutableStateOf<List<LibraryGame>>(emptyList()) }
    var selected by remember { mutableStateOf<Coleccion?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf<Coleccion?>(null) }
    var anadiendo by remember { mutableStateOf(false) }
    // Antes, si el servidor decía que no (nombre repetido, sin conexión...),
    // la app no enseñaba nada: el diálogo se quedaba abierto o el borrado no
    // ocurría, sin explicación. Ahora siempre se dice qué ha pasado.
    var errorDialogo by remember { mutableStateOf<String?>(null) }
    var aviso by remember { mutableStateOf<String?>(null) }
    val retryCounter = remember { mutableIntStateOf(0) }

    fun reload() {
        coroutineScope.launch {
            result = repository.getCollections()
            val lib = libraryRepository.getLibrary()
            if (lib is LibraryResult.Ok) libraryGames = lib.games
        }
    }

    LaunchedEffect(retryCounter.value) { reload() }

    Column(modifier = Modifier.fillMaxSize().background(Background)) {
        com.paragon.app.ui.common.CabeceraNativa(
            titulo = selected?.name ?: Textos.t(T.carpetas_titulo),
            atras = if (selected != null) Textos.t(T.carpetas_titulo) else Textos.t(T.nav_perfil),
            onBack = { if (selected != null) selected = null else onBack() },
        ) {
            if (selected == null) {
                IconButton(onClick = { showCreateDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = Textos.t(T.carpeta_nueva), tint = Accent)
                }
            } else {
                // Meter juegos desde la propia carpeta (antes solo desde la ficha de cada juego).
                IconButton(onClick = { anadiendo = true }) {
                    Icon(Icons.Default.Add, contentDescription = Textos.t(T.carpeta_anadir_juegos), tint = Accent)
                }
            }
        }

        aviso?.let {
            Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(horizontal = 24.dp, vertical = 4.dp))
        }
        val current = result
        when {
            current == null -> Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Accent)
            }
            current is CollectionsResult.Error -> Box(modifier = Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(text = current.message, color = Foreground, fontSize = 14.sp)
                    Button(
                        onClick = { retryCounter.value += 1 },
                        modifier = Modifier.padding(top = 16.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Accent),
                    ) { Text(Textos.t(T.comun_reintentar)) }
                }
            }
            current is CollectionsResult.Ok -> {
                val activeSelected = selected
                if (activeSelected == null) {
                    CollectionsList(
                        collections = current.collections,
                        portadas = { c -> c.gameIds.mapNotNull { id -> libraryGames.firstOrNull { it.id == id }?.coverUrl }.take(4) },
                        onOpen = { selected = it },
                        onRename = { renaming = it },
                        onFoto = { coleccion, bytes, mime, ext ->
                            coroutineScope.launch {
                                aviso = repository.subirPortada(coleccion.id, bytes, mime, ext)
                                reload()
                            }
                        },
                        onQuitarFoto = { coleccion ->
                            coroutineScope.launch {
                                aviso = if (repository.quitarPortada(coleccion.id)) null else Textos.t(T.error_red)
                                reload()
                            }
                        },
                        onDelete = { coleccion ->
                            coroutineScope.launch {
                                val r = repository.deleteCollection(coleccion.id)
                                aviso = if (r.ok) null else r.message
                                reload()
                            }
                        },
                    )
                } else {
                    val juegosDeLaCarpeta = libraryGames.filter { it.id in activeSelected.gameIds }
                    CollectionDetail(
                        games = juegosDeLaCarpeta,
                        onAnadir = { anadiendo = true },
                        onOpenGame = { navController.navigate(Screen.GameDetail.routeFor(it)) },
                        onRemove = { gameId ->
                            coroutineScope.launch {
                                val sigueDentro = repository.toggleGameInCollection(activeSelected.id, gameId)
                                aviso = if (sigueDentro) Textos.t(T.carpeta_err_quitar) else null
                                val refreshed = repository.getCollections()
                                result = refreshed
                                if (refreshed is CollectionsResult.Ok) {
                                    selected = refreshed.collections.find { it.id == activeSelected.id }
                                }
                            }
                        },
                    )
                }
            }
        }
    }

    val carpeta = selected
    if (anadiendo && carpeta != null) {
        AnadirJuegosSheet(
            juegos = libraryGames,
            dentro = carpeta.gameIds.toSet(),
            onAlternar = { gameId -> repository.toggleGameInCollection(carpeta.id, gameId) },
            onDismiss = {
                anadiendo = false
                coroutineScope.launch {
                    val refreshed = repository.getCollections()
                    result = refreshed
                    if (refreshed is CollectionsResult.Ok) selected = refreshed.collections.find { it.id == carpeta.id }
                }
            },
        )
    }

    if (showCreateDialog) {
        NameDialog(
            title = Textos.t(T.carpeta_nueva),
            initialValue = "",
            error = errorDialogo,
            onDismiss = { showCreateDialog = false; errorDialogo = null },
            onConfirm = { name ->
                coroutineScope.launch {
                    val outcome = repository.createCollection(name)
                    if (outcome.ok) {
                        showCreateDialog = false
                        errorDialogo = null
                        reload()
                    } else errorDialogo = outcome.message
                }
            },
        )
    }

    renaming?.let { coleccion ->
        NameDialog(
            title = Textos.t(T.carpeta_renombrar),
            initialValue = coleccion.name,
            error = errorDialogo,
            onDismiss = { renaming = null; errorDialogo = null },
            onConfirm = { name ->
                coroutineScope.launch {
                    val outcome = repository.renameCollection(coleccion.id, name)
                    if (outcome.ok) {
                        renaming = null
                        errorDialogo = null
                        reload()
                    } else errorDialogo = outcome.message
                }
            },
        )
    }
}

/**
 * Tus carpetas (diseño v2, maqueta "19 · Carpetas"): cuadrícula de dos
 * columnas con las cuatro primeras carátulas de cada una, y sus opciones
 * (cambiar nombre, borrar) en una hoja desde abajo con "⋯".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CollectionsList(
    collections: List<Coleccion>,
    portadas: (Coleccion) -> List<String>,
    onOpen: (Coleccion) -> Unit,
    onRename: (Coleccion) -> Unit,
    onFoto: (Coleccion, ByteArray, String, String) -> Unit,
    onQuitarFoto: (Coleccion) -> Unit,
    onDelete: (Coleccion) -> Unit,
) {
    var deleting by remember { mutableStateOf<Coleccion?>(null) }
    var opciones by remember { mutableStateOf<Coleccion?>(null) }

    if (collections.isEmpty()) {
        com.paragon.app.ui.common.EmptyState(
            icon = Icons.Default.Folder,
            title = Textos.t(T.carpeta_vacio),
            description = Textos.t(T.carpeta_vacio_sub),
        )
        return
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier.fillMaxSize().padding(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(top = 12.dp, bottom = 96.dp),
    ) {
        items(collections, key = { it.id }) { coleccion ->
            val caratulas = portadas(coleccion)
            Column(
                Modifier.fillMaxWidth().clip(RoundedCornerShape(radio(20))).background(Surface)
                    .clickable { onOpen(coleccion) }.padding(10.dp),
            ) {
                // Su foto, si tiene; si no, 2×2 carátulas (los huecos, en la superficie de al lado).
                val foto = coleccion.portada
                if (foto != null) {
                    AsyncImage(
                        model = foto,
                        contentDescription = null,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(radio(12))).background(Surface2),
                    )
                } else Column(Modifier.fillMaxWidth().aspectRatio(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    for (fila in 0..1) {
                        Row(Modifier.weight(1f).fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            for (col in 0..1) {
                                val url = caratulas.getOrNull(fila * 2 + col)
                                Box(Modifier.weight(1f).fillMaxHeight().clip(RoundedCornerShape(radio(8))).background(Surface2)) {
                                    if (url != null) {
                                        AsyncImage(
                                            model = url,
                                            contentDescription = null,
                                            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize(),
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
                Row(Modifier.fillMaxWidth().padding(start = 4.dp, top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(coleccion.name, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text(Textos.t(T.comun_n_juegos, coleccion.gameIds.size), color = Muted, fontSize = 12.sp, maxLines = 1)
                    }
                    IconButton(onClick = { opciones = coleccion }, modifier = Modifier.size(36.dp)) {
                        Icon(Icons.Default.MoreHoriz, contentDescription = Textos.t(T.carpeta_opciones), tint = Muted)
                    }
                }
            }
        }
    }

    opciones?.let { coleccion ->
        ModalBottomSheet(onDismissRequest = { opciones = null }, containerColor = com.paragon.app.ui.theme.SurfaceSolida) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp).padding(bottom = 28.dp)) {
                Text(coleccion.name, color = Foreground, fontSize = 18.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.padding(bottom = 8.dp))
                OpcionHoja(Icons.Default.Folder, Textos.t(T.carpeta_abrir)) { opciones = null; onOpen(coleccion) }
                OpcionHoja(Icons.Default.Edit, Textos.t(T.comun_renombrar)) { opciones = null; onRename(coleccion) }
                // Foto de la carpeta: el mismo selector de imágenes que la foto de perfil.
                com.paragon.app.ui.settings.ProfileImagePicker(
                    onImagePicked = { bytes, mime, ext -> opciones = null; onFoto(coleccion, bytes, mime, ext) },
                ) { elegir ->
                    OpcionHoja(Icons.Default.Image, if (coleccion.portada != null) Textos.t(T.carpeta_cambiar_foto) else Textos.t(T.carpeta_poner_foto), onClick = elegir)
                }
                if (coleccion.portada != null) {
                    OpcionHoja(Icons.Default.HideImage, Textos.t(T.carpeta_quitar_foto)) { opciones = null; onQuitarFoto(coleccion) }
                }
                OpcionHoja(Icons.Default.Delete, Textos.t(T.comun_borrar), color = Danger) { opciones = null; deleting = coleccion }
            }
        }
    }

    deleting?.let { coleccion ->
        com.paragon.app.ui.common.ConfirmDialog(
            title = Textos.t(T.carpeta_borrar_titulo),
            message = Textos.t(T.carpeta_borrar_texto, coleccion.name, coleccion.gameIds.size),
            confirmLabel = Textos.t(T.comun_si_borrar),
            onConfirm = { onDelete(coleccion) },
            onDismiss = { deleting = null },
        )
    }
}

/** Una opción de una hoja de acciones: icono y texto a lo ancho, como en iPhone. */
@Composable
private fun OpcionHoja(icono: androidx.compose.ui.graphics.vector.ImageVector, texto: String, color: androidx.compose.ui.graphics.Color = Foreground, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(52.dp).clip(RoundedCornerShape(radio(12))).clickable(onClick = onClick).padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icono, contentDescription = null, tint = color, modifier = Modifier.size(22.dp))
        Text(texto, color = color, fontSize = 16.sp, modifier = Modifier.padding(start = 14.dp))
    }
}

@Composable
private fun CollectionDetail(games: List<LibraryGame>, onAnadir: () -> Unit, onOpenGame: (String) -> Unit, onRemove: (String) -> Unit) {
    if (games.isEmpty()) {
        Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
            com.paragon.app.ui.common.EmptyState(
                icon = Icons.Default.Folder,
                title = Textos.t(T.carpeta_sin_juegos),
                description = Textos.t(T.carpeta_sin_juegos_sub),
                modifier = Modifier.weight(1f, fill = false),
            )
            Button(
                onClick = onAnadir,
                colors = ButtonDefaults.buttonColors(containerColor = Accent),
                modifier = Modifier.padding(top = 8.dp),
            ) {
                Icon(Icons.Default.Add, contentDescription = null, tint = com.paragon.app.ui.theme.OnAccent, modifier = Modifier.size(18.dp))
                Text(Textos.t(T.carpeta_anadir_juegos), color = com.paragon.app.ui.theme.OnAccent, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 6.dp))
            }
        }
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp),
    ) {
        items(games, key = { it.id }) { game ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface, RoundedCornerShape(radio(14)))
                    .clickable { onOpenGame(game.id) }
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AsyncImage(
                    model = game.coverUrl,
                    contentDescription = null,
                    modifier = Modifier.size(44.dp).background(Surface2, RoundedCornerShape(radio(10))),
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = game.title, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                    Text(text = "${game.progressPercent}%", color = Muted, fontSize = 12.sp)
                }
                IconButton(onClick = { onRemove(game.id) }) {
                    Icon(Icons.Default.Close, contentDescription = Textos.t(T.carpeta_quitar), tint = Muted)
                }
            }
        }
    }
}

@Composable
private fun NameDialog(title: String, initialValue: String, error: String? = null, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var name by remember { mutableStateOf(initialValue) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(text = title, color = Foreground) },
        text = {
            Column {
            OutlinedTextField(
                value = name,
                onValueChange = { if (it.length <= 40) name = it },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Foreground,
                    unfocusedTextColor = Foreground,
                    cursorColor = Accent,
                    focusedBorderColor = Accent,
                    unfocusedBorderColor = Border,
                ),
            )
            error?.let { Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp)) }
            }
        },
        confirmButton = {
            TextButton(onClick = { if (name.isNotBlank()) onConfirm(name.trim()) }) {
                Text(Textos.t(T.comun_guardar), color = Accent)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(Textos.t(T.comun_cancelar), color = Muted) }
        },
    )
}

/**
 * Bottom sheet para meter/sacar el juego actual de sus carpetas — se abre
 * desde GameDetailScreen. Estado optimista sencillo: cada checkbox llama al
 * toggle real y confía en la respuesta `dentro` para pintarse.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddToCollectionSheet(gameId: String, tokenStore: TokenStore, onDismiss: () -> Unit) {
    val repository = remember(tokenStore) { CollectionsRepository(tokenStore) }
    val coroutineScope = rememberCoroutineScope()
    var collections by remember { mutableStateOf<List<Coleccion>?>(null) }
    var recarga by remember { mutableIntStateOf(0) }
    var creando by remember { mutableStateOf(false) }
    var errorCrear by remember { mutableStateOf<String?>(null) }
    var aviso by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(recarga) {
        val r = repository.getCollections()
        collections = (r as? CollectionsResult.Ok)?.collections ?: emptyList()
    }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = com.paragon.app.ui.theme.SurfaceSolida) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp).padding(bottom = 24.dp)) {
            Text(text = Textos.t(T.carpeta_anadir), color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(Modifier.height(12.dp))

            val actuales = collections
            when {
                actuales == null -> Box(modifier = Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                actuales.isEmpty() -> Text(text = Textos.t(T.carpeta_vacio_sheet), color = Muted, fontSize = 13.sp)
                else -> actuales.forEach { coleccion ->
                    var dentro by remember(coleccion.id) { mutableStateOf(gameId in coleccion.gameIds) }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                dentro = !dentro
                                val esperado = dentro
                                coroutineScope.launch {
                                    dentro = repository.toggleGameInCollection(coleccion.id, gameId)
                                    aviso = if (dentro != esperado) Textos.t(T.carpeta_err_cambiar) else null
                                }
                            }
                            .padding(vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = dentro,
                            onCheckedChange = null,
                            colors = CheckboxDefaults.colors(checkedColor = Accent),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(text = coleccion.name, color = Foreground, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                }
            }
            aviso?.let { Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(top = 4.dp)) }
            // Crear una carpeta sin salir de la ficha (antes solo se podía en Carpetas).
            TextButton(onClick = { creando = true }, modifier = Modifier.padding(top = 4.dp)) {
                Icon(Icons.Default.Add, contentDescription = null, tint = Accent)
                Spacer(Modifier.width(6.dp))
                Text(Textos.t(T.carpeta_nueva), color = Accent, fontWeight = FontWeight.Bold)
            }
        }
    }
    if (creando) {
        NameDialog(
            title = Textos.t(T.carpeta_nueva),
            initialValue = "",
            error = errorCrear,
            onDismiss = { creando = false; errorCrear = null },
            onConfirm = { name ->
                coroutineScope.launch {
                    val outcome = repository.createCollection(name)
                    if (outcome.ok) {
                        creando = false
                        errorCrear = null
                        recarga++
                    } else errorCrear = outcome.message
                }
            },
        )
    }
}

/**
 * Añadir o quitar juegos de una carpeta desde la propia carpeta: tu
 * biblioteca con buscador y una marca en los que ya están. Cada toque se
 * guarda al momento (el mismo endpoint que el botón de la ficha del juego).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AnadirJuegosSheet(
    juegos: List<LibraryGame>,
    dentro: Set<String>,
    onAlternar: suspend (String) -> Boolean,
    onDismiss: () -> Unit,
) {
    var marcados by remember { mutableStateOf(dentro) }
    var busqueda by remember { mutableStateOf("") }
    val scope = rememberCoroutineScope()
    val filtrados = remember(juegos, busqueda) {
        val q = busqueda.trim().lowercase()
        juegos.filter { q.isEmpty() || it.title.lowercase().contains(q) }.sortedBy { it.title.lowercase() }
    }
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = com.paragon.app.ui.theme.SurfaceSolida,
    ) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp)) {
            Text(Textos.t(T.carpeta_anadir_juegos), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(Textos.t(T.carpeta_anadir_sub, marcados.size), color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp, bottom = 12.dp))
            OutlinedTextField(
                value = busqueda,
                onValueChange = { busqueda = it },
                placeholder = { Text(Textos.t(T.carpeta_buscar), color = Muted) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = Muted) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(radio(14)),
            )
            LazyColumn(
                modifier = Modifier.fillMaxWidth().heightIn(max = 520.dp).padding(top = 8.dp),
                contentPadding = PaddingValues(bottom = 32.dp),
            ) {
                items(filtrados, key = { it.id }) { game ->
                    val marcado = game.id in marcados
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(radio(12)))
                            .clickable {
                                // Al momento en pantalla; si el servidor dice otra cosa, se corrige.
                                marcados = if (marcado) marcados - game.id else marcados + game.id
                                scope.launch {
                                    val real = onAlternar(game.id)
                                    marcados = if (real) marcados + game.id else marcados - game.id
                                }
                            }
                            .padding(vertical = 8.dp, horizontal = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AsyncImage(
                            model = game.coverUrl,
                            contentDescription = null,
                            modifier = Modifier.size(44.dp).clip(RoundedCornerShape(radio(10))).background(Surface2),
                        )
                        Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                            Text(game.title, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis)
                            Text("${game.progressPercent}%", color = Muted, fontSize = 12.sp)
                        }
                        Box(
                            Modifier.size(26.dp).clip(CircleShape)
                                .background(if (marcado) Accent else Color.Transparent)
                                .border(2.dp, if (marcado) Accent else Border, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            if (marcado) Icon(Icons.Default.Check, contentDescription = null, tint = com.paragon.app.ui.theme.OnAccent, modifier = Modifier.size(16.dp))
                        }
                    }
                }
            }
        }
    }
}
