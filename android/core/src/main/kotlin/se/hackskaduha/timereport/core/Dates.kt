/*
 * Days are LocalDates here and "YYYY-MM-DD" in keys, months YearMonths and
 * "YYYY-MM": as text, both sort in date order.
 */

package se.hackskaduha.timereport.core

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.temporal.IsoFields
import java.util.Locale

val SWEDISH: Locale = Locale.forLanguageTag("sv-SE")

fun LocalDate.isWeekend() = dayOfWeek >= DayOfWeek.SATURDAY

/** The ISO week number, which is what Swedish calendars show. */
fun LocalDate.weekNumber() = get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)

/** The Monday of the week a day is in. */
fun LocalDate.weekStart(): LocalDate = minusDays(dayOfWeek.value - 1L)

/** Every day of a month. */
fun YearMonth.days(): List<LocalDate> = (1..lengthOfMonth()).map(::atDay)

private val weekdayNames = listOf("mån", "tis", "ons", "tor", "fre", "lör", "sön")

fun LocalDate.weekdayName() = weekdayNames[dayOfWeek.value - 1]

private val monthFormat = DateTimeFormatter.ofPattern("LLLL yyyy", SWEDISH)

/** Like "oktober 2026". */
fun YearMonth.monthName(): String = format(monthFormat)

/** A date from a key, or null if it isn't a real one, like 2026-02-30. */
internal fun dateOrNull(text: String): LocalDate? =
    runCatching { LocalDate.parse(text) }.getOrNull()
