package com.paragon.app.ui.panel

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.paragon.app.data.TrophyCounts
import com.paragon.app.ui.theme.*

@Composable
fun TrophyCountRow(counts: TrophyCounts, summary: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Surface, RoundedCornerShape(20.dp))
            .border(1.dp, Border, RoundedCornerShape(20.dp))
            .padding(20.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            TrophyBadge(counts.platinum.toString(), Platinum)
            TrophyBadge(counts.gold.toString(), Gold)
            TrophyBadge(counts.silver.toString(), Silver)
            TrophyBadge(counts.bronze.toString(), Bronze)
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = summary,
            color = Muted,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.align(Alignment.CenterHorizontally)
        )
    }
}

@Composable
fun TrophyBadge(count: String, color: Color) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        // Pseudo icono de trofeo (un círculo coloreado por ahora)
        Box(
            modifier = Modifier
                .size(16.dp)
                .background(color, RoundedCornerShape(8.dp))
        )
        Text(
            text = count,
            color = Foreground,
            fontSize = 18.sp,
            fontWeight = FontWeight.Bold
        )
    }
}
