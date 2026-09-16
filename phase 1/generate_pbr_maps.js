import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function processPBRMaps(sourcePath, outputDir, prefix) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load image raw pixels
  const image = sharp(sourcePath);
  const metadata = await image.metadata();
  const width = metadata.width;
  const height = metadata.height;

  // Save color map
  const colorPath = path.join(outputDir, `${prefix}_color.jpg`);
  await image.jpeg({ quality: 95 }).toFile(colorPath);

  // Get grayscale raw buffer for height/depth calculations
  const { data: rawGray } = await image
    .clone()
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 1. Height map (normalized contrast curve)
  const heightBuffer = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const val = rawGray[i];
    // Slightly boost midtone contrast for displacement
    heightBuffer[i] = Math.min(255, Math.max(0, Math.pow(val / 255, 1.1) * 255));
  }
  const heightPath = path.join(outputDir, `${prefix}_height.png`);
  await sharp(heightBuffer, { raw: { width, height, channels: 1 } })
    .png()
    .toFile(heightPath);

  // 2. Normal Maps (Sobel Operator)
  const normalGLBuffer = Buffer.alloc(width * height * 3);
  const normalDXBuffer = Buffer.alloc(width * height * 3);
  const strength = 3.5;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Wrap-around coordinates for seamless tiling
      const x0 = (x - 1 + width) % width;
      const x1 = (x + 1) % width;
      const y0 = (y - 1 + height) % height;
      const y1 = (y + 1) % height;

      // Sobel kernel sampling
      const tl = rawGray[y0 * width + x0] / 255;
      const t  = rawGray[y0 * width + x ] / 255;
      const tr = rawGray[y0 * width + x1] / 255;
      const l  = rawGray[y  * width + x0] / 255;
      const r  = rawGray[y  * width + x1] / 255;
      const bl = rawGray[y1 * width + x0] / 255;
      const b  = rawGray[y1 * width + x ] / 255;
      const br = rawGray[y1 * width + x1] / 255;

      const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);

      // Normal vector in tangent space
      // OpenGL: +Y is UP
      let nx = -dX * strength;
      let ny = -dY * strength;
      let nz = 1.0;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;

      const outIdx = idx * 3;
      // OpenGL map: R=(nx*0.5+0.5), G=(ny*0.5+0.5), B=(nz*0.5+0.5)
      const rByte = Math.round((nx * 0.5 + 0.5) * 255);
      const gGLByte = Math.round((ny * 0.5 + 0.5) * 255);
      const bByte = Math.round((nz * 0.5 + 0.5) * 255);

      normalGLBuffer[outIdx] = rByte;
      normalGLBuffer[outIdx + 1] = gGLByte;
      normalGLBuffer[outIdx + 2] = bByte;

      // DirectX map: Inverted Green channel (Y- is UP)
      const gDXByte = 255 - gGLByte;
      normalDXBuffer[outIdx] = rByte;
      normalDXBuffer[outIdx + 1] = gDXByte;
      normalDXBuffer[outIdx + 2] = bByte;
    }
  }

  const normalGLPath = path.join(outputDir, `${prefix}_normal_opengl.png`);
  await sharp(normalGLBuffer, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(normalGLPath);

  const normalDXPath = path.join(outputDir, `${prefix}_normal_directx.png`);
  await sharp(normalDXBuffer, { raw: { width, height, channels: 3 } })
    .png()
    .toFile(normalDXPath);

  // 3. Roughness Map
  // Micro-surface roughness: Rougher in cracks and diffuse areas, glossier/smoother on flat highlights
  const roughnessBuffer = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) {
    const val = rawGray[i] / 255;
    // Map roughness: darker areas tend to be slightly more occluded/rough (0.6 - 0.95 range)
    const rVal = Math.min(255, Math.max(0, Math.round((0.55 + (1 - val) * 0.4) * 255)));
    roughnessBuffer[i] = rVal;
  }
  const roughnessPath = path.join(outputDir, `${prefix}_roughness.jpg`);
  await sharp(roughnessBuffer, { raw: { width, height, channels: 1 } })
    .jpeg({ quality: 90 })
    .toFile(roughnessPath);

  // 4. Ambient Occlusion (AO) Map
  // Cavity darkening in crevices/recesses
  const aoBuffer = Buffer.alloc(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const center = rawGray[idx];
      let sum = 0;
      let count = 0;
      // Sample 5x5 neighborhood to compute local cavity occlusion
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const sx = (x + dx + width) % width;
          const sy = (y + dy + height) % height;
          sum += rawGray[sy * width + sx];
          count++;
        }
      }
      const localAvg = sum / count;
      const diff = center - localAvg;
      // Crevice gets darker (lower value)
      let ao = 255 + diff * 1.5;
      ao = Math.min(255, Math.max(80, ao)); // clamp min shadow to 80/255
      aoBuffer[idx] = Math.round(ao);
    }
  }
  const aoPath = path.join(outputDir, `${prefix}_ao.jpg`);
  await sharp(aoBuffer, { raw: { width, height, channels: 1 } })
    .jpeg({ quality: 90 })
    .toFile(aoPath);

  console.log(`Generated full PBR set for ${prefix} at ${outputDir}`);
}

async function run() {
  const doorSrc = '/Users/ztlab82/.gemini/antigravity-ide/brain/2749c4cb-4dcc-4716-94cd-0643b45a9d73/building_door_texture_1789552363935.jpg';
  const roadSrc = '/Users/ztlab82/.gemini/antigravity-ide/brain/2749c4cb-4dcc-4716-94cd-0643b45a9d73/asphalt_road_color_1789553533025.jpg';

  await processPBRMaps(doorSrc, '/Users/ztlab82/Dhruvil/ThreeJS/phase 1/textures/door', 'door');
  await processPBRMaps(roadSrc, '/Users/ztlab82/Dhruvil/ThreeJS/phase 1/textures/road', 'road');
}

run().catch(console.error);
