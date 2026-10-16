import type { NextRequest } from "next/server"
import { accessTo, fail, getCaller } from "@/lib/server/context"
import { MVF_BUCKET } from "@/lib/server/locks"
import { loadSummary } from "@/lib/server/mvf"

// GET → the stored, filled-in BACB PDF. ?inline=1 opens it in the browser instead of downloading.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/mvf/[id]/pdf">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)

  const summary = await loadSummary(caller.db, id)
  if (!summary) return fail("Form not found", 404)
  if (!(await accessTo(caller, summary.trainee_id))) return fail("Not allowed", 403)
  if (!summary.pdf_path) return fail("This form needs to be regenerated before it can be downloaded.", 409)

  const { data: file, error } = await caller.db.storage.from(MVF_BUCKET).download(summary.pdf_path)
  if (error || !file) return fail("The stored PDF could not be found. Regenerate the form.", 404)

  const name = String(summary.form_fields?.traineeName || "Trainee").replace(/[^A-Za-z0-9]+/g, "_")
  const filename = `MVF_${name}_${String(summary.month).slice(0, 7)}.pdf`
  const inline = req.nextUrl.searchParams.get("inline") === "1"

  return new Response(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
