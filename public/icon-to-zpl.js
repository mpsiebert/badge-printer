/**
 * Badge-to-ZPL renderer — runs in the browser using HTML Canvas.
 * Renders the entire badge as a bitmap and converts to ZPL ^GF format.
 * Optimized for 2" x 1" Direct Thermal Labels (DT21-15PDT)
 * 
 * Badge: 2" x 1" at 203 dpi = 406 x 203 dots
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
 * @param {string} [options.title] - Title or Company
 * @param {string[]} [options.iconUrls] - Array of icon image URLs
 * @returns {Promise<string>} Complete ZPL string ready to send to printer
 */
async function renderBadgeToZPL({ name, pronouns, title, genres, iconUrls = [] }) {
  const canvas = document.createElement('canvas');
  canvas.width = BADGE_WIDTH;
  canvas.height = BADGE_HEIGHT;
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, BADGE_WIDTH, BADGE_HEIGHT);

  // Layout config for 2" x 1" (406 x 203)
  const leftMargin = 20;
  const maxRightMargin = 20;
  const maxAvailableWidth = BADGE_WIDTH - leftMargin - maxRightMargin;

  const hasPronouns = pronouns && pronouns.trim() !== '';
  const hasTitle = title && title.trim() !== '';
  const hasGenres = genres && genres.trim() !== '';
  const hasIcons = iconUrls.length > 0;

  ctx.fillStyle = 'black';
  ctx.textBaseline = 'top';

  // --- Auto-size Name ---
  let nameFontSize = 54;
  ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
  let nameMetrics = ctx.measureText(name);

  while (nameMetrics.width > maxAvailableWidth && nameFontSize > 20) {
    nameFontSize -= 2;
    ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
    nameMetrics = ctx.measureText(name);
  }

  // --- Font sizes for optional fields ---
  let pronounsFontSize = Math.max(14, Math.floor(nameFontSize * 0.38));
  if (hasPronouns) {
    ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
    let pronounsMetrics = ctx.measureText(pronouns);
    while (pronounsMetrics.width > maxAvailableWidth && pronounsFontSize > 11) {
      pronounsFontSize -= 1;
      ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
      pronounsMetrics = ctx.measureText(pronouns);
    }
  }

  let titleFontSize = Math.max(14, Math.floor(nameFontSize * 0.35));
  if (hasTitle) {
    ctx.font = `600 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
    let titleMetrics = ctx.measureText(title);
    while (titleMetrics.width > maxAvailableWidth && titleFontSize > 11) {
      titleFontSize -= 1;
      ctx.font = `600 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
      titleMetrics = ctx.measureText(title);
    }
  }

  let genresFontSize = Math.max(12, Math.floor(nameFontSize * 0.30));
  if (hasGenres) {
    ctx.font = `600 ${genresFontSize}px "${BADGE_FONT}", sans-serif`;
    let genresMetrics = ctx.measureText(genres);
    while (genresMetrics.width > maxAvailableWidth && genresFontSize > 10) {
      genresFontSize -= 1;
      ctx.font = `600 ${genresFontSize}px "${BADGE_FONT}", sans-serif`;
      genresMetrics = ctx.measureText(genres);
    }
  }

  // Vertical layout math
  const nameBlockHeight = nameFontSize;
  const pronounsBlockHeight = hasPronouns ? pronounsFontSize + 2 : 0;
  const titleBlockHeight = hasTitle ? titleFontSize + 2 : 0;
  const genresBlockHeight = hasGenres ? genresFontSize + 2 : 0;
  const iconBlockHeight = hasIcons ? 28 + 4 : 0;

  const totalContentHeight = nameBlockHeight + pronounsBlockHeight + titleBlockHeight + genresBlockHeight + iconBlockHeight;

  let nameY = Math.floor((BADGE_HEIGHT - totalContentHeight) / 2);
  nameY = Math.max(8, nameY);

  // Draw name
  ctx.fillStyle = 'black';
  ctx.font = `800 ${nameFontSize}px "${BADGE_FONT}", sans-serif`;
  ctx.fillText(name, leftMargin, nameY);

  let currentY = nameY + nameFontSize + 2;

  // Draw title / organization
  if (hasTitle) {
    ctx.fillStyle = '#333333';
    ctx.font = `600 ${titleFontSize}px "${BADGE_FONT}", sans-serif`;
    ctx.fillText(title, leftMargin + 1, currentY);
    currentY += titleFontSize + 2;
  }

  // Draw pronouns
  if (hasPronouns) {
    ctx.fillStyle = '#555555';
    ctx.font = `600 ${pronounsFontSize}px "${BADGE_FONT}", sans-serif`;
    ctx.fillText(pronouns, leftMargin + 1, currentY);
    currentY += pronounsFontSize + 2;
  }

  // Draw genres
  if (hasGenres) {
    ctx.fillStyle = '#475569';
    ctx.font = `600 ${genresFontSize}px "${BADGE_FONT}", sans-serif`;
    ctx.fillText(genres, leftMargin + 1, currentY);
    currentY += genresFontSize + 2;
  }

  // Draw icons
  if (hasIcons) {
    currentY += 3;
    const iconSize = 28;
    const iconGap = 8;
    let iconX = leftMargin + 1;

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
