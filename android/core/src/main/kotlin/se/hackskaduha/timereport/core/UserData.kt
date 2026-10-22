/*
 * Everything the user has entered: times, days off, passes and settings.
 * The same keys and values as the web app's src/lib/userData.ts, so the two
 * sync with each other.
 *
 * Every value is stored under its own key together with when it was set, and
 * the latest change to a key wins. That makes two copies, e.g. from two
 * devices, safe to merge in any order without losing changes to different
 * days or fields.
 *
 * Keys:
 * - `t:<date>/<pass>/start` and `t:<date>/<pass>/end` are the times of a
 *   pass on a day, like "08:10".
 * - `x:<date>` is 1 when the day is marked as off.
 * - `p:<pass>/name` is a pass's name, `p:<pass>/pos` where it goes among
 *   the others, and `p:<pass>/off` is 1 once it has been removed
 *   (Passes.kt). `p:<pass>/start` and `p:<pass>/end` are its column
 *   headings from before passes had names.
 * - `r:<date>` is the hourly rate in kronor from that day on.
 * - `o:target` and `o:max` are minutes per day, `o:vat` is a percentage,
 *   `o:carryFlex` is 1 when flex carries over from one month to the next, and
 *   `o:punchRound` is the minutes the punch clock rounds to (Settings.kt).
 */

package se.hackskaduha.timereport.core

import java.time.LocalDate
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.doubleOrNull

/** A stored value. JSON has one kind of number, and so does this. */
sealed interface Value {
    data class Text(val text: String) : Value

    data class Number(val number: Double) : Value
}

fun value(text: String): Value = Value.Text(text)

fun value(number: Double): Value = Value.Number(number)

fun value(number: Int): Value = Value.Number(number.toDouble())

/** A value and when it was set (ms since epoch). A null value was cleared. */
data class Stamped(val value: Value?, val updatedAt: Long)

typealias UserData = Map<String, Stamped>

enum class Edge(val key: String) {
    Start("start"),
    End("end"),
}

fun timeKey(date: LocalDate, pass: String, edge: Edge) = "t:$date/$pass/${edge.key}"

fun offKey(date: LocalDate) = "x:$date"

enum class PassField(val key: String) {
    Name("name"),
    Start("start"),
    End("end"),
    Pos("pos"),
    Off("off"),
}

fun passKey(pass: String, field: PassField) = "p:$pass/${field.key}"

fun rateKey(date: LocalDate) = "r:$date"

enum class Option(val key: String) {
    Target("target"),
    Max("max"),
    Vat("vat"),
    CarryFlex("carryFlex"),
    PunchRound("punchRound"),
}

fun optionKey(option: Option) = "o:${option.key}"

const val MAX_LABEL_LENGTH = 40

private const val DATE = """[0-9]{4}-[0-9]{2}-[0-9]{2}"""
private const val PASS = "[a-z0-9]{1,12}"

private val TIME = Regex("""([01][0-9]|2[0-3]):[0-5][0-9]""")

private val KEY_PATTERN =
    Regex(
        listOf(
                "t:$DATE/$PASS/(start|end)",
                "x:$DATE",
                "p:$PASS/(name|start|end|pos|off)",
                "r:$DATE",
                "o:(target|max|vat|carryFlex|punchRound)",
            )
            .joinToString("|")
    )

private fun isLabel(value: Value) =
    value is Value.Text &&
        value.text == value.text.trimJs() &&
        value.text.isNotEmpty() &&
        value.text.length <= MAX_LABEL_LENGTH

private fun isAmount(value: Value, max: Double) =
    value is Value.Number && value.number.isFinite() && value.number >= 0 && value.number <= max

private fun isInteger(value: Value) =
    value is Value.Number && value.number.isFinite() && value.number == Math.floor(value.number)

private fun isFlag(value: Value) = value == Value.Number(0.0) || value == Value.Number(1.0)

