package com.paragon.app.util

import com.paragon.shared.ContextoPlataforma

/**
 * Abre los ajustes de notificaciones de Paragon en el sistema (20 oct 2026,
 * Ajustes → Avisos): si el permiso está quitado, ninguna preferencia de
 * dentro de la app sirve de nada.
 */
expect fun abrirAjustesNotificaciones(contexto: ContextoPlataforma)
