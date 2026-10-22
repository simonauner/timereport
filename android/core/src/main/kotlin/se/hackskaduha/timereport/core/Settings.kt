package se.hackskaduha.timereport.core

import java.time.LocalDate

/** An hourly rate in kronor from a day on. */
data class Rate(val from: LocalDate, val rate: Double)

data class Settings(
    /** Minutes a day is expected to have. */
    val target: Int,
    /** Minutes a day can be invoiced at most. */
    val max: Int,
    /** VAT in percent. */
    val vat: Double,
    /** Whether flex carries over from one month to the next. */
    val carryFlex: Boolean,
    /** Minutes the punch clock rounds to, 1 for none. */
    val punchRound: Int,
    /** Hourly rates, earliest first. */
    val rates: List<Rate>,
) {
    companion object {
        const val DEFAULT_TARGET = 7 * 60
        const val DEFAULT_MAX = 8 * 60
        const val DEFAULT_VAT = 25.0
        const val DEFAULT_PUNCH_ROUND = 5
    }
}

fun settingsOf(data: UserData): Settings {
    val rates =
        data.mapNotNull { (key, stamped) ->
            val rate = (stamped.value as? Value.Number)?.number
            val from = if (key.startsWith("r:")) dateOrNull(key.removePrefix("r:")) else null
            if (rate != null && from != null) Rate(from, rate) else null
        }
    return Settings(
        target = data.numberOf(optionKey(Option.Target))?.toInt() ?: Settings.DEFAULT_TARGET,
        max = data.numberOf(optionKey(Option.Max))?.toInt() ?: Settings.DEFAULT_MAX,
        vat = data.numberOf(optionKey(Option.Vat)) ?: Settings.DEFAULT_VAT,
        carryFlex = data.numberOf(optionKey(Option.CarryFlex)) == 1.0,
        punchRound =
            data.numberOf(optionKey(Option.PunchRound))?.toInt() ?: Settings.DEFAULT_PUNCH_ROUND,
        rates = rates.sortedBy(Rate::from),
    )
}

/** The hourly rate on a day: the latest one from that day or before. */
fun Settings.rateOn(date: LocalDate) = rates.lastOrNull { it.from <= date }?.rate
