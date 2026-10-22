/*
 * Times of day ("08:10") and durations in minutes, and how they're typed and
 * shown. Times are kept as text, as they're stored.
 */

package se.hackskaduha.timereport.core

import java.math.RoundingMode
import java.text.NumberFormat
import java.time.LocalTime
import kotlin.math.abs
import kotlin.math.floor

/** Rounds like JavaScript's Math.round: halves go up, also below zero. */
internal fun roundJs(number: Double) = floor(number + 0.5)

private val CLOCK_TIME = Regex("""(\d{1,2})(?:[.:,](\d{2}))?(?:[.:]\d{2})?""")
private val FOUR_DIGITS = Regex("""(\d{1,2})(\d{2})""")

/**
 * A typed time of day as "HH:MM", or null if it isn't one. Takes what's quick
 * to type: "8", "810", "0810", "8.10", "8:10" or "8,10", and what
 * spreadsheets copy, like "13.15.00", whose seconds are dropped.
 */
fun parseTime(input: String): String? {
    val text = input.trimJs()
    val match = CLOCK_TIME.matchEntire(text) ?: FOUR_DIGITS.matchEntire(text) ?: return null
    val hours = match.groupValues[1].toInt()
    val minutes = match.groupValues[2].ifEmpty { "0" }.toInt()
    if (hours > 23 || minutes > 59) return null
    return clock(hours * 60 + minutes)
}

/** Minutes since midnight of a "HH:MM" time. */
fun toMinutes(time: String): Int {
    val (hours, minutes) = time.split(':').map(String::toInt)
    return hours * 60 + minutes
}

private fun Int.pad() = toString().padStart(2, '0')

private fun clock(minutes: Int) = "${(minutes / 60).pad()}:${(minutes % 60).pad()}"

/**
 * The current time as "HH:MM", rounded to the nearest `step` minutes. Never
 * rounds up past midnight.
 */
fun timeNow(now: LocalTime = LocalTime.now(), step: Int = 1): String {
    val exact = now.hour * 60 + now.minute + now.second / 60.0
    val rounded = roundJs(exact / step) * step
    return clock(
        if (rounded < 24 * 60) rounded.toInt() else (floor(exact / step) * step).toInt()
    )
}

/** A "HH:MM" time moved by some minutes, kept within the day. */
fun addMinutes(time: String, minutes: Int) =
    clock((toMinutes(time) + minutes).coerceIn(0, 24 * 60 - 1))

/** A duration like "8:00" or "169:35", with a sign if it's negative. */
fun formatDuration(minutes: Double, sign: Boolean = false): String {
    val whole = roundJs(abs(minutes)).toLong()
    val text = "${whole / 60}:${(whole % 60).toInt().pad()}"
    if (minutes < 0 && whole > 0) return "−$text"
    return if (sign && whole > 0) "+$text" else text
}

fun formatDuration(minutes: Int, sign: Boolean = false) =
    formatDuration(minutes.toDouble(), sign)

private val DURATION_CLOCK = Regex("""(\d{1,2})[:.](\d{2})""")
private val DURATION_HOURS = Regex("""\d{1,2}(,\d+)?""")

/**
 * A typed duration in minutes, or null if it isn't one: "7:30", "7.30",
 * "7,5" or "7" hours.
 */
fun parseDuration(input: String): Int? {
    val text = input.trimJs()
    DURATION_CLOCK.matchEntire(text)?.let { match ->
        val minutes = match.groupValues[2].toInt()
        return if (minutes < 60) match.groupValues[1].toInt() * 60 + minutes else null
    }
    if (!DURATION_HOURS.matches(text)) return null
    val hours = text.replace(',', '.').toDouble()
    return if (hours <= 24) roundJs(hours * 60).toInt() else null
}

// NumberFormat isn't thread-safe, so every call gets its own.
private fun decimal() =
    NumberFormat.getNumberInstance(SWEDISH).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
        roundingMode = RoundingMode.HALF_UP
    }

private fun kronor() =
    NumberFormat.getCurrencyInstance(SWEDISH).apply {
        maximumFractionDigits = 0
        roundingMode = RoundingMode.HALF_UP
    }

/** Hours with decimals, like "169,58", as invoiced. */
fun formatHours(minutes: Int): String = decimal().format(minutes / 60.0)

/** Like "139 550 kr". */
fun formatKronor(amount: Double): String = kronor().format(amount)
