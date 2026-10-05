package com.paragon.shared.red

import kotlinx.serialization.Serializable
import io.ktor.client.call.body
import io.ktor.client.request.*
import io.ktor.http.encodeURLPathPart

@Serializable
data class UserProfileDto(
    val userId: String,
    val name: String,
    val handle: String,
    val image: String?,
    val level: Int,
    val platinos: Int,
    val trofeos: Int,
    val accounts: List<AccountDto>,
    val recentGames: List<RecentGameDto>
)

@Serializable
data class AccountDto(
    val platform: String,
    val username: String
)

@Serializable
data class RecentGameDto(
    val id: String,
    val title: String,
    val coverUrl: String,
    val percent: Int
)

class UsersApi internal constructor(private val c: ClienteParagon) {
    suspend fun getUserProfile(handle: String): UserProfileDto =
        c.http.get("api/mobile/users/${handle.encodeURLPathPart()}").body()
}
