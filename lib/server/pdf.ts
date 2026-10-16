// Fill a BACB fillable PDF template: text fields by AcroForm name, plus signature
// images drawn on the signature lines. Fields stay editable (not flattened).

import { readFile } from "fs/promises"
import path from "path"
import { PDFDocument, StandardFonts } from "pdf-lib"
import sharp from "sharp"

const MAX_SIGNATURE_BYTES = 400_000

// Decode + re-encode so only a valid, reasonably sized PNG is ever stored or put in a PDF
// (pdf-lib can hang on malformed PNG data). Returns null if it isn't a usable PNG.
export async function normalizeSignature(dataUrl: unknown): Promise<string | null> {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/png;base64,") || dataUrl.length > MAX_SIGNATURE_BYTES) return null
  try {
    const input = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64")
    const png = await sharp(input, { limitInputPixels: 4_000_000 })
      .resize({ width: 1200, height: 400, fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer()
    return `data:image/png;base64,${png.toString("base64")}`
  } catch {
    return null
  }
}

export type PdfSignature = { field: string; png: string }

export async function fillBacbTemplate(
  templateFile: string,
  text: Record<string, string>,
  signatures: PdfSignature[] = [],
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(await readFile(path.join(process.cwd(), "public", "forms", templateFile)))
  const form = doc.getForm()

  for (const [name, value] of Object.entries(text)) {
    form.getTextField(name).setText(value ?? "")
  }

  const page = doc.getPage(0)
  for (const s of signatures) {
    const img = await doc.embedPng(Buffer.from(s.png.replace(/^data:image\/png;base64,/, ""), "base64"))
    const rect = form.getField(s.field).acroField.getWidgets()[0].getRectangle()
    // Fit on the signature line, a little taller than the box like a pen signature
    const boxW = rect.width - 8
    const boxH = rect.height + 6
    const scale = Math.min(boxW / img.width, boxH / img.height)
    page.drawImage(img, { x: rect.x + 4, y: rect.y + 1, width: img.width * scale, height: img.height * scale })
  }

  form.updateFieldAppearances(await doc.embedFont(StandardFonts.Helvetica))
  return await doc.save()
}

export function localDate(iso: string | null, timezone: string | null | undefined, format: "iso" | "us" = "iso"): string {
  if (!iso) return ""
  let ymd: string
  try {
    ymd = new Intl.DateTimeFormat("en-CA", { timeZone: timezone || "America/New_York" }).format(new Date(iso))
  } catch {
    ymd = iso.slice(0, 10)
  }
  if (format === "iso") return ymd
  const [y, m, d] = ymd.split("-")
  return `${m}/${d}/${y}`
}
