package com.paragon.app.ui.game

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
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
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.auth.TokenStore
import com.paragon.app.data.network.ApiClient
import com.paragon.app.ui.theme.*
import com.paragon.shared.i18n.T
import com.paragon.shared.i18n.Textos
import com.paragon.shared.red.ColeccionablesDto
import com.paragon.shared.red.GuardarColeccionablesRequest
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

/**
 * Lista de coleccionables de un trofeo con casillas (como
 * ChecklistColeccionables.tsx en la web, 6 nov 2026). Los nombres se pegan de
 * una guía o se toman de la lista que ya pegó otra persona; sin nombres,
 * casillas numeradas. Cada casilla mueve el contador del trofeo
 * (`onCambio(marcados, total)`), igual que en la web.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ColeccionablesSheet(
    gameId: String,
    trophyId: String,
    trophyName: String,
    /** Las casillas que salen sin nombres: lo que pide el texto del trofeo. */
    total: Int,
    tokenStore: TokenStore,
    onCambio: (marcados: Int, total: Int) -> Unit,
    onDismiss: () -> Unit,
) {
    val api = remember(tokenStore) { ApiClient.gamesApi(tokenStore) }
    val scope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var datos by remember { mutableStateOf<ColeccionablesDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var pegando by remember { mutableStateOf(false) }
    var texto by remember { mutableStateOf("") }
    var soloPendientes by remember { mutableStateOf(false) }
    var guardando by remember { mutableStateOf(false) }

    LaunchedEffect(gameId, trophyId) {
        datos = try {
            api.getColeccionables(gameId, trophyId)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            error = Textos.t(T.error_conexion)
            ColeccionablesDto()
        }
    }

    fun guardar(cuerpo: GuardarColeccionablesRequest) {
        guardando = true
        scope.launch {
            try {
                val r = api.guardarColeccionables(gameId, trophyId, cuerpo)
                datos = (datos ?: ColeccionablesDto()).copy(nombres = r.nombres, marcados = r.marcados)
                onCambio(r.marcados.size, r.total)
                pegando = false
                texto = ""
                error = null
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                error = Textos.t(T.error_conexion)
            }
            guardando = false
        }
    }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState, containerColor = SurfaceSolida) {
        Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp).padding(bottom = 32.dp)) {
            Text(Textos.t(T.colec_boton), color = Foreground, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            Text(trophyName, color = Muted, fontSize = 13.sp, modifier = Modifier.padding(top = 2.dp, bottom = 12.dp))

            val d = datos
            if (d == null) {
                Box(Modifier.fillMaxWidth().height(120.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = Accent) }
                return@Column
            }
            val casillas = if (d.nombres.isNotEmpty()) d.nombres.size else total
            val marcados = d.marcados.toSet()

            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { pegando = !pegando }) {
                    Text(Textos.t(if (d.nombres.isNotEmpty()) T.colec_cambiar_lista else T.colec_pegar_lista), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
                Row(Modifier.weight(1f), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically) {
                    Text(Textos.t(T.colec_solo_pendientes), color = Muted, fontSize = 12.sp)
                    Switch(
                        checked = soloPendientes,
                        onCheckedChange = { soloPendientes = it },
                        colors = SwitchDefaults.colors(checkedTrackColor = Accent),
                        modifier = Modifier.padding(start = 6.dp),
                    )
                }
            }
            if (d.nombres.isEmpty() && d.comunidad.isNotEmpty()) {
                TextButton(enabled = !guardando, onClick = { guardar(GuardarColeccionablesRequest(nombres = d.comunidad, marcados = emptyList(), total = total)) }) {
                    Text(Textos.t(T.colec_usar_comunidad, d.comunidad.size), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }
            }

            if (pegando) {
                Text(Textos.t(T.colec_ayuda_pegar), color = Muted, fontSize = 12.sp, lineHeight = 17.sp, modifier = Modifier.padding(vertical = 6.dp))
                OutlinedTextField(
                    value = texto,
                    onValueChange = { if (it.length <= 40_000) texto = it },
                    placeholder = { Text("1. …\n2. …", color = Muted, fontSize = 13.sp) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 120.dp, max = 220.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Accent,
                        unfocusedBorderColor = Border,
                        focusedTextColor = Foreground,
                        unfocusedTextColor = Foreground,
                    ),
                )
                Row {
                    TextButton(enabled = !guardando && texto.isNotBlank(), onClick = { guardar(GuardarColeccionablesRequest(textoPegado = texto, marcados = emptyList(), total = total)) }) {
                        Text(Textos.t(T.colec_guardar_lista), color = Accent, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                    if (d.nombres.isNotEmpty()) TextButton(enabled = !guardando, onClick = {
                        guardando = true
                        scope.launch {
                            try {
                                api.quitarColeccionables(gameId, trophyId)
                                datos = d.copy(nombres = emptyList(), marcados = emptyList())
                                onCambio(0, total)
                                pegando = false
                            } catch (e: CancellationException) {
                                throw e
                            } catch (e: Exception) {
                                error = Textos.t(T.error_conexion)
                            }
                            guardando = false
                        }
                    }) {
                        Text(Textos.t(T.colec_quitar), color = Danger, fontSize = 13.sp)
                    }
                }
            }

            error?.let { Text(it, color = Danger, fontSize = 12.sp, modifier = Modifier.padding(vertical = 6.dp)) }

            val indices = (0 until casillas).filter { !soloPendientes || it !in marcados }
            if (indices.isEmpty()) {
                Text(Textos.t(T.colec_todos_hechos), color = Good, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(vertical = 16.dp))
            } else {
                LazyColumn(Modifier.fillMaxWidth().heightIn(max = 420.dp).padding(top = 6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(indices, key = { it }) { i ->
                        val hecho = i in marcados
                        Row(
                            Modifier.fillMaxWidth()
                                .background(if (hecho) AccentSoft else Surface2, RoundedCornerShape(radio(10)))
                                .border(1.dp, Border, RoundedCornerShape(radio(10)))
                                .clickable(enabled = !guardando) {
                                    val nuevo = if (hecho) d.marcados - i else (d.marcados + i).sorted()
                                    // Se ve marcado al momento; si falla, `guardar` lo dice.
                                    datos = d.copy(marcados = nuevo)
                                    onCambio(nuevo.size, casillas)
                                    guardar(GuardarColeccionablesRequest(nombres = d.nombres, marcados = nuevo, total = casillas))
                                }
                                .padding(horizontal = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(checked = hecho, onCheckedChange = null, colors = CheckboxDefaults.colors(checkedColor = Accent))
                            Text(
                                d.nombres.getOrNull(i) ?: Textos.t(T.colec_numero, i + 1),
                                color = if (hecho) Muted else Foreground,
                                fontSize = 14.sp,
                                textDecoration = if (hecho) TextDecoration.LineThrough else null,
                                maxLines = 2,
                            )
                        }
                    }
                }
            }
        }
    }
}
