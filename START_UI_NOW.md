# Start the UI - Step by Step

## Issue: localhost:3000 is not working

**Reason**: Node.js is not installed, so the frontend server cannot start.

## Solution: Install Node.js and Start the Server

### Step 1: Install Node.js

**EASIEST METHOD - Download and Install:**

1. **Open your web browser**
2. **Go to**: https://nodejs.org/
3. **Click** the big green button that says "Download Node.js (LTS)"
   - This will download a file like `node-v20.x.x.pkg`
4. **Open the downloaded file** (it should be in your Downloads folder)
5. **Follow the installation wizard**:
   - Click "Continue" through the prompts
   - Enter your password when asked
   - Click "Install"
6. **Wait for installation to complete**
7. **Close and reopen your terminal** (or run: `source ~/.zshrc`)

### Step 2: Verify Node.js is Installed

Open a new terminal and run:
```bash
node --version
npm --version
```

You should see version numbers (like `v20.10.0` and `10.2.3`).

### Step 3: Install Frontend Dependencies

```bash
cd /Users/jennysanchezcruz/Documents/reasearch-optimization-ctic/general_purpose_investigation/frontend
npm install
```

This will take 2-5 minutes. Wait for it to complete.

### Step 4: Start the Frontend Server

```bash
npm start
```

You should see:
```
Compiled successfully!

You can now view oncology-research-frontend in the browser.

  Local:            http://localhost:3000
```

### Step 5: Open in Browser

The browser should open automatically, or manually go to:
**http://localhost:3000**

### Step 6: Login

Use these credentials:
- **Email**: `ctic_generic@example.com`
- **Password**: `ctic_researcher`

## Alternative: Using the Startup Script

After installing Node.js, you can use:
```bash
cd /Users/jennysanchezcruz/Documents/reasearch-optimization-ctic/general_purpose_investigation
./START_FRONTEND.sh
```

## Troubleshooting

### If npm install fails:
- Make sure you have internet connection
- Try: `npm install --legacy-peer-deps`

### If port 3000 is already in use:
- The app will ask to use a different port (like 3001)
- Use that port instead

### If you see errors:
- Make sure the backend is running on port 8000
- Check: `curl http://localhost:8000/`

## Quick Check Commands

```bash
# Check Node.js
node --version

# Check if backend is running
curl http://localhost:8000/

# Check if frontend dependencies are installed
ls frontend/node_modules

# Start frontend (after Node.js is installed)
cd frontend && npm start
```

