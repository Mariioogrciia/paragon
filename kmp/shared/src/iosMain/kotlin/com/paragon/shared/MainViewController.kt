package com.paragon.shared

import androidx.compose.ui.window.ComposeUIViewController
import platform.UIKit.UIViewController

/** Lo instancia `ContentView.swift` (como `MainViewControllerKt.MainViewController()`). */
@Suppress("FunctionName", "unused")
fun MainViewController(): UIViewController = ComposeUIViewController { App() }
