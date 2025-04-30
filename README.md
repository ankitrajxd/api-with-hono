# REST API with Hono🔥

A modern API built with Deno and Hono.js that implements advanced functionality for building web applications.

## Overview

This project is a RESTful API that provides essential backend services and showcases implementation of:

- Authentication with JWT
- **Single device session enforcement** with Redis
- Middleware for request validation
- **Rate limiting** for API protection
- Webhook handling
- Protected routes
- **Google OAuth login**
- **Request spam protection**
- **CSRF protection middleware**

This API serves as a foundation for developers building modern web applications, providing ready-to-use implementations of common backend requirements.

## Tech Stack

- **Deno**: A secure runtime for JavaScript and TypeScript
- **Hono.js**: A lightweight web framework
- **Redis**: For session storage
- **jose**: For JWT authentication
- **JSR modules**: Modern JavaScript/TypeScript package management

## Features

### Authentication

- JWT-based authentication system
- Login/logout functionality
- **Single device session management**:
  - Sessions are stored in Redis
  - New login attempts are rejected if a user is already logged in on another device
  - Option to invalidate previous sessions when logging in from a new device
  - Session verification on protected routes
- **Google OAuth login**:
  - `/auth/google` initiates Google OAuth
  - `/auth/google/callback` handles the callback and session creation

### Middleware

- Authentication middleware for protected routes
- Request spam protection middleware with IP-based filtering and logging
- **Rate limiting middleware**:
  - IP-based request tracking
  - Configurable request limits (currently 3 requests per minute)
  - Time-window based throttling
  - Prevents API abuse and DDoS attacks
- **CSRF protection middleware**:
  - Checks CSRF token for POST, PUT, DELETE requests
  - CSRF tokens are stored in Redis and validated per session

### Webhooks

- Endpoint for receiving and processing GitHub webhooks (`/webhook`)
- Storage and retrieval of webhook data

### API Routes

- Public routes
- Protected routes requiring authentication
- Authentication endpoints
- Google OAuth endpoints
- Webhook endpoints

## Single Device Session Implementation

This API implements a security feature that restricts user access to a single device at a time. Here's how it works:

1. When a user logs in, their JWT session token is stored in Redis
2. On subsequent login attempts from different devices:
   - The system checks Redis for an existing session
   - If a session exists, the new login attempt is rejected with a 401 status
   - Alternatively, the implementation can be modified to invalidate the previous session

This approach improves security by preventing session hijacking and unauthorized access from multiple locations.

## Getting Started

### Prerequisites

- Deno runtime
- Redis instance (configuration in `.env` file)

### Environment Setup

Create a `.env` file with the following variables:

```
REDIS_HOST='your-redis-host'
REDIS_USERNAME='your-redis-username'
REDIS_PASSWORD='your-redis-password'

# Google OAuth
GOOGLE_CLIENT_ID='your-google-client-id'
GOOGLE_CLIENT_SECRET='your-google-client-secret'
```

### Running the Application

```bash
# Development mode with watch
deno task dev
```

The server will start on port 3000.

## API Endpoints

- `GET /`: Hello world endpoint
- `POST /auth/login`: Authenticate and get a session cookie
- `POST /auth/logout`: End the current session
- `GET /auth/google`: Start Google OAuth login
- `GET /auth/google/callback`: Google OAuth callback
- `GET /protected`: Example of a protected route (requires authentication)
- `POST /webhook`: Endpoint for receiving GitHub webhooks
- `GET /webhook`: Retrieve the most recent webhook data

## Security Notes

- JWT secret should be stored as an environment variable in production
- The single device session implementation prevents concurrent logins across multiple devices
- IP-based request filtering is available but commented out in the code
- CSRF protection is enabled for state-changing requests (POST, PUT, DELETE)
- Session and CSRF tokens are stored in Redis for secure validation
