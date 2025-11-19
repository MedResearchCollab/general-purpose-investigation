# Installing Node.js - Step by Step Guide

## Method 1: Official Installer (Recommended - Easiest)

### Step 1: Download Node.js
1. **Open your web browser** (Safari, Chrome, Firefox, etc.)
2. **Go to**: https://nodejs.org/
3. You'll see two download buttons:
   - **LTS** (Long Term Support) - Recommended
   - **Current** (Latest features)
4. **Click the LTS button** (it's the green one on the left)
5. This will download a file named something like: `node-v20.10.0.pkg`

### Step 2: Install Node.js
1. **Open Finder**
2. **Go to your Downloads folder** (or wherever the file was downloaded)
3. **Double-click** the `.pkg` file you just downloaded
4. **Follow the installation wizard**:
   - Click "Continue" on the welcome screen
   - Read the license (click "Continue" and then "Agree")
   - Choose installation location (default is fine, click "Continue")
   - Click "Install"
   - **Enter your Mac password** when prompted
   - Wait for installation to complete
   - Click "Close" when done

### Step 3: Verify Installation
1. **Open a NEW terminal window** (important - close and reopen Terminal)
2. **Type**:
   ```bash
   node --version
   ```
3. **You should see**: `v20.10.0` (or similar version number)
4. **Also check npm**:
   ```bash
   npm --version
   ```
5. **You should see**: `10.2.3` (or similar version number)

### ✅ If you see version numbers, Node.js is installed successfully!

## Method 2: Using NVM (Node Version Manager)

If you prefer using a version manager:

### Step 1: Install NVM
Open Terminal and run:
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

### Step 2: Reload Terminal
```bash
source ~/.zshrc
```

### Step 3: Install Node.js
```bash
nvm install --lts
nvm use --lts
```

### Step 4: Verify
```bash
node --version
npm --version
```

## After Installation

Once Node.js is installed, you can start the frontend:

```bash
cd /Users/jennysanchezcruz/Documents/reasearch-optimization-ctic/general_purpose_investigation
./START_UI.sh
```

Or manually:
```bash
cd frontend
npm install
npm start
```

## Troubleshooting

### "command not found: node" after installation
- **Solution**: Close and reopen your terminal window
- The installer adds Node.js to your PATH, but you need a fresh terminal session

### Installation fails
- Make sure you have administrator privileges
- Try downloading the installer again
- Check your internet connection

### Still having issues?
- Visit: https://nodejs.org/en/download/
- Choose "macOS Installer (.pkg)" for your Mac type (Intel or Apple Silicon)

