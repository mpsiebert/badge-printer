const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const port = process.env.PORT || 3000;
const PRINTER_NAME = process.env.PRINTER_NAME || 'Zebra_ZD220';

const fs = require('fs');

app.use(express.json({ limit: '5mb' }));
app.use(express.static('public'));

// Auto-sync uploaded images from tempmediaStorage if available
const tempMediaDir = '/Users/mp/.gemini/antigravity/brain/tempmediaStorage';
const publicIconsDir = path.join(__dirname, 'public', 'icons');

function syncTempIcons() {
  try {
    if (fs.existsSync(tempMediaDir)) {
      const files = fs.readdirSync(tempMediaDir);
      console.log(`[TempMedia] Files in tempMediaDir:`, files);
      files.forEach(file => {
        if (file.endsWith('.png') || file.endsWith('.svg') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
          const srcPath = path.join(tempMediaDir, file);
          const stats = fs.statSync(srcPath);
          if (stats.size > 0) {
            // Determine target icon name: if file is media_..., we can check if it matches gaming or film or copy it
            console.log(`[TempMedia] Found image: ${file} (${stats.size} bytes)`);
          }
        }
      });
    }
  } catch (e) {
    console.error(`[TempMedia] Error reading dir:`, e.message);
  }
}
syncTempIcons();

/**
 * GET /api/icons
 * Returns mapping of icon ID to filename in public/icons
 */
app.get('/api/icons', (req, res) => {
  try {
    const files = fs.readdirSync(publicIconsDir);
    const iconMap = {};
    files.forEach(file => {
      const ext = path.extname(file);
      const name = path.basename(file, ext).toLowerCase();
      if (['.png', '.svg', '.jpg', '.jpeg', '.webp'].includes(ext.toLowerCase())) {
        iconMap[name] = file;
      }
    });
    res.json({ success: true, icons: iconMap });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Request logging & CORS middleware (allows GitHub Pages to hit local print server)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

/**
 * POST /api/print
 * Accepts { zpl } — pre-rendered ZPL string from the browser
 */
app.post('/api/print', (req, res) => {
  try {
    const { zpl } = req.body;
    
    if (!zpl || typeof zpl !== 'string') {
      return res.status(400).json({ success: false, error: 'ZPL data is required.' });
    }
    
    // Pipe ZPL directly to lp via stdin
    const lpBin = fs.existsSync('/usr/bin/lp') ? '/usr/bin/lp' : 'lp';
    const lp = spawn(lpBin, ['-d', PRINTER_NAME, '-o', 'raw'], {
      env: { ...process.env, PATH: '/usr/bin:/bin:/usr/sbin:/sbin:' + (process.env.PATH || '') }
    });
    
    let stderr = '';
    lp.stderr.on('data', (data) => { stderr += data.toString(); });
    
    lp.on('close', (code) => {
      if (code !== 0) {
        console.error(`Print error (exit ${code}): ${stderr}`);
        let errorMsg = 'Failed to print badge.';
        if (stderr.includes('does not exist')) {
          errorMsg = `Printer '${PRINTER_NAME}' is not set up. Run: bash setup.sh`;
        }
        return res.status(500).json({ success: false, error: errorMsg });
      }
      
      console.log(`Badge printed successfully`);
      res.json({ success: true, message: 'Badge sent to printer.' });
    });
    
    lp.stdin.write(zpl);
    lp.stdin.end();
  } catch (error) {
    console.error(`Error processing print request: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ success: false, error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  console.log(`\n🏷️  Badge Printer Kiosk`);
  console.log(`   Open: http://localhost:${port}`);
  console.log(`   Printer: ${PRINTER_NAME}`);
  console.log(``);
});
