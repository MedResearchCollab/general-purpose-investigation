# Oncology Research Data Collection Web Application

A full-stack web application for collecting medical research data from multiple hospitals. The system allows administrators to create dynamic forms, manage studies, and assign users to hospitals. Healthcare personnel can fill out forms associated with studies.

## Features

- **Flexible Data Model**: Admins can create custom forms with various field types (text, number, date, select, radio, checkbox, textarea)
- **Multi-Purpose Studies**: Support for multiple research studies with form assignment
- **Shared Forms**: Forms can be used across multiple studies simultaneously
- **User Management**: Admin interface for creating users and assigning them to hospitals
- **Role-Based Access**: Admin and regular user roles with appropriate permissions
- **Data Encryption**: Basic encryption for sensitive submission data
- **Data Export**: Export data in CSV and JSON formats with filtering options
- **User-Friendly UI**: Clean, professional interface designed for healthcare personnel

## Technology Stack

### Backend
- FastAPI (Python web framework)
- SQLAlchemy (ORM)
- SQLite (Database)
- JWT (Authentication)
- bcrypt (Password hashing)
- cryptography (Data encryption)

### Frontend
- React 18 with TypeScript
- Material-UI (MUI)
- React Router
- Axios (API client)

## Project Structure

```
general_purpose_investigation/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── middleware/   # Authentication middleware
│   │   ├── main.py       # FastAPI application
│   │   ├── models.py     # Database models
│   │   ├── schemas.py    # Pydantic schemas
│   │   ├── auth.py       # Authentication utilities
│   │   └── encryption.py # Encryption utilities
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── context/      # Auth context
│   └── package.json
└── database/             # SQLite database (created automatically)
```

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the backend directory (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

5. Edit `.env` and set your configuration:
   - `SECRET_KEY`: A random secret key for JWT tokens
   - `ENCRYPTION_KEY`: A 32-byte base64-encoded encryption key (or leave default to auto-generate)
   - `DATABASE_URL`: SQLite database path (default is fine)
   - `CORS_ORIGINS`: Frontend URL (default: http://localhost:3000)

6. Create the database directory:
   ```bash
   mkdir -p ../database
   ```

7. Start the backend server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

The API will be available at `http://localhost:8000` and API documentation at `http://localhost:8000/docs`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory (optional):
   ```bash
   REACT_APP_API_URL=http://localhost:8000
   ```

4. Start the development server:
   ```bash
   npm start
   ```

The frontend will be available at `http://localhost:3000`.

## Initial Setup

### Creating the First Admin User

1. Start the backend server
2. Use the API endpoint to register the first admin user:
   ```bash
   curl -X POST "http://localhost:8000/api/auth/register" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@example.com",
       "password": "your-secure-password",
       "full_name": "Admin User"
     }'
   ```

   Or use the API documentation at `http://localhost:8000/docs` to register via the interactive interface.

3. Log in with the created admin account through the web interface.

## Usage Guide

### For Administrators

1. **Create Hospitals**: Go to Hospitals page and add hospitals that will participate in studies.

2. **Create Users**: Go to Users page and create user accounts. Assign users to hospitals and set their roles (admin or user).

3. **Create Forms**: Go to Forms page and use the form builder to create custom forms with various field types.

4. **Create Studies**: Go to Studies page and create research studies. Assign forms to studies.

5. **Export Data**: Go to Export page to export submission data in CSV or JSON format with various filters.

### For Regular Users

1. **View Studies**: Go to Studies page to see available studies.

2. **Fill Forms**: Go to Submissions page, select a study and form, then fill out and submit the form.

3. **View Submissions**: View your previous submissions on the Submissions page.

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register first admin (only if no users exist)
- `GET /api/auth/me` - Get current user info

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create user
- `GET /api/users/{id}` - Get user details
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Deactivate user

### Hospitals
- `GET /api/hospitals` - List hospitals
- `POST /api/hospitals` - Create hospital (admin only)
- `PUT /api/hospitals/{id}` - Update hospital (admin only)
- `DELETE /api/hospitals/{id}` - Delete hospital (admin only)

### Studies
- `GET /api/studies` - List studies
- `POST /api/studies` - Create study (admin only)
- `GET /api/studies/{id}` - Get study with forms
- `PUT /api/studies/{id}` - Update study (admin only)
- `POST /api/studies/{id}/forms/{form_id}` - Assign form to study (admin only)
- `DELETE /api/studies/{id}/forms/{form_id}` - Remove form from study (admin only)

### Forms
- `GET /api/forms` - List forms
- `POST /api/forms` - Create form (admin only)
- `GET /api/forms/{id}` - Get form schema
- `PUT /api/forms/{id}` - Update form (admin only)
- `DELETE /api/forms/{id}` - Delete form (admin only)

### Submissions
- `GET /api/submissions` - List submissions
- `POST /api/submissions` - Create submission
- `GET /api/submissions/{id}` - Get submission details
- `PUT /api/submissions/{id}` - Update submission
- `DELETE /api/submissions/{id}` - Delete submission

### Export (Admin only)
- `POST /api/export/csv` - Export data as CSV
- `POST /api/export/json` - Export data as JSON

## Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- Basic encryption for sensitive submission data
- Role-based access control (RBAC)
- CORS configuration for frontend

## Database

The application uses SQLite, which creates a database file automatically on first run. The database file will be located in the `database/` directory.

**Important**: For production use, consider:
- Regular database backups
- Using a more robust database (PostgreSQL, MySQL)
- Implementing additional security measures
- Setting up proper encryption key management

## Troubleshooting

### Backend Issues

- **Database errors**: Ensure the `database/` directory exists and is writable
- **Import errors**: Make sure all dependencies are installed: `pip install -r requirements.txt`
- **Port already in use**: Change the port in the uvicorn command or stop the conflicting service

### Frontend Issues

- **API connection errors**: Check that the backend is running and `REACT_APP_API_URL` is set correctly
- **Build errors**: Try deleting `node_modules` and reinstalling: `rm -rf node_modules && npm install`
- **Date picker errors**: Ensure `date-fns` is installed: `npm install date-fns`

## Development

### Running in Development Mode

Backend:
```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm start
```

### Building for Production

Frontend:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/build/`. You can serve these with any static file server or integrate with the FastAPI backend.

## License

This project is designed for medical research purposes. Ensure compliance with your institution's data handling policies and patient privacy regulations (HIPAA, GDPR, etc.).

## Support

For issues or questions:
1. Check the API documentation at `http://localhost:8000/docs`
2. Review the logs for error details
3. Verify configuration settings in `.env` files

