/*
 * Swedish public holidays, and the eves most workplaces treat as one. They're
 * only pointed out: the user marks a day as off themselves.
 */

package se.hackskaduha.timereport.core

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.temporal.TemporalAdjusters
import java.util.concurrent.ConcurrentHashMap

/** Easter Sunday, by the anonymous Gregorian algorithm. */
private fun easter(year: Int): LocalDate {
    val a = year % 19
    val b = year / 100
    val c = year % 100
    val d = b / 4
    val e = b % 4
    val f = (b + 8) / 25
    val g = (b - f + 1) / 3
    val h = (19 * a + b - d - g + 15) % 30
    val i = c / 4
    val k = c % 4
    val l = (32 + 2 * e + 2 * i - h - k) % 7
    val m = (a + 11 * h + 22 * l) / 451
    val month = (h + l - 7 * m + 114) / 31
    val day = ((h + l - 7 * m + 114) % 31) + 1
    return LocalDate.of(year, month, day)
}

/** The Friday from 19 to 25 June. */
private fun midsummerEve(year: Int) =
    LocalDate.of(year, 6, 19).with(TemporalAdjusters.nextOrSame(DayOfWeek.FRIDAY))

private val cache = ConcurrentHashMap<Int, Map<LocalDate, String>>()

private fun holidaysOf(year: Int) =
    cache.getOrPut(year) {
        val easterSunday = easter(year)
        mapOf(
            LocalDate.of(year, 1, 1) to "Nyårsdagen",
            LocalDate.of(year, 1, 6) to "Trettondedag jul",
            easterSunday.minusDays(2) to "Långfredagen",
            easterSunday.plusDays(1) to "Annandag påsk",
            LocalDate.of(year, 5, 1) to "Första maj",
            easterSunday.plusDays(39) to "Kristi himmelsfärdsdag",
            LocalDate.of(year, 6, 6) to "Nationaldagen",
            midsummerEve(year) to "Midsommarafton",
            LocalDate.of(year, 12, 24) to "Julafton",
            LocalDate.of(year, 12, 25) to "Juldagen",
            LocalDate.of(year, 12, 26) to "Annandag jul",
            LocalDate.of(year, 12, 31) to "Nyårsafton",
        )
    }

/** The holiday a day is, if any. */
fun LocalDate.holiday(): String? = holidaysOf(year)[this]
