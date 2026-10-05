package com.paragon.app.data

import com.paragon.shared.ContextoPlataforma
import kotlinx.coroutines.flow.Flow

expect object ConnectivityObserver {
    fun observe(context: ContextoPlataforma): Flow<Boolean>
}
