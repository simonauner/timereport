/*
 * What the month view shows: each workday's time, how it compares to the
 * target, and the month's totals.
 *
 * A day without times counts as the target, so the totals are a forecast for
 * the whole month until every day is filled in. A day marked as off has no
 * target.
 */

package se.hackskaduha.timereport.core

import java.time.LocalDate
import java.time.YearMonth

enum class DayStatus {
    /** Every pass with a time has both its times. */
    Reported,

    /**
     * A pass has a start but no end yet, or it's today and the day hasn't
     * reached its target, like at lunch.
     */
    Open,

    /** No times yet. */
    Forecast,

    /** Marked as off. */
    Off,
}

data class DayReport(
    val date: LocalDate,
    val week: Int,
    val holiday: String?,
    val status: DayStatus,
    /** Minutes in passes with both times. */
    val worked: Int,
    /** Minutes counted in the totals: what's worked, or the target if unknown. */
    val counted: Int,
    val target: Int,
    /** Worked minus target, once the day is reported. */
    val diff: Int,
    /** The sum of the diffs up to and including this day, in a month report. */
    val flex: Int,
    val overMax: Boolean,
    /** Ids of passes whose end is before their start. */
    val invalid: List<String>,
)

fun dayReport(
    data: UserData,
    settings: Settings,
    passes: List<Pass>,
    date: LocalDate,
    today: LocalDate,
): DayReport {
    var worked = 0
    var open = false
    var hasTimes = false
    val invalid = mutableListOf<String>()
    for (pass in passes) {
        val start = data.textOf(timeKey(date, pass.id, Edge.Start))
        val end = data.textOf(timeKey(date, pass.id, Edge.End))
        if (start != null || end != null) hasTimes = true
        if (start != null && end != null) {
            val minutes = toMinutes(end) - toMinutes(start)
            if (minutes > 0) worked += minutes else invalid += pass.id
        } else if (start != null || end != null) {
            open = true
        }
    }

    val off = data[offKey(date)]?.value == value(1)
    val target = if (off || date.isWeekend()) 0 else settings.target
    // Today isn't over until it reaches its target, so a morning that's done
    // doesn't count as a short day.
    val status =
        when {
            off -> DayStatus.Off
            !hasTimes -> DayStatus.Forecast
            open || (date == today && worked < target) -> DayStatus.Open
            else -> DayStatus.Reported
        }
    val counted =
        when (status) {
            DayStatus.Forecast -> target
            DayStatus.Open -> maxOf(worked, target)
            else -> worked
        }

    return DayReport(
        date = date,
        week = date.weekNumber(),
        holiday = date.holiday(),
        status = status,
        worked = worked,
        counted = counted,
        target = target,
        diff = if (status == DayStatus.Reported || status == DayStatus.Off) worked - target else 0,
        flex = 0,
        overMax = worked > settings.max,
        invalid = invalid,
    )
}

/**
 * Flex from every day before a month, for when it carries over. Keys with
 * dates that don't exist, which no device writes, are left out.
 */
private fun flexBefore(
    data: UserData,
    settings: Settings,
    passes: List<Pass>,
    month: YearMonth,
    today: LocalDate,
): Int {
    val dates =
        data.keys
            .filter { it.startsWith("t:") || it.startsWith("x:") }
            .mapNotNullTo(mutableSetOf()) { dateOrNull(it.substring(2, 12)) }
            .filter { YearMonth.from(it) < month }
    return dates.sumOf { dayReport(data, settings, passes, it, today).diff }
}

data class Minutes(val counted: Int, val target: Int, val max: Int)

/** Kronor excluding VAT. */
data class Revenue(val counted: Double, val target: Double, val max: Double)

data class MonthReport(
    val days: List<DayReport>,
    /** As forecast, targeted and at most invoiced. */
    val minutes: Minutes,
    /** Minutes in reported days so far. */
    val reported: Int,
    /** Flex carried over from earlier months. */
    val flexIn: Int,
    val flex: Int,
    /** Null without an hourly rate. */
    val revenue: Revenue?,
    /** Minutes counted on days before the first hourly rate. */
    val unpriced: Int,
    val overMax: Boolean,
)

fun monthReport(
    data: UserData,
    settings: Settings,
    passes: List<Pass>,
    month: YearMonth,
    today: LocalDate,
): MonthReport {
    val flexIn = if (settings.carryFlex) flexBefore(data, settings, passes, month, today) else 0
    var flex = flexIn
    var minutes = Minutes(0, 0, 0)
    var revenue = Revenue(0.0, 0.0, 0.0)
    var hasRate = false
    var unpriced = 0
    var reported = 0

    val days =
        month
            .days()
            .filterNot(LocalDate::isWeekend)
            .map { date ->
                val day = dayReport(data, settings, passes, date, today)
                flex += day.diff
                val max = if (day.target > 0) settings.max else 0
                minutes =
                    Minutes(
                        minutes.counted + day.counted,
                        minutes.target + day.target,
                        minutes.max + max,
                    )
                if (day.status == DayStatus.Reported || day.status == DayStatus.Off) {
                    reported += day.worked
                }
                val rate = settings.rateOn(date)
                if (rate != null) {
                    hasRate = true
                    revenue =
                        Revenue(
                            revenue.counted + day.counted / 60.0 * rate,
                            revenue.target + day.target / 60.0 * rate,
                            revenue.max + max / 60.0 * rate,
                        )
                } else {
                    unpriced += day.counted
                }
                day.copy(flex = flex)
            }

    return MonthReport(
        days = days,
        minutes = minutes,
        reported = reported,
        flexIn = flexIn,
        flex = flex,
        revenue = if (hasRate) revenue else null,
        unpriced = unpriced,
        overMax = minutes.counted > minutes.max,
    )
}

/** Minutes counted in a week, Monday to Friday, across months. */
fun weekMinutes(
    data: UserData,
    settings: Settings,
    passes: List<Pass>,
    date: LocalDate,
    today: LocalDate,
): Int {
    val monday = date.weekStart()
    return (0L..4L).sumOf { dayReport(data, settings, passes, monday.plusDays(it), today).counted }
}

fun withVat(amount: Double, settings: Settings) = amount * (1 + settings.vat / 100)
