# Setup and Usage Guide

## ✅ Backend Setup Complete!

The backend server is running and the admin user has been created successfully.

### Admin Credentials
- **Email**: `ctic_generic@example.com`
- **Password**: `ctic_researcher`
- **Role**: Admin

### Backend Server
- **URL**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Status**: ✅ Running

## Frontend Setup

### Prerequisites
1. Install Node.js (version 16 or higher)
   - Download from: https://nodejs.org/
   - Or use Homebrew: `brew install node`

### Steps

1. **Navigate to frontend directory**:
   ```bash
   cd general_purpose_investigation/frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm start
   ```

4. **Access the application**:
   - Open your browser and go to: http://localhost:3000
   - Log in with the admin credentials above

## How to Use the Application

### 1. Login
- Go to http://localhost:3000
- Enter email: `ctic_generic@example.com`
- Enter password: `ctic_researcher`
- Click "Sign In"

### 2. Dashboard
- View statistics about studies, forms, submissions, and users

### 3. Create Hospitals (Admin Only)
- Go to "Hospitals" in the sidebar
- Click "Create Hospital"
- Fill in the hospital information
- Save

### 4. Create Users (Admin Only)
- Go to "Users" in the sidebar
- Click "Create User"
- Fill in user details:
  - Full Name
  - Email
  - Password
  - Role (admin or user)
  - Hospital (optional)
- Save

### 5. Create Forms (Admin Only)
- Go to "Forms" in the sidebar
- Click "Create Form"
- Enter form name and description
- Click "Add Field" to add form fields:
  - Field Name (internal identifier, e.g., `patient_name`)
  - Field Label (display name, e.g., `Patient Name`)
  - Field Type (text, number, date, select, radio, checkbox, textarea)
  - Required (checkbox)
  - Options (for select/radio fields)
  - Validation (min/max for numbers)
- Click "Save Form" when done

### 6. Create Studies (Admin Only)
- Go to "Studies" in the sidebar
- Click "Create Study"
- Enter study name and description
- Save
- To assign forms to a study:
  - Click "+ Add" next to the study
  - Select a form from the dropdown
  - Click "Assign"

### 7. Fill Forms (All Users)
- Go to "Submissions" in the sidebar
- Select a Study from the dropdown
- Select a Form from the dropdown
- Click "Fill Form"
- Complete the form fields
- Click "Submit"

### 8. View Submissions
- Go to "Submissions" in the sidebar
- View all your submissions in the table
- Click "View" to see submission details

### 9. Export Data (Admin Only)
- Go to "Export Data" in the sidebar
- Select filters (optional):
  - Study
  - Form
  - Hospital
  - Date range
- Click "Export CSV" or "Export JSON"
- File will download automatically

## Running the Servers

### Backend Server
To start the backend server manually:

```bash
cd general_purpose_investigation/backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Frontend Server
To start the frontend server:

```bash
cd general_purpose_investigation/frontend
npm start
```

## Troubleshooting

### Backend Issues
- **Port 8000 already in use**: Change the port in the uvicorn command
- **Database errors**: Ensure the `database/` directory exists and is writable
- **Import errors**: Make sure all dependencies are installed: `pip install -r requirements.txt`

### Frontend Issues
- **npm not found**: Install Node.js from https://nodejs.org/
- **Port 3000 already in use**: The app will prompt to use a different port
- **API connection errors**: Ensure the backend is running on port 8000

## API Endpoints

You can test the API directly using:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Example: Login via API
```bash
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "ctic_generic@example.com", "password": "ctic_researcher"}'
```

## Next Steps

1. **Set up the frontend** (if Node.js is installed)
2. **Create hospitals** for your research centers
3. **Create user accounts** for healthcare personnel
4. **Create forms** for data collection
5. **Create studies** and assign forms to them
6. **Start collecting data** from healthcare personnel

## Security Notes

- Change the default password after first login
- Update the `SECRET_KEY` in `.env` for production use
- Generate a proper encryption key for production
- Consider using a more robust database (PostgreSQL) for production
- Implement additional security measures for production deployment

