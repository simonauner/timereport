package se.hackskaduha.timereport.core

import java.io.File
import java.time.LocalDate
import java.time.YearMonth
import kotlin.math.abs
import kotlin.math.max
import kotlin.test.fail
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.jupiter.api.DynamicTest
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestFactory

/**
 * The cases in fixtures/ at the root of the repository, whose expected
 * results come from the web app (src/lib/fixtures.test.ts). Each case ends
 * with what's expected.
 */
class FixturesTest {
    private val fixtures = File(System.getProperty("fixtures"))

    private fun read(name: String) = Json.parseToJsonElement(File(fixtures, name).readText()).jsonObject

    private fun cases(fixture: JsonObject, name: String) =
        fixture.getValue(name).jsonArray.map { it.jsonArray }

    /** Checks every case, and reports every case that differs. */
    private fun check(fixture: JsonObject, name: String, run: (List<JsonElement>) -> JsonElement) {
        val failures =
            cases(fixture, name).mapNotNull { case ->
                val actual = run(case.dropLast(1))
                val expected = case.last()
                if (same(expected, actual)) null
                else "$name${case.dropLast(1)}: expected $expected, got $actual"
            }
        if (failures.isNotEmpty()) fail(failures.joinToString("\n"))
    }

    @Test
    fun userData() {
        val fixture = read("userData.json")
        val failures = mutableListOf<String>()
        for (case in fixture.getValue("sanitize").jsonArray.map { it.jsonObject }) {
            val actual = sanitize(case.getValue("input")).toJson()
            if (!same(case.getValue("expected"), actual)) {
                failures += "sanitize ${case["name"]}: expected ${case["expected"]}, got $actual"
            }
        }
        for (case in fixture.getValue("merge").jsonArray.map { it.jsonObject }) {
            val (merged, changed) =
                merge(sanitize(case.getValue("current")), sanitize(case.getValue("incoming")))
            val actual = JsonObject(mapOf("merged" to merged.toJson(), "changed" to JsonPrimitive(changed)))
            if (!same(case.getValue("expected"), actual)) {
                failures += "merge ${case["name"]}: expected ${case["expected"]}, got $actual"
            }
        }
        if (failures.isNotEmpty()) fail(failures.joinToString("\n"))
    }

    @Test
    fun time() {
        val fixture = read("time.json")
        check(fixture, "parseTime") { (input) -> JsonPrimitive(parseTime(input.text)) }
        check(fixture, "parseDuration") { (input) -> JsonPrimitive(parseDuration(input.text)) }
        check(fixture, "formatDuration") { (minutes, sign) ->
            JsonPrimitive(formatDuration(minutes.jsonPrimitive.double, sign.jsonPrimitive.boolean))
        }
        check(fixture, "addMinutes") { (time, minutes) ->
            JsonPrimitive(addMinutes(time.text, minutes.jsonPrimitive.int))
        }
        check(fixture, "formatHours") { (minutes) -> JsonPrimitive(formatHours(minutes.jsonPrimitive.int)) }
        check(fixture, "formatKronor") { (amount) ->
            JsonPrimitive(formatKronor(amount.jsonPrimitive.double))
        }
    }

    @Test
    fun dates() {
        val fixture = read("dates.json")
        check(fixture, "weekNumber") { (date) -> JsonPrimitive(date.date.weekNumber()) }
        check(fixture, "weekStart") { (date) -> JsonPrimitive(date.date.weekStart().toString()) }
        check(fixture, "addMonths") { (month, months) ->
            JsonPrimitive(YearMonth.parse(month.text).plusMonths(months.jsonPrimitive.int.toLong()).toString())
        }
        check(fixture, "holidays") { (year) ->
            val start = LocalDate.of(year.jsonPrimitive.int, 1, 1)
            val days = generateSequence(start) { it.plusDays(1) }.takeWhile { it.year == start.year }
            JsonArray(
                days.mapNotNull { day ->
                    day.holiday()?.let { JsonArray(listOf(JsonPrimitive(day.toString()), JsonPrimitive(it))) }
                }.toList()
            )
        }
    }

