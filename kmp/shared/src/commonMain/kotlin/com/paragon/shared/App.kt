package com.paragon.shared

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import coil3.compose.setSingletonImageLoaderFactory
import coil3.ImageLoader
import coil3.network.ktor3.KtorNetworkFetcherFactory

/** Acento platino por defecto de la web (`--accent-rgb: 124 196 228`). */
private val Platino = Color(124, 196, 228)

private val Esquema = darkColorScheme(
    primary = Platino,
    onPrimary = Color(0xFF0A0D13),
    background = Color(0xFF0A0D13),
    surface = Color(0xFF141922),
    onSurface = Color(0xFFE8ECF2),
    onSurfaceVariant = Color(0xFF9AA4B2),
)

private sealed interface Estado {
    data object Cargando : Estado
    data class Listo(val juegos: List<Lanzamiento>) : Estado
    data class Fallo(val mensaje: String) : Estado
}

@Composable
fun App() {
    // En Kotlin/Native el fetcher de red de Coil se registra a mano.
    setSingletonImageLoaderFactory { ctx ->
        ImageLoader.Builder(ctx).components { add(KtorNetworkFetcherFactory()) }.build()
    }

    MaterialTheme(colorScheme = Esquema) {
        Surface(Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
            var intento by remember { mutableIntStateOf(0) }
            var estado by remember { mutableStateOf<Estado>(Estado.Cargando) }

            LaunchedEffect(intento) {
                estado = Estado.Cargando
                estado = try {
                    Estado.Listo(proximosLanzamientos())
                } catch (e: Exception) {
                    Estado.Fallo(e.message ?: e::class.simpleName ?: "Error")
                }
            }

            Column(
                Modifier.fillMaxSize()
                    .windowInsetsPadding(WindowInsets.safeDrawing)
                    .padding(horizontal = 16.dp),
            ) {
                Spacer(Modifier.height(12.dp))
                Text("Paragon", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Platino)
                Text(
                    "Prueba de Compose Multiplatform · ${nombrePlataforma()}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(16.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Próximos lanzamientos", style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    Button(onClick = { intento++ }, enabled = estado !is Estado.Cargando) { Text("Recargar") }
                }
                Spacer(Modifier.height(8.dp))

                when (val e = estado) {
                    Estado.Cargando -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = Platino)
                    }
                    is Estado.Fallo -> Text("No se pudo cargar: ${e.mensaje}", color = Color(0xFFFF8A80))
                    is Estado.Listo -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(e.juegos, key = { it.id }) { FilaLanzamiento(it) }
                        item { Spacer(Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilaLanzamiento(juego: Lanzamiento) {
    Row(
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(MaterialTheme.colorScheme.surface)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = juego.cover,
            contentDescription = juego.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier.size(width = 56.dp, height = 75.dp).clip(RoundedCornerShape(6.dp)),
        )
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(juego.title, style = MaterialTheme.typography.titleSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
            juego.releaseLabel?.let {
                Text(it, style = MaterialTheme.typography.bodySmall, color = Platino)
            }
            if (juego.platforms.isNotEmpty()) {
                Text(
                    juego.platforms.joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}
