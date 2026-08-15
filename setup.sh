#!/bin/bash
# Badge Printer — One-time Setup Script
# Sets up the CUPS raw print queue for the Zebra ZD220
# and installs Node.js dependencies.

set -e

echo "=================================="
echo "  Badge Printer — Setup"
echo "=================================="
echo ""

# Step 1: Install Node.js dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed."
echo ""

# Step 2: Detect the Zebra printer
echo "🔍 Looking for Zebra printer..."
PRINTER_URI=$(lpinfo -v 2>/dev/null | grep -i "zebra" | head -1 | awk '{print $2}')

if [ -z "$PRINTER_URI" ]; then
  echo "⚠️  No Zebra printer detected via USB."
  echo "   Please connect your Zebra ZD220 and try again."
  echo "   Or manually create the queue with:"
  echo "   sudo lpadmin -p Zebra_ZD220 -E -v \"usb://YOUR_PRINTER_URI\" -m raw"
  exit 1
fi

echo "   Found: $PRINTER_URI"
echo ""

# Step 3: Create the CUPS raw print queue
QUEUE_NAME="${PRINTER_QUEUE:-Zebra_ZD220}"
echo "🖨️  Creating CUPS raw print queue: $QUEUE_NAME"
sudo lpadmin -p "$QUEUE_NAME" -E -v "$PRINTER_URI" -m raw
echo "✅ Print queue '$QUEUE_NAME' created."
echo ""

# Step 4: Send a test label
echo "🧪 Sending test label..."
TEST_ZPL="^XA^PW812^LL406^MTD^CI28^FO200,150^A0N,80,75^FDTest Print^FS^FO250,250^A0N,35,30^FDBadge Printer Ready^FS^XZ"
echo "$TEST_ZPL" | lp -d "$QUEUE_NAME" -o raw
echo "✅ Test label sent! Check your printer."
echo ""

echo "=================================="
echo "  Setup complete!"
echo "  Run: npm start"
echo "  Open: http://localhost:3000"
echo "=================================="
