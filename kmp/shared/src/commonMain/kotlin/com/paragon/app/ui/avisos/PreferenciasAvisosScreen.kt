package com.paragon.app.ui.avisos

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.common.CabeceraNativa
import com.paragon.app.ui.common.FilaNativa
import com.paragon.app.ui.common.GrupoNativo
import com.paragon.app.ui.common.SeparadorFila
import com.paragon.app.ui.common.huecoBarra
import com.paragon.app.ui.theme.Accent
import com.paragon.app.ui.theme.Background
import com.paragon.app.ui.theme.Danger
import com.paragon.app.ui.theme.Foreground
import com.paragon.app.ui.theme.Muted
import com.paragon.app.ui.theme.OnAccent
import com.paragon.app.util.abrirAjustesNotificaciones
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.GuardarPreferenciasAvisos
import com.paragon.shared.red.HttpException
import com.paragon.shared.red.PreferenciasAvisosDto
import com.paragon.shared.red.paragonErrorMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

/**
 * Ajustes → Avisos en la app (20 oct 2026): las mismas preferencias que en la
 * web (src/lib/avisosPreferencias.ts) y los DM de Discord. Cada interruptor
 * se guarda al tocarlo; si falla, vuelve a como estaba. Arriba, el permiso
 * del sistema: si está quitado, nada de esto llega al móvil.
 */
@Composable
fun PreferenciasAvisosScreen(tokenStore: TokenStore, onBack: () -> Unit) {
    val contexto = com.paragon.shared.contextoPlataforma()
    val scope = rememberCoroutineScope()
    val api = remember { ApiClient.avisosApi(tokenStore) }
    var estado by remember { mutableStateOf<PreferenciasAvisosDto?>(null) }
    var errorCarga by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            estado = api.preferencias()
        } catch (e: CancellationException) {
            throw e
        } catch (_: Exception) {
            errorCarga = true
        }
    }

    // Pinta el cambio al momento y lo manda; si el servidor dice que no, se deshace.
    fun guardar(nuevo: PreferenciasAvisosDto, cambios: GuardarPreferenciasAvisos) {
        val antes = estado
        estado = nuevo
        error = null
        scope.launch {
            try {
                estado = api.guardarPreferencias(cambios)
            } catch (e: CancellationException) {
                throw e
            } catch (e: HttpException) {
                estado = antes
                error = e.paragonErrorMessage() ?: Textos.t(T.error_red)
            } catch (_: Exception) {
                estado = antes
                error = Textos.t(T.error_red)
            }
        }
    }

    Column(Modifier.fillMaxSize().background(Background)) {
        CabeceraNativa(titulo = Textos.t(T.ajustes_avisos_fila), atras = Textos.t(T.nav_ajustes), onBack = onBack)
        val actual = estado
        when {
            errorCarga -> Text(Textos.t(T.error_red), color = Muted, fontSize = 14.sp, modifier = Modifier.padding(32.dp))
            actual == null -> com.paragon.app.ui.common.EsqueletoTarjetas()
            else -> Column(
                Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = huecoBarra() + 24.dp),
            ) {
                GrupoNativo {
                    FilaNativa(
                        icono = Icons.Default.NotificationsActive,
                        titulo = Textos.t(T.avisos_pref_sistema),
                        subtitulo = Textos.t(T.avisos_pref_sistema_sub),
                        onClick = { abrirAjustesNotificaciones(contexto) },
                    )
                }

                Spacer(Modifier.height(24.dp))
                GrupoNativo(titulo = Textos.t(T.avisos_pref_titulo)) {
                    actual.categorias.forEachIndexed { i, cat ->
                        if (i > 0) SeparadorFila(conIcono = false)
                        FilaInterruptor(titulo = nombreCategoria(cat.clave), activo = cat.activa) { activa ->
                            val categorias = actual.categorias.map { if (it.clave == cat.clave) it.copy(activa = activa) else it }
                            guardar(
                                actual.copy(categorias = categorias),
                                GuardarPreferenciasAvisos(activas = categorias.filter { it.activa }.map { it.clave }),
                            )
                        }
                    }
                }
                Text(
                    Textos.t(T.avisos_pref_sub),
                    color = Muted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 8.dp),
                )

                Spacer(Modifier.height(24.dp))
                GrupoNativo(titulo = "Discord") {
                    FilaInterruptor(
                        titulo = Textos.t(T.avisos_pref_discord),
                        subtitulo = Textos.t(if (actual.discord.vinculado) T.avisos_pref_discord_sub else T.avisos_pref_discord_sin),
                        activo = actual.discord.activo,
                        habilitado = actual.discord.vinculado,
                    ) { activo ->
                        guardar(actual.copy(discord = actual.discord.copy(activo = activo)), GuardarPreferenciasAvisos(discordDm = activo))
                    }
                }

                error?.let { Text(it, color = Danger, fontSize = 13.sp, modifier = Modifier.padding(16.dp)) }
            }
        }
    }
}

@Composable
private fun FilaInterruptor(
    titulo: String,
    activo: Boolean,
    subtitulo: String? = null,
    habilitado: Boolean = true,
    onCambio: (Boolean) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 12.dp, top = 8.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f).padding(end = 12.dp)) {
            Text(titulo, color = if (habilitado) Foreground else Muted, fontSize = 15.sp, fontWeight = FontWeight.Medium, lineHeight = 19.sp)
            if (subtitulo != null) {
                Text(subtitulo, color = Muted, fontSize = 12.sp, lineHeight = 16.sp, modifier = Modifier.padding(top = 2.dp))
            }
        }
        Switch(
            checked = activo,
            onCheckedChange = onCambio,
            enabled = habilitado,
            colors = SwitchDefaults.colors(checkedThumbColor = OnAccent, checkedTrackColor = Accent),
        )
    }
}

/** El texto de cada categoría; una clave nueva del servidor sale tal cual hasta que la app la conozca. */
private fun nombreCategoria(clave: String): String = when (clave) {
    "trofeos" -> Textos.t(T.aviso_cat_trofeos)
    "perdibles" -> Textos.t(T.aviso_cat_perdibles)
    "lanzamientos" -> Textos.t(T.aviso_cat_lanzamientos)
    "precios" -> Textos.t(T.aviso_cat_precios)
    "ligas" -> Textos.t(T.aviso_cat_ligas)
    "social" -> Textos.t(T.aviso_cat_social)
    "amigos" -> Textos.t(T.aviso_cat_amigos)
    "resumen" -> Textos.t(T.aviso_cat_resumen)
    else -> clave
}
