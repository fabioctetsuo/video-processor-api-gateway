# API Gateway - Video Processing System

A NestJS-based API Gateway that serves as the entry point for the Video Processing microservices architecture. It provides authentication, authorization, and routing to backend services.

## 📋 Overview

The API Gateway acts as a unified entry point for client applications, handling:

- **Authentication & Authorization**: User registration, login, token validation
- **Video Processing Operations**: Upload, processing status, download results
- **Request Routing**: Forwards requests to appropriate microservices
- **API Documentation**: Auto-generated Swagger/OpenAPI documentation
- **Monitoring**: Prometheus metrics and health checks

## 🏗️ Architecture

```
Client Applications
        ↓
    API Gateway (Port 3001)
        ↓
    ┌─────────────────┬──────────────────┐
    ↓                 ↓                  ↓
Auth Service    Video Processor    Other Services
(Port 3002)        (Port 3000)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker (optional)
- Running instances of:
  - Auth Service (`http://localhost:3002`)
  - Video Processor API (`http://localhost:3000`)

### Local Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run start:dev

# The gateway will be available at http://localhost:3001
```

### Using Docker

```bash
# Build image
docker build -t api-gateway .

# Run container
docker run -p 3001:3001 \
  -e AUTH_SERVICE_URL=http://auth-service:3002 \
  -e VIDEO_SERVICE_URL=http://video-processor:3000 \
  api-gateway
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api-gateway
```

## 📝 API Documentation

Once running, access the interactive API documentation at:
- **Swagger UI**: http://localhost:3001/api

### Available Endpoints

#### Authentication (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - User authentication
- `POST /auth/refresh` - Refresh access token
- `GET /auth/profile` - Get user profile (authenticated)
- `GET /auth/verify` - Verify token validity (authenticated)

#### Video Processing (`/videos`)
- `POST /videos/upload` - Upload 1-3 videos for queued processing
- `POST /videos/upload-single` - Upload and immediately process single video
- `GET /videos` - List user's videos
- `GET /videos/download/:filename` - Download processed frames ZIP
- `GET /videos/status` - Get processing status and queue info
- `GET /videos/queue/stats` - Get detailed queue statistics

#### Health & Monitoring
- `GET /` - Health check endpoint
- `GET /metrics` - Prometheus metrics

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `AUTH_SERVICE_URL` | Auth service URL | `http://localhost:3002` |
| `VIDEO_SERVICE_URL` | Video processor URL | `http://localhost:3000` |
| `JWT_SECRET` | JWT verification secret | - |

### Service Configuration

The gateway forwards requests to backend services:

```typescript
// Auth operations → AUTH_SERVICE_URL
// Video operations → VIDEO_SERVICE_URL
```

## 🛡️ Security

### Authentication
- JWT-based authentication with Bearer tokens
- Protected endpoints require valid JWT token
- User context passed to backend services via `X-User-Id` header

### Authorization
- Role-based access control (USER, ADMIN)
- Request validation using DTOs and decorators
- File upload restrictions and validation

### CORS
- Configured to accept requests from any origin
- Credentials support enabled
- Suitable for development (configure for production)

## 📊 Monitoring & Metrics

### Health Checks
- Docker healthcheck: `curl -f http://localhost:3001/`
- Kubernetes liveness/readiness probes supported

### Prometheus Metrics
- HTTP request duration and count
- Error rates and status codes
- Custom business metrics
- Available at `/metrics` endpoint

## 🐳 Docker Deployment

### Multi-stage Build
```dockerfile
# Builder stage: Install deps & build
FROM node:18-alpine AS builder
# Production stage: Runtime optimized
FROM node:18-alpine AS production
```

### Features
- Optimized for production
- Multi-stage build for smaller image size
- Health check configured
- Non-root user execution

## ☸️ Kubernetes Deployment

Deploy to Kubernetes cluster:

```bash
# Deploy all components
kubectl apply -k k8s/

# Check status
kubectl get pods -n video-processor-gateway
```

### Components
- **Deployment**: 3+ replicas with rolling updates
- **Service**: LoadBalancer/ClusterIP for traffic
- **HPA**: Auto-scaling (3-15 replicas)
- **Ingress**: External HTTP/HTTPS access
- **ConfigMap**: Environment configuration

### Scaling
- **Horizontal Pod Autoscaler**: CPU (60%) and Memory (70%) based
- **Vertical Scaling**: Adjust resource requests/limits
- **Load Balancing**: Service distributes traffic across pods

## 🧪 Testing

### Unit Tests
```bash
# Run unit tests
npm run test

# With coverage
npm run test:cov
```

### E2E Tests
```bash
# Run end-to-end tests
npm run test:e2e
```

### API Testing
```bash
# Health check
curl http://localhost:3001/

# Register user
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'

# Upload video (with auth token)
curl -X POST http://localhost:3001/videos/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "videos=@test-video.mp4"
```

## 🔍 Troubleshooting

### Common Issues

**1. Service Connection Errors**
```bash
# Check service URLs
echo $AUTH_SERVICE_URL
echo $VIDEO_SERVICE_URL

# Test connectivity
curl $AUTH_SERVICE_URL/health
curl $VIDEO_SERVICE_URL/api/v1/health
```

**2. Authentication Issues**
```bash
# Verify JWT secret matches auth service
# Check token expiration
# Validate Bearer token format
```

**3. File Upload Issues**
```bash
# Check file size limits
# Verify file format (MP4, AVI, MOV, etc.)
# Ensure proper Content-Type header
```

### Debug Mode
```bash
# Start with debug logs
npm run start:debug

# View detailed logs
docker-compose logs -f api-gateway
```

### Kubernetes Debugging
```bash
# Check pod status
kubectl get pods -n video-processor-gateway

# View logs
kubectl logs -f deployment/api-gateway -n video-processor-gateway

# Check service connectivity
kubectl exec -it pod-name -n video-processor-gateway -- curl auth-service:3002/health
```

## 📦 Dependencies

### Key Dependencies
- **@nestjs/core**: Web framework
- **@nestjs/axios**: HTTP client for service calls
- **@nestjs/swagger**: API documentation
- **@nestjs/jwt**: JWT token handling
- **multer**: File upload processing
- **prom-client**: Prometheus metrics

### Backend Services
- **Auth Service**: User authentication and authorization
- **Video Processor API**: Video processing and frame extraction

## 🛠️ Development

### Project Structure
```
src/
├── auth/              # Authentication controller & guard
├── video/             # Video processing controller
├── infrastructure/    # Metrics, interceptors
├── app.module.ts      # Main application module
└── main.ts           # Application bootstrap

k8s/                  # Kubernetes manifests
test/                 # E2E tests
```

### Adding New Features
1. Create controller in appropriate module
2. Add DTOs with validation
3. Implement service calls to backend
4. Add Swagger documentation
5. Write tests
6. Update this README

## 📄 License

This project is licensed under the UNLICENSED license.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review logs for error details
3. Verify service connectivity
4. Check Kubernetes/Docker status
5. Create an issue with detailed information

---

*Built with ❤️ using NestJS*