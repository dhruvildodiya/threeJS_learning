import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function optimizeDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== '__MACOSX') await optimizeDir(fullPath);
      continue;
    }
    
    // Check if it is a large PNG or JPG (> 1MB)
    if (/\.(png|jpg|jpeg)$/i.test(file) && stat.size > 800 * 1024) {
      console.log(`Optimizing ${file} (${(stat.size / 1024 / 1024).toFixed(2)} MB)...`);
      const tempPath = fullPath + '.tmp.jpg';
      try {
        await sharp(fullPath)
          .resize({ width: 1024, height: 1024, fit: 'inside' })
          .jpeg({ quality: 85 })
          .toFile(tempPath);
        
        fs.unlinkSync(fullPath);
        // If original was .png, replace with optimized png or keep extension
        if (file.endsWith('.png')) {
          await sharp(tempPath).png({ compressionLevel: 6 }).toFile(fullPath);
          fs.unlinkSync(tempPath);
        } else {
          fs.renameSync(tempPath, fullPath);
        }
        const newStat = fs.statSync(fullPath);
        console.log(` -> Resized to 1024px: ${(newStat.size / 1024).toFixed(0)} KB`);
      } catch (err) {
        console.error(`Failed to optimize ${file}:`, err);
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      }
    }
  }
}

async function run() {
  await optimizeDir('/Users/ztlab82/Dhruvil/ThreeJS/phase 1/textures');
  console.log('All textures optimized!');
}

run().catch(console.error);
