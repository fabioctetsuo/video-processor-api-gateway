# API Gateway Kubernetes Deployment

This directory contains Kubernetes manifests for deploying the API Gateway service.

## Architecture

- **API Gateway**: Main gateway service (3+ replicas with HPA)
- **Ingress**: HTTP/HTTPS traffic routing
- **Service Dependencies**: Auth Service, Video Processor API

## Prerequisites

1. Kubernetes cluster (1.21+)
2. kubectl configured
3. NGINX Ingress Controller installed
4. Auth Service deployed in `video-processor-auth` namespace
5. Video Processor API deployed in `video-processor` namespace
6. Docker image built and pushed to `fabioctetsuo/video-processor-api-gateway`

## Quick Deploy

```bash
# Apply all resources
kubectl apply -k .

# Or apply individually
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f api-gateway-deployment.yaml
kubectl apply -f api-gateway-service.yaml
kubectl apply -f api-gateway-hpa.yaml
kubectl apply -f ingress.yaml
```

## Verification

```bash
# Check all pods are running
kubectl get pods -n video-processor-gateway

# Check services
kubectl get svc -n video-processor-gateway

# Check ingress
kubectl get ingress -n video-processor-gateway

# Check HPA status
kubectl get hpa -n video-processor-gateway

# View logs
kubectl logs -n video-processor-gateway deployment/api-gateway -f
```

## Configuration

### Service URLs
Update `configmap.yaml` with correct service URLs:
- `AUTH_SERVICE_URL`: Points to auth service in cluster
- `VIDEO_SERVICE_URL`: Points to video processor API in cluster

### Ingress
Configure `ingress.yaml`:
- Update host domain
- Configure TLS certificates if needed
- Adjust resource limits for file uploads

## Scaling

The service includes Horizontal Pod Autoscaler (HPA):
- Min replicas: 3
- Max replicas: 15
- CPU target: 60%
- Memory target: 70%

## Access

### Via LoadBalancer
```bash
# Get external IP
kubectl get svc api-gateway -n video-processor-gateway
```

### Via Ingress
```bash
# Add to /etc/hosts (for local testing)
echo "$(kubectl get ingress api-gateway-ingress -n video-processor-gateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}') video-processor-api.local" >> /etc/hosts

# Access via browser or curl
curl http://video-processor-api.local/
```

### Port Forward (Development)
```bash
kubectl port-forward svc/api-gateway 3001:3001 -n video-processor-gateway
```

## Monitoring

Health check endpoints:
- Liveness: `GET /`
- Readiness: `GET /`

## Dependencies

The service waits for dependencies using init containers:
- Auth Service must be available
- Video Processor API must be available

## Cleanup

```bash
# Delete all resources
kubectl delete -k .
```