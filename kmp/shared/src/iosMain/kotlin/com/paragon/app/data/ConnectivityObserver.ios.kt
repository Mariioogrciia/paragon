package com.paragon.app.data

import com.paragon.shared.ContextoPlataforma
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.distinctUntilChanged
import platform.Network.NWPath
import platform.Network.NWPathMonitorCreate
import platform.Network.NWPathMonitorSetQueue
import platform.Network.NWPathMonitorSetUpdateHandler
import platform.Network.NWPathMonitorStart
import platform.Network.NWPathMonitorCancel
import platform.Network.nw_path_get_status
import platform.Network.nw_path_monitor_t
import platform.Network.nw_path_status_satisfied
import platform.darwin.dispatch_get_main_queue

actual object ConnectivityObserver {
    actual fun observe(context: ContextoPlataforma): Flow<Boolean> = callbackFlow {
        val monitor: nw_path_monitor_t = NWPathMonitorCreate()
        
        NWPathMonitorSetUpdateHandler(monitor) { path: NWPath? ->
            val isOnline = path != null && nw_path_get_status(path) == nw_path_status_satisfied
            trySend(isOnline)
        }
        
        NWPathMonitorSetQueue(monitor, dispatch_get_main_queue())
        NWPathMonitorStart(monitor)
        
        awaitClose {
            NWPathMonitorCancel(monitor)
        }
    }.distinctUntilChanged()
}
