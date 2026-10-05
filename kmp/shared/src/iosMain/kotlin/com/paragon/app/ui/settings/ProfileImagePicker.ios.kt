package com.paragon.app.ui.settings

import androidx.compose.runtime.Composable

@Composable
actual fun ProfileImagePicker(
    onImagePicked: (bytes: ByteArray, mimeType: String, extension: String) -> Unit,
    content: @Composable (onClick: () -> Unit) -> Unit
) {
    // Placeholder para iOS (requiere UIImagePickerController)
    content {}
}
