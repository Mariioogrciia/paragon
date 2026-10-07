package com.paragon.app.data

/**
 * Rangos de clan — las MISMAS reglas que la web (src/lib/clanRangos.ts): la
 * app solo enseña lo que tu rango permite y el servidor lo vuelve a
 * comprobar. "admin" es un valor antiguo que cuenta como colíder.
 *
 *   Líder (owner)  todo: ascender/degradar, expulsar y pasar el liderazgo.
 *   Colíder        editar nombre, descripción y escudo; invitar; expulsar y
 *                  mover entre veterano y miembro.
 *   Veterano       invitar.
 *   Miembro        nada de gestión.
 */
object ClanRangos {
    val TODOS = listOf("owner", "colider", "veterano", "member")

    fun normalizar(role: String?): String = when (role) {
        "admin" -> "colider"
        in TODOS -> role!!
        else -> "member"
    }

    fun nivel(role: String?): Int = when (normalizar(role)) {
        "owner" -> 3
        "colider" -> 2
        "veterano" -> 1
        else -> 0
    }

    fun puedeEditar(role: String?) = nivel(role) >= 2
    fun puedeInvitar(role: String?) = nivel(role) >= 1
    fun puedeExpulsar(actor: String?, objetivo: String?) = nivel(actor) >= 2 && nivel(actor) > nivel(objetivo)

    fun puedeCambiar(actor: String?, objetivo: String?, nuevo: String): Boolean {
        val a = nivel(actor)
        if (a <= nivel(objetivo) || normalizar(objetivo) == nuevo) return false
        return when (a) {
            3 -> true
            2 -> nuevo == "veterano" || nuevo == "member"
            else -> false
        }
    }
}
