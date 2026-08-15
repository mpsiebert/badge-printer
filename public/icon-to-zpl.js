/**
 * Badge-to-ZPL renderer — runs in the browser using HTML Canvas.
 * Renders the entire badge as a bitmap and converts to ZPL ^GF format.
 * This gives full control over fonts, layout, and alignment.
 * 
 * Badge: 4" x 2" at 203 dpi = 812 x 406 dots
 */

const BADGE_WIDTH = 812;
const BADGE_HEIGHT = 406;
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
 * @param {string} [options.title] - Title or Company
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

  // Layout config
  const leftMargin = 40;
  const maxRightMargin = 40;
  const maxAvailableWidth = BADGE_WIDTH - leftMargin - maxRightMargin;

  const hasPronouns = pronouns && pronouns.trim() !== '';
  const hasTitle = title && title.trim() !== '';
  const hasIcons = iconUrls.length > 0;

  ctx.fillStyle = 'black';
  ctx.textBaseline = 'top';

  // --- Auto-size Name ---
  let nameFontSize = 110;
  ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
  let nameMetrics = ctx.measureText(name);

  while (nameMetrics.width > maxAvailableWidth && nameFontSize > 36) {
    nameFontSize -= 4;
    ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
    nameMetrics = ctx.measureText(name);
  }

  // --- Font sizes for optional fields ---
  let pronounsFontSize = Math.max(28, Math.floor(nameFontSize * 0.35));
  if (hasPronouns) {
    ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
    let pronounsMetrics = ctx.measureText(pronouns);
    while (pronounsMetrics.width > maxAvailableWidth && pronounsFontSize > 20) {
      pronounsFontSize -= 2;
      ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
      pronounsMetrics = ctx.measureText(pronouns);
    }
  }

  let titleFontSize = Math.max(28, Math.floor(nameFontSize * 0.32));
  if (hasTitle) {
    ctx.font = `600 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
    let titleMetrics = ctx.measureText(title);
    while (titleMetrics.width > maxAvailableWidth && titleFontSize > 20) {
      titleFontSize -= 2;
      ctx.font = `600 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
      titleMetrics = ctx.measureText(title);
    }
  }

  // Vertical layout math
  const nameBlockHeight = nameFontSize;
  const pronounsBlockHeight = hasPronouns ? pronounsFontSize + 4 : 0;
  const titleBlockHeight = hasTitle ? titleFontSize + 4 : 0;
  const iconBlockHeight = hasIcons ? 56 + 10 : 0;

  const totalContentHeight = nameBlockHeight + pronounsBlockHeight + titleBlockHeight + iconBlockHeight;

  let nameY = Math.floor((BADGE_HEIGHT - totalContentHeight) / 2);
  nameY = Math.max(16, nameY);

  // Draw name
  ctx.fillStyle = 'black';
  ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
  ctx.fillText(name, leftMargin, nameY);

  let currentY = nameY + nameFontSize + 2;

  // Draw title / organization
  if (hasTitle) {
    ctx.fillStyle = '#333333';
    ctx.font = `600 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
    ctx.fillText(title, leftMargin + 2, currentY);
    currentY += titleFontSize + 4;
  }

  // Draw pronouns
  if (hasPronouns) {
    ctx.fillStyle = '#555555';
    ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
    ctx.fillText(pronouns, leftMargin + 2, currentY);
    currentY += pronounsFontSize + 4;
  }

  // Draw icons
  if (hasIcons) {
    currentY += 6;
    const iconSize = 56;
    const iconGap = 16;
    let iconX = leftMargin + 2;

    for (const url of iconUrls) {
      try {
        const img = await loadImageAsync(url);
        ctx.drawImage(img, iconX, currentY, iconSize, iconSize);
        iconX += iconSize + iconGap;
      } catch (e) {
        console.warn(`Could not load icon: ${url}`);
      }
    }
  }

  // Convert to ZPL
  const imageData = ctx.getImageData(0, 0, BADGE_WIDTH, BADGE_HEIGHT);
  const gfField = pixelsToZPLGF(imageData, BADGE_WIDTH, BADGE_HEIGHT, 0, 0);

  return [
    '^XA',
    '^PW812',
    '^LL406',
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
