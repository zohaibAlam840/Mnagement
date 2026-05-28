import sharp from "sharp"
import { writeFileSync } from "fs"
import { mkdirSync } from "fs"

// ABA Fieldwork Pro icon — violet rounded square with white clipboard
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <!-- Background -->
  <rect width="512" height="512" rx="112" fill="#7C3AED"/>

  <!-- Clipboard board -->
  <rect x="144" y="160" width="224" height="260" rx="20" fill="white"/>

  <!-- Clipboard top clip -->
  <rect x="196" y="140" width="120" height="52" rx="26" fill="#7C3AED"/>
  <rect x="216" y="152" width="80" height="28" rx="14" fill="#EDE9FE"/>

  <!-- Lines on clipboard -->
  <rect x="172" y="248" width="168" height="16" rx="8" fill="#DDD6FE"/>
  <rect x="172" y="280" width="168" height="16" rx="8" fill="#DDD6FE"/>
  <rect x="172" y="312" width="120" height="16" rx="8" fill="#DDD6FE"/>

  <!-- Check mark -->
  <circle cx="188" cy="352" r="22" fill="#7C3AED" opacity="0.15"/>
  <polyline points="177,352 185,361 202,343" fill="none" stroke="#7C3AED" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

mkdirSync("public/icons", { recursive: true })

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`)
  console.log(`✓ icon-${size}x${size}.png`)
}

// Also write apple-touch-icon (180x180)
await sharp(Buffer.from(svg))
  .resize(180, 180)
  .png()
  .toFile("public/apple-touch-icon.png")
console.log("✓ apple-touch-icon.png")

// Favicon 32x32
await sharp(Buffer.from(svg))
  .resize(32, 32)
  .png()
  .toFile("public/favicon-32x32.png")
console.log("✓ favicon-32x32.png")

console.log("\nAll icons generated!")
