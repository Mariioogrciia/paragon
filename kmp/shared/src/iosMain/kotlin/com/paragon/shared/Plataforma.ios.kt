package com.paragon.shared

import platform.UIKit.UIDevice

actual fun nombrePlataforma(): String =
    UIDevice.currentDevice.systemName + " " + UIDevice.currentDevice.systemVersion
