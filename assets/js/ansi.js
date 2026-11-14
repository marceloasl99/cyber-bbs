/**
 * CYBER BBS — ANSI Engine & Image-to-ANSI Converter
 * Parses ANSI art, handles SAUCE records, and converts real images into
 * CP437 half-block ▀ ANSI graphics in 16 IBM VGA colors.
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSAnsi {
    constructor() {
      // 16 IBM VGA Palette RGB definitions
      this.vgaPalette = [
        [0, 0, 0],       // 0: Black
        [0, 0, 170],     // 1: Blue
        [0, 170, 0],     // 2: Green
        [0, 170, 170],   // 3: Cyan
        [170, 0, 0],     // 4: Red
        [170, 0, 170],   // 5: Magenta
        [170, 85, 0],    // 6: Brown
        [170, 170, 170], // 7: Light Gray
        [85, 85, 85],    // 8: Dark Gray
        [85, 85, 255],   // 9: Bright Blue
        [85, 255, 85],   // 10: Bright Green
        [85, 255, 255],  // 11: Bright Cyan
        [255, 85, 85],   // 12: Bright Red
        [255, 85, 255],  // 13: Bright Magenta
        [255, 255, 85],  // 14: Yellow
        [255, 255, 255]  // 15: Bright White
      ];
    }

    /**
     * Map RGB to nearest VGA 16 color index (weighted perceptual distance)
     */
    rgbToNearestVga(r, g, b) {
      let bestIdx = 0;
      let minDistance = Infinity;

      for (let i = 0; i < this.vgaPalette.length; i++) {
        const [vr, vg, vb] = this.vgaPalette[i];
        // Weighted Euclidean distance (human eye is more sensitive to green)
        const dr = (r - vr) * 0.3;
        const dg = (g - vg) * 0.59;
        const db = (b - vb) * 0.11;
        const dist = dr * dr + dg * dg + db * db;

        if (dist < minDistance) {
          minDistance = dist;
          bestIdx = i;
        }
      }
      return bestIdx;
    }

    /**
     * Convert Image to ANSI CP437 Half-Block string
     * @param {string} imgUrl - Image source
     * @param {number} targetWidth - e.g. 78 or 80 columns
     * @param {number} targetHeight - e.g. 40 or 44 rows (produces 20 or 22 terminal lines)
     */
    async convertImageToAnsi(imgUrl, targetWidth = 78, targetHeight = 40) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');

            // Draw and downscale image
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
            let ansi = '\x1b[0m';
            let lastFg = -1;
            let lastBg = -1;

            // Step 2 vertical pixels per character row using '▀'
            for (let y = 0; y < targetHeight; y += 2) {
              for (let x = 0; x < targetWidth; x++) {
                // Top pixel (Foreground of '▀')
                const idx1 = (y * targetWidth + x) * 4;
                const r1 = imgData[idx1], g1 = imgData[idx1 + 1], b1 = imgData[idx1 + 2];
                const fg = this.rgbToNearestVga(r1, g1, b1);

                // Bottom pixel (Background of '▀')
                const idx2 = ((y + 1) * targetWidth + x) * 4;
                const r2 = imgData[idx2], g2 = imgData[idx2 + 1], b2 = imgData[idx2 + 2];
                const bg = this.rgbToNearestVga(r2, g2, b2);

                if (fg !== lastFg || bg !== lastBg) {
                  // Emit SGR escape sequence
                  const fgCode = fg < 8 ? 30 + fg : 90 + (fg - 8);
                  const bgCode = bg < 8 ? 40 + bg : 100 + (bg - 8);
                  ansi += `\x1b[${fgCode};${bgCode}m`;
                  lastFg = fg;
                  lastBg = bg;
                }
                ansi += '▀';
              }
              ansi += '\x1b[0m\r\n';
              lastFg = -1;
              lastBg = -1;
            }

            resolve(ansi);
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = (e) => reject(new Error('Failed to load image for ANSI conversion'));
        img.src = imgUrl;
      });
    }

    /**
     * Generate .ANS file Blob with SAUCE metadata
     */
    createAnsiBlob(ansiText, title = 'CYBER BBS ART', author = 'CYBER ARTIST') {
      const encoder = new TextEncoder();
      const textBytes = encoder.encode(ansiText);

      // Construct 128-byte SAUCE record
      const sauce = new Uint8Array(128);
      const sauceHeader = encoder.encode('SAUCE00');
      sauce.set(sauceHeader, 0);

      // Title (35 chars)
      const titleBytes = encoder.encode(title.padEnd(35, ' ').substring(0, 35));
      sauce.set(titleBytes, 7);

      // Author (20 chars)
      const authorBytes = encoder.encode(author.padEnd(20, ' ').substring(0, 20));
      sauce.set(authorBytes, 42);

      // Group (20 chars)
      const groupBytes = encoder.encode('CYBER BBS'.padEnd(20, ' '));
      sauce.set(groupBytes, 62);

      // Date YYYYMMDD (8 chars)
      const dateStr = new Date().toISOString().substring(0, 10).replace(/-/g, '');
      sauce.set(encoder.encode(dateStr), 82);

      // FileSize (4 bytes)
      const view = new DataView(sauce.buffer);
      view.setUint32(90, textBytes.length, true);

      // DataType: 1 (Character), FileType: 1 (ANS)
      sauce[94] = 1;
      sauce[95] = 1;
      view.setUint16(96, 80, true); // Width 80

      // Combined payload
      const combined = new Uint8Array(textBytes.length + 1 + 128);
      combined.set(textBytes, 0);
      combined[textBytes.length] = 0x1A; // EOF marker
      combined.set(sauce, textBytes.length + 1);

      return new Blob([combined], { type: 'text/plain' });
    }
  }

  window.CyberBBS.Ansi = new BBSAnsi();
})();
