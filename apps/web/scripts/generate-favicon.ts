import { promises as fs } from "fs";
import { dirname, join } from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function generateFavicon() {
  // Create a simple Apple-style icon with iOS blue
  const size = 32;
  const padding = 4;

  // Create SVG for the icon
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="8" fill="#007AFF"/>
      <g transform="translate(${padding}, ${padding})">
        <rect x="2" y="2" width="8" height="8" rx="1" fill="white"/>
        <rect x="14" y="2" width="8" height="8" rx="1" fill="white"/>
        <rect x="2" y="14" width="8" height="8" rx="1" fill="white"/>
        <rect x="14" y="14" width="8" height="8" rx="1" fill="white"/>
      </g>
    </svg>
  `;

  // Generate PNG from SVG
  const pngBuffer = await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toBuffer();

  // Save as PNG (browsers will handle this as favicon)
  const outputPath = join(__dirname, "..", "public", "favicon.png");
  await fs.writeFile(outputPath, pngBuffer);

  // Also create 16x16 and 48x48 versions
  const sizes = [16, 48];
  for (const s of sizes) {
    const resizedBuffer = await sharp(Buffer.from(svg))
      .resize(s, s)
      .png()
      .toBuffer();

    await fs.writeFile(
      join(__dirname, "..", "public", `favicon-${s}x${s}.png`),
      resizedBuffer,
    );
  }

  console.log("Favicon generated successfully!");
}

generateFavicon().catch(console.error);
