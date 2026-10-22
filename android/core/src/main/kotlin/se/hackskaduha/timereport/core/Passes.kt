/*
 * Passes are the parts of a day the time is reported in, like "Förmiddag",
 * each with a time from and a time to. A day's time is the sum of its
 * passes.
 *
 * The two default passes exist without being stored, so a new device has
 * them too. Only what the user changes is stored, field by field, so changes
 * from two devices merge.
 */

package se.hackskaduha.timereport.core

import kotlin.random.Random

data class Pass(
    val id: String,
    val name: String,
    val pos: Int,
    /**
     * The column headings the pass had before passes had names, like
     * "Började" and "Lunch", which a pasted header row may still use.
     */
    val headings: Headings?,
)

data class Headings(val start: String, val end: String)

private val DEFAULT_PASSES =
    listOf(
        Pass("a", "Förmiddag", 0, Headings("Började", "Lunch")),
        Pass("b", "Eftermiddag", 1, Headings("Lunch slut", "Slutade")),
    )

val EDGE_NAMES = mapOf(Edge.Start to "Från", Edge.End to "Till")

/** One time of a pass, like "Förmiddag från". */
fun Pass.fieldName(edge: Edge) = "$name ${EDGE_NAMES.getValue(edge).lowercase(SWEDISH)}"

/** The passes in use, in order. */
fun passesOf(data: UserData): List<Pass> {
    val ids = LinkedHashSet(DEFAULT_PASSES.map(Pass::id))
    for (key in data.keys) {
        if (key.startsWith("p:")) ids += key.substring(2, key.indexOf('/'))
    }
    val passes =
        ids.mapNotNull { id ->
            if (data.numberOf(passKey(id, PassField.Off)) == 1.0) return@mapNotNull null
            val fallback = DEFAULT_PASSES.find { it.id == id }
            val start = data.textOf(passKey(id, PassField.Start)) ?: fallback?.headings?.start
            val end = data.textOf(passKey(id, PassField.End)) ?: fallback?.headings?.end
            val headings = if (start != null && end != null) Headings(start, end) else null
            // A pass from before passes had names is named after its start.
            val name =
                data.textOf(passKey(id, PassField.Name))
                    ?: data.textOf(passKey(id, PassField.Start))
                    ?: fallback?.name
            val pos = data.numberOf(passKey(id, PassField.Pos))?.toInt() ?: fallback?.pos
            if (name != null && pos != null) Pass(id, name, pos, headings) else null
        }
    return passes.sortedWith(compareBy(Pass::pos, Pass::id))
}

private const val ID_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789"

/** The values that add a pass after the others. */
fun newPass(passes: List<Pass>, random: Random = Random.Default): Map<String, Value> {
    val id = (1..8).map { ID_CHARS[random.nextInt(ID_CHARS.length)] }.joinToString("")
    val pos = (passes.maxOfOrNull(Pass::pos) ?: -1) + 1
    return mapOf(passKey(id, PassField.Name) to value("Extra"), passKey(id, PassField.Pos) to value(pos))
}

/** The values that move a pass one step up (-1) or down (1). */
fun movePass(passes: List<Pass>, index: Int, step: Int): Map<String, Value> {
    val order = passes.toMutableList()
    order[index] = passes[index + step]
    order[index + step] = passes[index]
    // Numbers every pass, in case two got the same place on two devices.
    return order.withIndex().associate { (pos, pass) -> passKey(pass.id, PassField.Pos) to value(pos) }
}
