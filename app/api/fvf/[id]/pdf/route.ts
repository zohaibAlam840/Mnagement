import type { NextRequest } from "next/server"
import { accessTo, fail, getCaller } from "@/lib/server/context"
import { MVF_BUCKET } from "@/lib/server/locks"
import { loadFinal } from "@/lib/server/fvf"

// GET → the stored final form PDF. ?inline=1 opens it in the browser.
export async function GET(req: NextRequest, ctx: RouteContext<"/api/fvf/[id]/pdf">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)

  const fvf = await loadFinal(caller.db, id)
  if (!fvf) return fail("Form not found", 404)
  if (!(await accessTo(caller, fvf.trainee_id))) return fail("Not allowed", 403)
  if (!fvf.pdf_path) return fail("This form needs to be regenerated before it can be downloaded.", 409)

  const { data: file, error } = await caller.db.storage.from(MVF_BUCKET).download(fvf.pdf_path)
  if (error || !file) return fail("The stored PDF could not be found. Regenerate the form.", 404)

  const name = String(fvf.form_fields?.traineeName || "Trainee").replace(/[^A-Za-z0-9]+/g, "_")
  const inline = req.nextUrl.searchParams.get("inline") === "1"
  return new Response(await file.arrayBuffer(), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="FVF_${name}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