    @TestFactory
    fun reports() =
        File(fixtures, "reports").listFiles()!!.sorted().map { file ->
            DynamicTest.dynamicTest(file.name) {
                val fixture = read("reports/${file.name}")
                val data = sanitize(fixture.getValue("data"))
                val today = fixture.getValue("today").date
                val settings = settingsOf(data)
                val passes = passesOf(data)
                val month = monthReport(data, settings, passes, YearMonth.parse(fixture.getValue("month").text), today)
                val actual =
                    JsonObject(
                        mapOf(
                            "settings" to settings.toJson(),
                            "passes" to JsonArray(passes.map { it.toJson() }),
                            "month" to month.toJson(),
                            "week" to JsonPrimitive(weekMinutes(data, settings, passes, today, today)),
                        )
                    )
                val expected = fixture.getValue("expected")
                if (!same(expected, actual)) {
                    fail(differences(expected, actual, "expected").joinToString("\n"))
                }
            }
        }
}

private val JsonElement.text
    get() = jsonPrimitive.content

private val JsonElement.date: LocalDate
    get() = LocalDate.parse(text)

/** Equal JSON, with numbers equal when they're near enough. */
private fun same(expected: JsonElement, actual: JsonElement) = differences(expected, actual, "").isEmpty()

private fun differences(expected: JsonElement, actual: JsonElement, path: String): List<String> {
    fun differ() = listOf("$path: expected $expected, got $actual")
    return when {
        expected is JsonObject && actual is JsonObject ->
            if (expected.keys != actual.keys) differ()
            else expected.keys.flatMap { differences(expected.getValue(it), actual.getValue(it), "$path.$it") }
        expected is JsonArray && actual is JsonArray ->
            if (expected.size != actual.size) differ()
            else expected.indices.flatMap { differences(expected[it], actual[it], "$path[$it]") }
        expected is JsonNull || actual is JsonNull -> if (expected == actual) emptyList() else differ()
        expected is JsonPrimitive && actual is JsonPrimitive -> {
            val a = expected.content.toDoubleOrNull().takeUnless { expected.isString }
            val b = actual.content.toDoubleOrNull().takeUnless { actual.isString }
            when {
                a != null && b != null -> if (abs(a - b) <= 1e-9 * max(1.0, abs(a))) emptyList() else differ()
                expected.isString == actual.isString && expected.content == actual.content -> emptyList()
                else -> differ()
            }
        }
        else -> differ()
    }
}

private fun Settings.toJson() =
    JsonObject(
        mapOf(
            "target" to JsonPrimitive(target),
            "max" to JsonPrimitive(max),
            "vat" to JsonPrimitive(vat),
            "carryFlex" to JsonPrimitive(carryFlex),
            "punchRound" to JsonPrimitive(punchRound),
            "rates" to
                JsonArray(
                    rates.map {
                        JsonObject(mapOf("from" to JsonPrimitive(it.from.toString()), "rate" to JsonPrimitive(it.rate)))
                    }
                ),
        )
    )

private fun Pass.toJson() =
    JsonObject(
        mapOf(
            "id" to JsonPrimitive(id),
            "name" to JsonPrimitive(name),
            "pos" to JsonPrimitive(pos),
            "headings" to
                (headings?.let {
                    JsonObject(mapOf("start" to JsonPrimitive(it.start), "end" to JsonPrimitive(it.end)))
                } ?: JsonNull),
        )
    )

private fun DayReport.toJson() =
    JsonObject(
        mapOf(
            "date" to JsonPrimitive(date.toString()),
            "week" to JsonPrimitive(week),
            "holiday" to JsonPrimitive(holiday),
            "status" to JsonPrimitive(status.name.lowercase()),
            "worked" to JsonPrimitive(worked),
            "counted" to JsonPrimitive(counted),
            "target" to JsonPrimitive(target),
            "diff" to JsonPrimitive(diff),
            "overMax" to JsonPrimitive(overMax),
            "invalid" to JsonArray(invalid.map(::JsonPrimitive)),
            "flex" to JsonPrimitive(flex),
        )
    )

private fun MonthReport.toJson() =
    JsonObject(
        mapOf(
            "days" to JsonArray(days.map { it.toJson() }),
            "minutes" to
                JsonObject(
                    mapOf(
                        "counted" to JsonPrimitive(minutes.counted),
                        "target" to JsonPrimitive(minutes.target),
                        "max" to JsonPrimitive(minutes.max),
                    )
                ),
            "reported" to JsonPrimitive(reported),
            "flexIn" to JsonPrimitive(flexIn),
            "flex" to JsonPrimitive(flex),
            "revenue" to
                (revenue?.let {
                    JsonObject(
                        mapOf(
                            "counted" to JsonPrimitive(it.counted),
                            "target" to JsonPrimitive(it.target),
                            "max" to JsonPrimitive(it.max),
                        )
                    )
                } ?: JsonNull),
            "unpriced" to JsonPrimitive(unpriced),
            "overMax" to JsonPrimitive(overMax),
        )
    )
