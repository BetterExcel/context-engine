# Excel Context Engine

An intelligent system that analyzes user requests in spreadsheet environments and automatically determines the optimal context to provide to an LLM for accurate and relevant responses.

## Project Structure

This is a monorepo containing:

- `backend/` - Node.js/TypeScript API server with Express.js
- `frontend/` - React/TypeScript frontend with Vite

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp backend/.env.example backend/.env
```

3. Start development servers:

```bash
npm run dev
```

This will start both the backend (port 3001) and frontend (port 3000) in development mode.

## Available Scripts

### Root Level

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both backend and frontend for production
- `npm run test` - Run tests for both backend and frontend
- `npm run lint` - Lint both backend and frontend
- `npm run format` - Format code with Prettier

### Backend Only

- `npm run dev:backend` - Start backend development server
- `npm run build:backend` - Build backend for production
- `npm run test:backend` - Run backend tests

### Frontend Only

- `npm run dev:frontend` - Start frontend development server
- `npm run build:frontend` - Build frontend for production
- `npm run test:frontend` - Run frontend tests

## Technology Stack

### Backend

- Node.js with TypeScript
- Express.js for REST API
- Jest for testing
- ESLint + Prettier for code quality

### Frontend

- React with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Vitest for testing
- ESLint + Prettier for code quality

## Development

The project is set up with:

- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Jest/Vitest for testing
- Hot reload for development

## API Endpoints

- `GET /api/v1/health` - Health check endpoint

More endpoints will be added as development progresses.
