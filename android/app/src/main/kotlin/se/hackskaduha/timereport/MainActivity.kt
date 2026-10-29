package se.hackskaduha.timereport

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import java.time.YearMonth
import se.hackskaduha.timereport.core.UserData
import se.hackskaduha.timereport.core.formatDuration
import se.hackskaduha.timereport.core.monthName
import se.hackskaduha.timereport.core.monthReport
import se.hackskaduha.timereport.core.passesOf
import se.hackskaduha.timereport.core.settingsOf

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { App(data = emptyMap()) }
    }
}

/** For now only this month's forecast, until times are stored. */
@Composable
fun App(data: UserData, today: LocalDate = LocalDate.now()) {
    val colors = if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()
    MaterialTheme(colorScheme = colors) {
        Scaffold(modifier = Modifier.fillMaxSize()) { padding ->
            val month = YearMonth.from(today)
            val settings = settingsOf(data)
            val report = monthReport(data, settings, passesOf(data), month, today)
            Column(modifier = Modifier.padding(padding).padding(24.dp)) {
                Text(
                    text = month.monthName().replaceFirstChar(Char::uppercase),
                    style = MaterialTheme.typography.headlineMedium,
                )
                Text(
                    text = "Prognos ${formatDuration(report.minutes.counted)}",
                    style = MaterialTheme.typography.bodyLarge,
                )
            }
        }
    }
}

@Preview
@Composable
private fun AppPreview() {
    App(data = emptyMap(), today = LocalDate.of(2026, 10, 22))
}
