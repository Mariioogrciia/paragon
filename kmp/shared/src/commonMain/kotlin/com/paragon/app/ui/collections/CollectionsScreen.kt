package com.paragon.app.ui.collections

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = { if (selected != null) selected = null else onBack() }) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = Textos.t(T.comun_volver), tint = Foreground)
            }
            Text(
                text = (selected?.name ?: Textos.t(T.carpetas_titulo)).uppercase(),
                color = Foreground,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            if (selected == null) {
                IconButton(onClick = { showCreateDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = Textos.t(T.carpeta_nueva), tint = Accent)
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
                        onOpen = { selected = it },
                        onRename = { renaming = it },
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

@Composable
private fun CollectionsList(
    collections: List<Coleccion>,
    onOpen: (Coleccion) -> Unit,
    onRename: (Coleccion) -> Unit,
    onDelete: (Coleccion) -> Unit,
) {
    var deleting by remember { mutableStateOf<Coleccion?>(null) }

    if (collections.isEmpty()) {
        com.paragon.app.ui.common.EmptyState(
            icon = Icons.Default.Folder,
            title = Textos.t(T.carpeta_vacio),
            description = Textos.t(T.carpeta_vacio_sub),
        )
        return
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(top = 8.dp, bottom = 32.dp),
    ) {
        items(collections, key = { it.id }) { coleccion ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Surface, RoundedCornerShape(radio(14)))
                    .border(1.dp, Border, RoundedCornerShape(radio(14)))
                    .clickable { onOpen(coleccion) }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = coleccion.name, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text(text = Textos.t(T.comun_n_juegos, coleccion.gameIds.size), color = Muted, fontSize = 12.sp)
                }
                IconButton(onClick = { onRename(coleccion) }) {
                    Icon(Icons.Default.Edit, contentDescription = Textos.t(T.comun_renombrar), tint = Muted)
                }
                IconButton(onClick = { deleting = coleccion }) {
                    Icon(Icons.Default.Delete, contentDescription = Textos.t(T.comun_borrar), tint = Danger)
                }
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

@Composable
private fun CollectionDetail(games: List<LibraryGame>, onOpenGame: (String) -> Unit, onRemove: (String) -> Unit) {
    if (games.isEmpty()) {
        com.paragon.app.ui.common.EmptyState(
            icon = Icons.Default.Folder,
            title = Textos.t(T.carpeta_sin_juegos),
            description = Textos.t(T.carpeta_sin_juegos_sub),
        )
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

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface) {
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
                        Text(text = coleccion.name, color = Foreground, fontSize = 14.sp)
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
