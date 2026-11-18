/**
 * CYBER BBS — ANSI Engine, SAUCE00 Parser & Image-to-ANSI Converter (Mega Edition v3.0)
 */
(function() {
  window.CyberBBS = window.CyberBBS || {};

  class BBSAnsi {
    constructor() {
      this.vgaPalette = [
        [0, 0, 0], [0, 0, 170], [0, 170, 0], [0, 170, 170],
        [170, 0, 0], [170, 0, 170], [170, 85, 0], [170, 170, 170],
        [85, 85, 85], [85, 85, 255], [85, 255, 85], [85, 255, 255],
        [255, 85, 85], [255, 85, 255], [255, 255, 85], [255, 255, 255]
      ];
    }

    rgbToNearestVga(r, g, b) {
      let bestIdx = 0, minDistance = Infinity;
      for (let i = 0; i < this.vgaPalette.length; i++) {
        const [vr, vg, vb] = this.vgaPalette[i];
        const dr = (r - vr) * 0.3, dg = (g - vg) * 0.59, db = (b - vb) * 0.11;
        const dist = dr * dr + dg * dg + db * db;
        if (dist < minDistance) { minDistance = dist; bestIdx = i; }
      }
      return bestIdx;
    }

    async convertImageToAnsi(imgUrl, targetWidth = 78, targetHeight = 36) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth; canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight).data;
            let ansi = '\x1b[0m', lastFg = -1, lastBg = -1;

            for (let y = 0; y < targetHeight; y += 2) {
              for (let x = 0; x < targetWidth; x++) {
                const idx1 = (y * targetWidth + x) * 4;
                const fg = this.rgbToNearestVga(imgData[idx1], imgData[idx1 + 1], imgData[idx1 + 2]);
                const idx2 = ((y + 1) * targetWidth + x) * 4;
                const bg = this.rgbToNearestVga(imgData[idx2], imgData[idx2 + 1], imgData[idx2 + 2]);
                if (fg !== lastFg || bg !== lastBg) {
                  const fgCode = fg < 8 ? 30 + fg : 90 + (fg - 8);
                  const bgCode = bg < 8 ? 40 + bg : 100 + (bg - 8);
                  ansi += `\x1b[${fgCode};${bgCode}m`;
                  lastFg = fg; lastBg = bg;
                }
                ansi += '▀';
              }
              ansi += '\x1b[0m\r\n';
              lastFg = -1; lastBg = -1;
            }
            resolve(ansi);
          } catch (err) { reject(err); }
        };
        img.onerror = () => reject(new Error('Failed to load image for ANSI conversion'));
        img.src = imgUrl;
      });
    }

    createAnsiBlob(ansiText, title = 'CYBER BBS ART', author = 'CYBER ARTIST') {
      const encoder = new TextEncoder();
      const textBytes = encoder.encode(ansiText);
      const sauce = new Uint8Array(128);
      sauce.set(encoder.encode('SAUCE00'), 0);
      sauce.set(encoder.encode(title.padEnd(35, ' ').substring(0, 35)), 7);
      sauce.set(encoder.encode(author.padEnd(20, ' ').substring(0, 20)), 42);
      sauce.set(encoder.encode('CYBER BBS'.padEnd(20, ' ')), 62);
      sauce.set(encoder.encode(new Date().toISOString().substring(0, 10).replace(/-/g, '')), 82);
      const view = new DataView(sauce.buffer);
      view.setUint32(90, textBytes.length, true);
      sauce[94] = 1; sauce[95] = 1;
      view.setUint16(96, 80, true); view.setUint16(98, 25, true);
      sauce[105] = 1;

      const combined = new Uint8Array(textBytes.length + 1 + 128);
      combined.set(textBytes, 0);
      combined[textBytes.length] = 0x1A;
      combined.set(sauce, textBytes.length + 1);
      return new Blob([combined], { type: 'application/octet-stream' });
    }

    /**
     * Parse 128-byte SAUCE record from the end of an ANSI binary/text buffer
     * @param {Uint8Array|ArrayBuffer} buffer - Raw file bytes
     * @returns {Object|null} Extracted SAUCE metadata or null if not present
     */
    parseSauce(buffer) {
      const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
      if (!bytes || bytes.length < 128) return null;

      const sauceIdx = bytes.length - 128;
      const decoder = new TextDecoder('ascii');
      const header = decoder.decode(bytes.subarray(sauceIdx, sauceIdx + 7));
      if (header !== 'SAUCE00') return null;

      const title = decoder.decode(bytes.subarray(sauceIdx + 7, sauceIdx + 42)).trim();
      const author = decoder.decode(bytes.subarray(sauceIdx + 42, sauceIdx + 62)).trim();
      const group = decoder.decode(bytes.subarray(sauceIdx + 62, sauceIdx + 82)).trim();
      const date = decoder.decode(bytes.subarray(sauceIdx + 82, sauceIdx + 90)).trim();
      const view = new DataView(bytes.buffer, bytes.byteOffset + sauceIdx, 128);
      const fileSize = view.getUint32(90, true);
      const dataType = bytes[sauceIdx + 94];
      const fileType = bytes[sauceIdx + 95];
      const width = view.getUint16(96, true);
      const lines = view.getUint16(98, true);
      const flags = bytes[sauceIdx + 105];
      const iceColors = (flags & 1) === 1;

      return {
        title: title || 'UNTITLED',
        author: author || 'ANONYMOUS',
        group: group || 'NONE',
        date: date || 'UNKNOWN',
        fileSize,
        dataType,
        fileType,
        width: width || 80,
        lines: lines || 25,
        iceColors
      };
    }

    /**
     * Converts a 2D terminal cell buffer into a compliant ANSI string
     * @param {Array<Array<Object>>} buffer - 2D grid of cells
     * @param {number} cols - Columns count
     * @param {number} rows - Rows count
     * @returns {string} Formatted ANSI text string
     */
    bufferToAnsi(buffer, cols, rows) {
      let out = '\x1b[0m';
      let curFg = -1, curBg = -1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = (buffer[r] && buffer[r][c]) ? buffer[r][c] : { ch: ' ', fg: 7, bg: 0 };
          const fg = cell.fg !== undefined ? cell.fg : 7;
          const bg = cell.bg !== undefined ? cell.bg : 0;
          if (fg !== curFg || bg !== curBg) {
            const fgCode = fg < 8 ? 30 + fg : 90 + (fg - 8);
            const bgCode = bg < 8 ? 40 + bg : 100 + (bg - 8);
            out += `\x1b[${fgCode};${bgCode}m`;
            curFg = fg;
            curBg = bg;
          }
          out += cell.ch || ' ';
        }
        out += '\r\n';
      }
      out += '\x1b[0m';
      return out;
    }
  }

  window.CyberBBS.Ansi = new BBSAnsi();
})();
