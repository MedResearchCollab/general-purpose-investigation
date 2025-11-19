# Backend API Documentation

FastAPI backend for the Oncology Research Data Collection system.

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create `.env` file from `.env.example` and configure:
   - `SECRET_KEY`: Random secret for JWT tokens
   - `ENCRYPTION_KEY`: 32-byte base64 key (or leave to auto-generate)
   - `DATABASE_URL`: SQLite database path
   - `CORS_ORIGINS`: Frontend URLs (comma-separated)

3. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Database

SQLite database is created automatically in the `database/` directory on first run.

## Environment Variables

See `.env.example` for all available configuration options.

