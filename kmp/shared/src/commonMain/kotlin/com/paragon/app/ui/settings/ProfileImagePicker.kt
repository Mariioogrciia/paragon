package com.paragon.app.ui.settings

import androidx.compose.runtime.Composable

@Composable
expect fun ProfileImagePicker(
    onImagePicked: (bytes: ByteArray, mimeType: String, extension: String) -> Unit,
    content: @Composable (onClick: () -> Unit) -> Unit
)
