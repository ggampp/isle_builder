import Jimp from 'jimp';
import fs from 'fs';
import path from 'path';

(async () => {
    const atlasWidth = 8;
    const cellPx = 48;
    const atlasImg = new Jimp(atlasWidth * cellPx, Math.ceil(53 / atlasWidth) * cellPx, 0x00000000);

    const batches = [
        "C:\\Users\\ggamp\\.gemini\\antigravity-ide\\brain\\ac8b20e5-819e-491a-9268-e09a601cb850\\props_batch_1_decor_1783028556292.png",
        "C:\\Users\\ggamp\\.gemini\\antigravity-ide\\brain\\ac8b20e5-819e-491a-9268-e09a601cb850\\props_batch_2_trees_1783028563132.png",
        "C:\\Users\\ggamp\\.gemini\\antigravity-ide\\brain\\ac8b20e5-819e-491a-9268-e09a601cb850\\props_batch_3_utility_1783028570040.png"
    ];

    let globalSpriteIndex = 0;

    for (const batchFile of batches) {
        if (!fs.existsSync(batchFile)) {
            console.log("Arquivo não encontrado:", batchFile);
            continue;
        }
        
        console.log("Processando:", path.basename(batchFile));
        const img = await Jimp.read(batchFile);
        
        // 1. Remove background (white/near-white)
        img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx + 0];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            if (r > 220 && g > 220 && b > 220) {
                this.bitmap.data[idx + 3] = 0; // transparent
            }
        });

        // 2. Projections to find rows and columns
        const cols = [];
        let inCol = false;
        let colStart = 0;
        for (let x = 0; x < img.bitmap.width; x++) {
            let hasPixel = false;
            for (let y = 0; y < img.bitmap.height; y++) {
                if (img.bitmap.data[(y * img.bitmap.width + x) * 4 + 3] > 0) { hasPixel = true; break; }
            }
            if (hasPixel && !inCol) { inCol = true; colStart = x; }
            if (!hasPixel && inCol) { inCol = false; cols.push([colStart, x]); }
        }
        if (inCol) cols.push([colStart, img.bitmap.width]);

        const rows = [];
        let inRow = false;
        let rowStart = 0;
        for (let y = 0; y < img.bitmap.height; y++) {
            let hasPixel = false;
            for (let x = 0; x < img.bitmap.width; x++) {
                if (img.bitmap.data[(y * img.bitmap.width + x) * 4 + 3] > 0) { hasPixel = true; break; }
            }
            if (hasPixel && !inRow) { inRow = true; rowStart = y; }
            if (!hasPixel && inRow) { inRow = false; rows.push([rowStart, y]); }
        }
        if (inRow) rows.push([rowStart, img.bitmap.height]);

        // 3. Extract and stitch
        for (const [rStart, rEnd] of rows) {
            for (const [cStart, cEnd] of cols) {
                if (globalSpriteIndex >= 53) break; // Don't exceed atlas

                let hasPixel = false;
                for(let x=cStart; x<cEnd; x++) {
                    for(let y=rStart; y<rEnd; y++) {
                        if (img.bitmap.data[(y * img.bitmap.width + x) * 4 + 3] > 0) hasPixel = true;
                    }
                }
                if (!hasPixel) continue;

                // Crop
                const sprite = img.clone().crop(cStart, rStart, cEnd - cStart, rEnd - rStart);
                
                // Scale if too big for 48x48
                if (sprite.bitmap.width > cellPx || sprite.bitmap.height > cellPx) {
                    sprite.scaleToFit(cellPx, cellPx, Jimp.RESIZE_NEAREST_NEIGHBOR);
                }

                // Place in atlas centered
                const atlasCol = globalSpriteIndex % atlasWidth;
                const atlasRow = Math.floor(globalSpriteIndex / atlasWidth);
                
                const destX = atlasCol * cellPx + Math.floor((cellPx - sprite.bitmap.width) / 2);
                const destY = atlasRow * cellPx + Math.floor((cellPx - sprite.bitmap.height) / 2);

                atlasImg.composite(sprite, destX, destY);
                globalSpriteIndex++;
            }
        }
    }
    
    // Create dir if not exists
    if (!fs.existsSync('public/assets/atlas')) fs.mkdirSync('public/assets/atlas', { recursive: true });
    
    await atlasImg.writeAsync('public/assets/atlas/props-atlas.png');
    console.log(`Atlas gerado com sucesso em public/assets/atlas/props-atlas.png contendo ${globalSpriteIndex} sprites.`);
})();
