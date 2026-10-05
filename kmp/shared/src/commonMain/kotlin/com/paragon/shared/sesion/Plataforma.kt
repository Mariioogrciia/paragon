package com.paragon.shared.sesion

import com.paragon.shared.ContextoPlataforma

/**
 * La sesión del teléfono: en Android, las SharedPreferences "paragon_auth" de
 * siempre (excluidas de las copias de seguridad); en iOS, el Llavero.
 */
expect fun crearTokenStore(contexto: ContextoPlataforma): TokenStore

/**
 * Abre el login (o la vinculación) de Google/Discord en el navegador, con
 * una clave nueva de un solo uso (ver EnlaceSeguro). Vuelve a la app por
 * `paragon://auth?c=...`.
 */
expect fun abrirLoginEnNavegador(contexto: ContextoPlataforma, tokenStore: TokenStore, provider: String)
