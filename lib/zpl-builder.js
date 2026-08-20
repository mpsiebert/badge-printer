/**
 * Estimates the width of text based on character count and font width.
 * @param {string} text - The text to estimate.
 * @param {number} charWidth - The font width parameter.
 * @returns {number} - Estimated width in dots.
 */
function estimateTextWidth(text, charWidth) {
  return text.length * charWidth * 0.6;
}

/**
 * Repositions a cached ZPL ^GF string to new coordinates.
 * @param {string} zplString - The cached ZPL graphic field string.
 * @param {number} newX - New X position.
 * @param {number} newY - New Y position.
 * @returns {string} - Repositioned ZPL string.
 */
function repositionIcon(zplString, newX, newY) {
  // Replace the ^FO{x},{y} at the start with the new position
  return zplString.replace(/\^FO\d+,\d+/, `^FO${newX},${newY}`);
}

/**
 * Builds the complete ZPL string for a name badge (2" x 1" @ 203 DPI = 406 x 203 dots).
 * @param {Object} options - Badge options.
 * @param {string} options.name - The person's name.
 * @param {string} [options.pronouns] - The person's pronouns.
 * @param {string[]} [options.iconZPLStrings] - Array of ZPL graphic strings for icons.
 * @returns {string} - The complete ZPL string.
 */
function buildBadgeZPL(options) {
  const { name, pronouns, iconZPLStrings = [] } = options;
  
  let nameHeight, nameWidth;
  const nameLen = name.length;
  
  if (nameLen >= 1 && nameLen <= 5) {
    nameHeight = 45;
    nameWidth = 42;
  } else if (nameLen >= 6 && nameLen <= 8) {
    nameHeight = 38;
    nameWidth = 35;
  } else if (nameLen >= 9 && nameLen <= 12) {
    nameHeight = 30;
    nameWidth = 28;
  } else {
    nameHeight = 24;
    nameWidth = 20;
  }
  
  const estimatedNameWidth = estimateTextWidth(name, nameWidth);
  const nameX = Math.max(0, Math.floor((406 - estimatedNameWidth) / 2));
  
  // Vertical positioning based on content present
  const hasPronouns = pronouns && pronouns.trim() !== '';
  const hasIcons = iconZPLStrings.length > 0;
  
  let nameY;
  if (hasPronouns && hasIcons) {
    nameY = 40;
  } else if (hasPronouns && !hasIcons) {
    nameY = 70;
  } else if (!hasPronouns && hasIcons) {
    nameY = 60;
  } else {
    nameY = 80;
  }
  
  const lines = [
    '^XA',
    '^PW406',
    '^LL203',
    '^MTD',
    '^CI28',
    '',
    `^FO${nameX},${nameY}^A0N,${nameHeight},${nameWidth}^FD${name}^FS`,
  ];

  if (hasPronouns) {
    const pronounWidth = 14;
    const pronounHeight = 15;
    const estimatedPronounWidth = estimateTextWidth(pronouns, pronounWidth);
    const pronounX = Math.max(0, Math.floor((406 - estimatedPronounWidth) / 2));
    const pronounY = nameY + nameHeight + 5;
    
    lines.push(`^FO${pronounX},${pronounY}^A0N,${pronounHeight},${pronounWidth}^FD${pronouns}^FS`);
  }
  
  if (hasIcons) {
    const iconY = 160;
    let xPositions;
    
    if (iconZPLStrings.length === 1) {
      xPositions = [188];
    } else if (iconZPLStrings.length === 2) {
      xPositions = [138, 238];
    } else {
      xPositions = [103, 188, 273];
    }
    
    for (let i = 0; i < Math.min(iconZPLStrings.length, 3); i++) {
      lines.push(repositionIcon(iconZPLStrings[i], xPositions[i], iconY));
    }
  }
  
  lines.push('^XZ');
  
  return lines.join('\n');
}

module.exports = { buildBadgeZPL, estimateTextWidth };
