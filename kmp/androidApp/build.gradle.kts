import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// La app Android. Fase 1 de MIGRACION.md: es la de android/app trasladada tal
// cual (sin Capacitor); el código va pasando poco a poco a :shared.
plugins {
    id("com.android.application")
    kotlin("plugin.compose")
    id("com.google.devtools.ksp")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.paragon.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "com.paragon.app"
        minSdk = 24
        targetSdk = 36
        // Subir en cada APK que se reparta (Android no instala encima una con
        // el mismo versionCode desde una tienda).
        versionCode = 2
        versionName = "1.1"
    }

    buildTypes {
        release {
            // R8: APK más pequeña y más rápida. Reglas propias en proguard-rules.pro.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    buildFeatures {
        compose = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_21
        targetCompatibility = JavaVersion.VERSION_21
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_21) }
}

dependencies {
    implementation(project(":shared"))

    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.core:core-splashscreen:1.2.0")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.4")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.navigation:navigation-compose:2.9.5")

    // Misma numeración que Compose Multiplatform 1.12.1 (foundation/ui 1.12.1).
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("io.coil-kt.coil3:coil-compose:3.6.3")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.6.3")
    implementation("androidx.palette:palette-ktx:1.0.0")

    implementation("androidx.glance:glance-appwidget:1.1.1")

    implementation("androidx.room:room-runtime:2.8.5")
    implementation("androidx.room:room-ktx:2.8.5")
    ksp("androidx.room:room-compiler:2.8.5")

    implementation("androidx.work:work-runtime-ktx:2.10.5")

    // Red: pasa a Ktor en :shared en la fase 2.
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.11.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.1")

    // Custom Tabs para el login (ver ComposeMainActivity.kt).
    implementation("androidx.browser:browser:1.8.0")

    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging")
}
