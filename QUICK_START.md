# Quick Start Guide

## ✅ Setup Complete!

Your Oncology Research Data Collection application is ready to use!

### Admin Login Credentials
- **Email**: `ctic_generic@example.com`
- **Password**: `ctic_researcher`

### Backend Server
- **Status**: ✅ Running
- **URL**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Access the Application

### Option 1: Web Interface (Recommended)
1. **Install Node.js** (if not already installed):
   ```bash
   # Using Homebrew (macOS)
   brew install node
   
   # Or download from: https://nodejs.org/
   ```

2. **Start the frontend**:
   ```bash
   cd general_purpose_investigation/frontend
   npm install
   npm start
   ```

3. **Open browser**: http://localhost:3000
4. **Login** with the credentials above

### Option 2: API Only
You can use the API directly via:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Quick Test

Test the login via API:
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "ctic_generic@example.com", "password": "ctic_researcher"}'
```

## What's Next?

1. **Create Hospitals**: Add hospitals that will participate in studies
2. **Create Users**: Add user accounts for healthcare personnel
3. **Create Forms**: Build custom forms for data collection
4. **Create Studies**: Set up research studies and assign forms
5. **Collect Data**: Have users fill out and submit forms

## Server Management

### Start Backend (if stopped)
```bash
cd general_purpose_investigation/backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Stop Backend
Press `Ctrl+C` or run:
```bash
pkill -f "uvicorn app.main:app"
```

## Need Help?

See `SETUP_GUIDE.md` for detailed instructions on using all features.

