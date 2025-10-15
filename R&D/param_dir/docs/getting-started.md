# Getting Started

This guide will help you set up and start using the Excel Context Engine.

## Prerequisites

- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- PostgreSQL 12 or higher (optional, for persistence features)
- OpenAI API key (optional, for enhanced AI features)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/excel-context-engine.git
cd excel-context-engine
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for both backend and frontend using npm workspaces.

### 3. Environment Setup

#### Backend Configuration

Create a `.env` file in the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (optional)
DATABASE_URL=postgresql://username:password@localhost:5432/excel_context_engine
DB_HOST=localhost
DB_PORT=5432
DB_NAME=excel_context_engine
DB_USER=your_username
DB_PASSWORD=your_password

# OpenAI Configuration (optional)
OPENAI_API_KEY=your_openai_api_key_here

# File Upload Configuration
MAX_FILE_SIZE=50MB
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Frontend Configuration

Create a `.env` file in the `frontend` directory:

```bash
cp frontend/.env.example frontend/.env
```

Edit the `.env` file:

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_APP_NAME=Excel Context Engine
```

### 4. Database Setup (Optional)

If you want to use persistence features:

1. **Install PostgreSQL** (if not already installed)
2. **Create a database**:
   ```sql
   CREATE DATABASE excel_context_engine;
   ```
3. **Run migrations**:
   ```bash
   npm run db:migrate --workspace=backend
   ```

### 5. Start the Application

#### Development Mode

Start both backend and frontend in development mode:

```bash
npm run dev
```

This will start:
- Backend server on http://localhost:3000
- Frontend development server on http://localhost:5173

#### Production Mode

Build and start the application:

```bash
npm run build
npm run start
```

## First Steps

### 1. Access the Application

Open your browser and navigate to:
- **Frontend UI**: http://localhost:5173
- **API Documentation**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/api/v1/health

### 2. Upload Your First Spreadsheet

Using the web interface:
1. Drag and drop an Excel or CSV file onto the upload area
2. Wait for the file to be processed
3. View your spreadsheet data in the interactive grid

Using the API:
```bash
curl -X POST http://localhost:3000/api/v1/upload-spreadsheet \
  -F "file=@path/to/your/spreadsheet.xlsx"
```

### 3. Analyze Context

Using the web interface:
1. Select cells or ranges in the spreadsheet viewer
2. Enter a natural language request (e.g., "Help me create a SUM formula")
3. Click "Analyze" to generate context

Using the API:
```bash
curl -X POST http://localhost:3000/api/v1/analyze-context \
  -H "Content-Type: application/json" \
  -d '{
    "request": "Help me create a SUM formula for column C",
    "spreadsheetId": "your-spreadsheet-id",
    "currentSelection": {
      "sheet": "Sheet1",
      "range": "C1:C10",
      "activeCell": "C11"
    }
  }'
```

## Configuration Options

### File Upload Limits

Adjust file upload limits in your `.env` file:

```env
MAX_FILE_SIZE=100MB  # Maximum file size
ALLOWED_FILE_TYPES=.xlsx,.xls,.csv,.tsv  # Allowed file extensions
```

### OpenAI Integration

To enable enhanced AI features:

1. Get an OpenAI API key from https://platform.openai.com/
2. Add it to your backend `.env` file:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```
3. Restart the backend server

### Rate Limiting

Configure API rate limiting:

```env
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100  # Max requests per window
```

## Verification

### Health Check

Verify the system is running correctly:

```bash
curl http://localhost:3000/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "excel-context-engine-backend",
  "version": "1.0.0",
  "uptime": 3600,
  "checks": {
    "database": { "status": "healthy" },
    "openai": { "status": "healthy" },
    "memory": { "status": "healthy" },
    "disk": { "status": "healthy" }
  }
}
```

### Test Upload

Test file upload functionality:

```bash
# Create a simple test CSV
echo "Name,Age,City
John,25,New York
Jane,30,Los Angeles" > test.csv

# Upload the file
curl -X POST http://localhost:3000/api/v1/upload-spreadsheet \
  -F "file=@test.csv"
```

## Next Steps

- Read the [User Guide](./user-guide.md) for detailed usage instructions
- Explore the [API Reference](./api-reference.md) for complete API documentation
- Check out [Examples](./examples.md) for common use cases
- Review the [Deployment Guide](./deployment.md) for production deployment

## Troubleshooting

If you encounter issues, check the [Troubleshooting Guide](./troubleshooting.md) or:

1. **Check logs**: Backend logs are in `backend/logs/`
2. **Verify environment**: Ensure all required environment variables are set
3. **Database connection**: If using PostgreSQL, verify connection settings
4. **Port conflicts**: Ensure ports 3000 and 5173 are available

For additional help, see the [Troubleshooting](./troubleshooting.md) section.