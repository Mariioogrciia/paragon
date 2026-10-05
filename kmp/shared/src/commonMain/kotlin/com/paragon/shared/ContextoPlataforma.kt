package com.paragon.shared

/**
 * El `Context` de Android en el código común: en Android es el mismo tipo
 * (`android.content.Context`), así que las pantallas siguen pasando el suyo;
 * en iOS no hace falta nada y se usa `ContextoIOS`.
 */
expect abstract class ContextoPlataforma
