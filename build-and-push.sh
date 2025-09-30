#!/bin/bash

# Build and push Docker image for API Gateway
# Usage: ./build-and-push.sh [tag]

set -e

IMAGE_NAME="fabioctetsuo/video-processor-api-gateway"
TAG=${1:-latest}
FULL_IMAGE="${IMAGE_NAME}:${TAG}"

echo "🔨 Building Docker image: ${FULL_IMAGE}"

# Build the image
docker build -t "${FULL_IMAGE}" .

echo "✅ Build completed successfully"

# Push to Docker Hub
echo "📤 Pushing image to Docker Hub: ${FULL_IMAGE}"
docker push "${FULL_IMAGE}"

echo "🎉 Image pushed successfully: ${FULL_IMAGE}"

# Tag as latest if not already latest
if [ "$TAG" != "latest" ]; then
    echo "🏷️  Tagging as latest"
    docker tag "${FULL_IMAGE}" "${IMAGE_NAME}:latest"
    docker push "${IMAGE_NAME}:latest"
    echo "✅ Latest tag updated"
fi

echo "🚀 Ready for Kubernetes deployment!"
echo "   Image: ${FULL_IMAGE}"
echo "   To deploy: kubectl apply -k k8s/"