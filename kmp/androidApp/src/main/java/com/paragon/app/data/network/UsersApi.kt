package com.paragon.app.data.network

import retrofit2.http.GET
import retrofit2.http.Path

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

data class AccountDto(
    val platform: String,
    val username: String
)

data class RecentGameDto(
    val id: String,
    val title: String,
    val coverUrl: String,
    val percent: Int
)

interface UsersApi {
    @GET("api/mobile/users/{handle}")
    suspend fun getUserProfile(@Path("handle") handle: String): UserProfileDto
}
