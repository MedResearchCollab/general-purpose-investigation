# Installing Node.js for the Frontend

## Option 1: Download from Official Website (Recommended)

1. **Visit**: https://nodejs.org/
2. **Download** the LTS (Long Term Support) version for macOS
3. **Run the installer** and follow the installation wizard
4. **Verify installation**:
   ```bash
   node --version
   npm --version
   ```

## Option 2: Using NVM (Node Version Manager)

If you prefer using a version manager:

1. **Install NVM**:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   ```

2. **Restart your terminal** or run:
   ```bash
   source ~/.zshrc
   ```

3. **Install Node.js**:
   ```bash
   nvm install --lts
   nvm use --lts
   ```

4. **Verify**:
   ```bash
   node --version
   npm --version
   ```

## After Installation

Once Node.js is installed, proceed with:

```bash
cd general_purpose_investigation/frontend
npm install
npm start
```

The application will open automatically at http://localhost:3000