private fun isValue(key: String, value: Value): Boolean {
    if (key.startsWith("t:")) return value is Value.Text && TIME.matches(value.text)
    if (key.startsWith("x:") || key == "o:carryFlex") return isFlag(value)
    if (key.startsWith("p:")) {
        if (key.endsWith("/pos")) return isInteger(value)
        if (key.endsWith("/off")) return isFlag(value)
        return isLabel(value)
    }
    if (key.startsWith("r:")) return isAmount(value, 1_000_000.0)
    if (key == "o:vat") return isAmount(value, 100.0)
    if (key == "o:punchRound") {
        return isInteger(value) && isAmount(value, 60.0) && value != Value.Number(0.0)
    }
    // o:target and o:max, in minutes.
    return isInteger(value) && isAmount(value, 24.0 * 60)
}

private fun valueOf(json: JsonElement): Result<Value?> =
    when {
        json is JsonNull -> Result.success(null)
        json !is JsonPrimitive -> Result.failure(IllegalArgumentException())
        json.isString -> Result.success(Value.Text(json.content))
        // true and false aren't numbers, and no key takes them.
        else ->
            json.doubleOrNull?.let { Result.success(Value.Number(it)) }
                ?: Result.failure(IllegalArgumentException())
    }

/**
 * A stamp in whole milliseconds. Devices only ever write whole ones, so an
 * entry with a fraction is dropped like other malformed ones.
 */
private fun updatedAtOf(json: JsonElement): Long? {
    val number = (json as? JsonPrimitive)?.takeUnless { it.isString }?.doubleOrNull
    return number?.takeIf { it.isFinite() && it == Math.floor(it) }?.toLong()
}

private fun stampedOf(key: String, json: JsonElement): Stamped? {
    if (json !is JsonArray || json.size != 2) return null
    val updatedAt = updatedAtOf(json[1]) ?: return null
    val value = valueOf(json[0]).getOrElse { return null }
    if (value != null && !isValue(key, value)) return null
    return Stamped(value, updatedAt)
}

/** Keeps the well-formed entries of untrusted data, e.g. from the sync server. */
fun sanitize(input: JsonElement): UserData {
    if (input !is JsonObject) return emptyMap()
    return buildMap {
        for ((key, json) in input) {
            if (!KEY_PATTERN.matches(key)) continue
            stampedOf(key, json)?.let { put(key, it) }
        }
    }
}

private fun Value?.toJson(): JsonElement =
    when (this) {
        null -> JsonNull
        is Value.Text -> JsonPrimitive(text)
        // Whole numbers without ".0", as JavaScript writes them.
        is Value.Number ->
            if (number == Math.floor(number) && Math.abs(number) < 1e15) {
                JsonPrimitive(number.toLong())
            } else {
                JsonPrimitive(number)
            }
    }

fun UserData.toJson() = JsonObject(mapValues { (_, stamped) ->
    JsonArray(listOf(stamped.value.toJson(), JsonPrimitive(stamped.updatedAt)))
})

data class Merged(val merged: UserData, val changed: Int)

/** Merges `incoming` into `current`. The latest change to each key wins. */
fun merge(current: UserData, incoming: UserData): Merged {
    val merged = current.toMutableMap()
    var changed = 0
    for ((key, stamped) in incoming) {
        val existing = merged[key]
        if (existing == null || stamped.updatedAt > existing.updatedAt) {
            if (existing == null || existing.value != stamped.value) changed++
            merged[key] = stamped
        }
    }
    return Merged(merged, changed)
}

/** A stored text, or null if there's none. */
fun UserData.textOf(key: String) = (this[key]?.value as? Value.Text)?.text

/** A stored number, or null if there's none. */
fun UserData.numberOf(key: String) = (this[key]?.value as? Value.Number)?.number

/**
 * Trims what JavaScript's String.prototype.trim does, which is a little
 * different from Kotlin's trim().
 */
internal fun String.trimJs() = trim { it.isWhitespace() || it == '﻿' }
