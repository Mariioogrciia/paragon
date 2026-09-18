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

/**
 * Carpetas de juegos, contra GET/POST/PATCH/DELETE /api/mobile/collections
 * (CollectionsRepository). Para meter/sacar juegos de una carpeta, ver
 * `AddToCollectionSheet` — se abre desde GameDetailScreen.
 */
@Composable
fun CollectionsScreen(navController: NavController, tokenStore: TokenStore, onBack: () -> Unit = {}) {
    val repository = remember(tokenStore) { CollectionsRepository(tokenStore) }
    val context = androidx.compose.ui.platform.LocalContext.current
    val db = remember(context) { com.paragon.app.data.local.ParagonDatabase.getDatabase(context) }
    val libraryRepository = remember(tokenStore, db) { LibraryRepository(tokenStore, db.libraryDao(), context) }
    val coroutineScope = rememberCoroutineScope()

    var result by remember { mutableStateOf<CollectionsResult?>(null) }
    var libraryGames by remember { mutableStateOf<List<LibraryGame>>(emptyList()) }
    var selected by remember { mutableStateOf<Coleccion?>(null) }
    var showCreateDialog by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf<Coleccion?>(null) }
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
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver", tint = Foreground)
            }
            Text(
                text = (selected?.name ?: "CARPETAS").uppercase(),
                color = Foreground,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            if (selected == null) {
                IconButton(onClick = { showCreateDialog = true }) {
                    Icon(Icons.Default.Add, contentDescription = "Nueva carpeta", tint = Accent)
                }
            }
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
                    ) { Text("Reintentar") }
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
                                repository.deleteCollection(coleccion.id)
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
                                repository.toggleGameInCollection(activeSelected.id, gameId)
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
            title = "Nueva carpeta",
            initialValue = "",
            onDismiss = { showCreateDialog = false },
            onConfirm = { name ->
                coroutineScope.launch {
                    val outcome = repository.createCollection(name)
                    if (outcome.ok) {
                        showCreateDialog = false
                        reload()
                    }
                }
            },
        )
    }

    renaming?.let { coleccion ->
        NameDialog(
            title = "Renombrar carpeta",
            initialValue = coleccion.name,
            onDismiss = { renaming = null },
            onConfirm = { name ->
                coroutineScope.launch {
                    val outcome = repository.renameCollection(coleccion.id, name)
                    if (outcome.ok) {
                        renaming = null
                        reload()
                    }
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
            title = "Todavía no tienes ninguna carpeta",
            description = "Agrupa tus juegos como quieras — por saga, por plataforma, por lo que sea — y créalas con el + de arriba.",
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
                    .background(Surface, RoundedCornerShape(14.dp))
                    .border(1.dp, Border, RoundedCornerShape(14.dp))
                    .clickable { onOpen(coleccion) }
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = coleccion.name, color = Foreground, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text(text = "${coleccion.gameIds.size} juegos", color = Muted, fontSize = 12.sp)
                }
                IconButton(onClick = { onRename(coleccion) }) {
                    Icon(Icons.Default.Edit, contentDescription = "Renombrar", tint = Muted)
                }
                IconButton(onClick = { deleting = coleccion }) {
                    Icon(Icons.Default.Delete, contentDescription = "Borrar", tint = Danger)
                }
            }
        }
    }

    deleting?.let { coleccion ->
        com.paragon.app.ui.common.ConfirmDialog(
            title = "¿Borrar esta carpeta?",
            message = "\"${coleccion.name}\" desaparece con los ${coleccion.gameIds.size} juegos que agrupa (los juegos en sí no se borran, solo la carpeta).",
            confirmLabel = "Sí, borrar",
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
            title = "Ningún juego en esta carpeta todavía",
            description = "Añádelos desde su ficha, o desde la Biblioteca con el menú de cada tarjeta.",
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
                    .background(Surface, RoundedCornerShape(14.dp))
                    .clickable { onOpenGame(game.id) }
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AsyncImage(
                    model = game.coverUrl,
                    contentDescription = null,
                    modifier = Modifier.size(44.dp).background(Surface2, RoundedCornerShape(10.dp)),
                )
                Spacer(Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = game.title, color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, maxLines = 1)
                    Text(text = "${game.progressPercent}%", color = Muted, fontSize = 12.sp)
                }
                IconButton(onClick = { onRemove(game.id) }) {
                    Icon(Icons.Default.Close, contentDescription = "Quitar de la carpeta", tint = Muted)
                }
            }
        }
    }
}

@Composable
private fun NameDialog(title: String, initialValue: String, onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var name by remember { mutableStateOf(initialValue) }
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = Surface,
        title = { Text(text = title, color = Foreground) },
        text = {
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
        },
        confirmButton = {
            TextButton(onClick = { if (name.isNotBlank()) onConfirm(name.trim()) }) {
                Text("Guardar", color = Accent)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar", color = Muted) }
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

    LaunchedEffect(Unit) {
        val r = repository.getCollections()
        collections = (r as? CollectionsResult.Ok)?.collections ?: emptyList()
    }

    ModalBottomSheet(onDismissRequest = onDismiss, containerColor = Surface) {
        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp).padding(bottom = 24.dp)) {
            Text(text = "AÑADIR A CARPETA", color = Foreground, fontSize = 14.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
            Spacer(Modifier.height(12.dp))

            val actuales = collections
            when {
                actuales == null -> Box(modifier = Modifier.fillMaxWidth().height(80.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Accent)
                }
                actuales.isEmpty() -> Text(text = "Todavía no tienes ninguna carpeta. Crea una desde Biblioteca.", color = Muted, fontSize = 13.sp)
                else -> actuales.forEach { coleccion ->
                    var dentro by remember(coleccion.id) { mutableStateOf(gameId in coleccion.gameIds) }
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                dentro = !dentro
                                coroutineScope.launch {
                                    dentro = repository.toggleGameInCollection(coleccion.id, gameId)
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
        }
    }
}
