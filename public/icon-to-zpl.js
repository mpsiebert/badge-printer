/**
 * Badge-to-ZPL renderer — runs in the browser using HTML Canvas.
 * Renders the entire badge as a bitmap and converts to ZPL ^GF format.
 * Optimized for 2" x 1" Direct Thermal Labels (DT21-15PDT)
 * 
 * Badge: 2" x 1" at 203 dpi = 406 x 203 dots
 * Layout: Large text on left with letter spacing, stacked icons vertically on right edge.
 */

const BADGE_WIDTH = 406;
const BADGE_HEIGHT = 203;
const BADGE_FONT = 'Open Sans';

/**
 * Converts raw canvas pixel data to a ZPL ^GF hex string.
 * @param {ImageData} imageData - Canvas image data
 * @param {number} width - Image width in pixels
 * @param {number} height - Image height in pixels
 * @param {number} posX - X position on the label
 * @param {number} posY - Y position on the label
 * @returns {string} ZPL ^GF string
 */
function pixelsToZPLGF(imageData, width, height, posX, posY) {
  const pixels = imageData.data;
  const bytesPerRow = Math.ceil(width / 8);
  const totalBytes = bytesPerRow * height;
  let hexString = '';

  for (let y = 0; y < height; y++) {
    for (let byteIdx = 0; byteIdx < bytesPerRow; byteIdx++) {
      let byteVal = 0;
      for (let bit = 0; bit < 8; bit++) {
        const x = byteIdx * 8 + bit;
        if (x < width) {
          const offset = (y * width + x) * 4;
          const r = pixels[offset];
          const g = pixels[offset + 1];
          const b = pixels[offset + 2];
          const a = pixels[offset + 3];

          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          const isBlack = a >= 128 && luminance < 128;

          if (isBlack) {
            byteVal |= (1 << (7 - bit));
          }
        }
      }
      hexString += byteVal.toString(16).padStart(2, '0').toUpperCase();
    }
  }

  return `^FO${posX},${posY}^GFA,${totalBytes},${totalBytes},${bytesPerRow},${hexString}^FS`;
}

/**
 * Renders a complete badge to ZPL using browser canvas.
 * @param {Object} options
 * @param {string} options.name - First name
 * @param {string} [options.pronouns] - Pronouns
 * @param {string} [options.title] - Hackathon / Community
 * @param {string[]} [options.iconUrls] - Array of icon image URLs
 * @returns {Promise<string>} Complete ZPL string ready to send to printer
 */
async function renderBadgeToZPL({ name, pronouns, title, iconUrls = [] }) {
  const canvas = document.createElement('canvas');
  canvas.width = BADGE_WIDTH;
  canvas.height = BADGE_HEIGHT;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT);

  const hasPronouns = pronouns && pronouns.trim() !== '';
  const hasTitle = title && title.trim() !== '';
  const hasIcons = iconUrls.length > 0;

  // Layout config for 2" x 1" (406 x 203)
  const leftMargin = 16;
  const iconSize = 34;
  const iconGap = 6;
  const reservedRightWidth = hasIcons ? (iconSize + 20) : 16;
  const maxAvailableWidth = BADGE_WIDTH - leftMargin - reservedRightWidth;

  ctx.fillStyle = 'black';
  ctx.textBaseline = 'top';

  // --- Auto-size Name with Letter Spacing ---
  let nameFontSize = 84;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '2px';
  }
  ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
  let nameMetrics = ctx.measureText(name);

  while (nameMetrics.width > maxAvailableWidth && nameFontSize > 28) {
    nameFontSize -= 2;
    ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
    nameMetrics = ctx.measureText(name);
  }

  // --- Font sizes for optional fields ---
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '0px';
  }

  let titleFontSize = Math.max(22, Math.floor(nameFontSize * 0.44));
  if (hasTitle) {
    ctx.font = `700 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
    let titleMetrics = ctx.measureText(title);
    while (titleMetrics.width > maxAvailableWidth && titleFontSize > 15) {
      titleFontSize -= 1;
      ctx.font = `700 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
      titleMetrics = ctx.measureText(title);
    }
  }

  let pronounsFontSize = Math.max(20, Math.floor(nameFontSize * 0.40));
  if (hasPronouns) {
    ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
    let pronounsMetrics = ctx.measureText(pronouns);
    while (pronounsMetrics.width > maxAvailableWidth && pronounsFontSize > 14) {
      pronounsFontSize -= 1;
      ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
      pronounsMetrics = ctx.measureText(pronouns);
    }
  }

  // Vertical layout math for left column text
  const nameBlockHeight = nameFontSize;
  const titleBlockHeight = hasTitle ? titleFontSize + 4 : 0;
  const pronounsBlockHeight = hasPronouns ? pronounsFontSize + 4 : 0;

  const totalTextHeight = nameBlockHeight + titleBlockHeight + pronounsBlockHeight;

  let nameY = Math.floor((BADGE_HEIGHT - totalTextHeight) / 2);
  nameY = Math.max(8, nameY);

  // Draw name with letter spacing
  ctx.fillStyle = 'black';
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '2px';
  }
  ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
  ctx.fillText(name, leftMargin, nameY);

  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = '0px';
  }

  let currentY = nameY + nameFontSize + 2;

  // Draw Hackathon / Community
  if (hasTitle) {
    ctx.fillStyle = '#1e293b';
    ctx.font = `700 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
    ctx.fillText(title, leftMargin + 1, currentY);
    currentY += titleFontSize + 4;
  }

  // Draw pronouns
  if (hasPronouns) {
    ctx.fillStyle = '#475569';
    ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
    ctx.fillText(pronouns, leftMargin + 1, currentY);
    currentY += pronounsFontSize + 4;
  }

  // --- Draw icons stacked vertically down the right edge ---
  if (hasIcons) {
    const numIcons = Math.min(iconUrls.length, 4);
    const totalIconsHeight = numIcons * iconSize + (numIcons - 1) * iconGap;
    let iconY = Math.max(10, Math.floor((BADGE_HEIGHT - totalIconsHeight) / 2));
    const iconX = BADGE_WIDTH - 14 - iconSize;

    for (let i = 0; i < numIcons; i++) {
      try {
        const img = await loadImageAsync(iconUrls[i]);
        ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
        iconY += iconSize + iconGap;
      } catch (e) {
        console.warn(`Could not load icon: ${iconUrls[i]}`);
      }
    }
  }

  // Convert to ZPL
  const imageData = ctx.getImageData(0, 0, BADGE_WIDTH, BADGE_HEIGHT);
  const gfField = pixelsToZPLGF(imageData, BADGE_WIDTH, BADGE_HEIGHT, 0, 0);

  return [
    '^XA',
    '^PW406',
    '^LL203',
    '^MTD',
    '^CI28',
    gfField,
    '^XZ'
  ].join('\n');
}

/**
 * Helper to load an image as a Promise
 */
function loadImageAsync(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${url}`));
    img.src = url;
  });
}
