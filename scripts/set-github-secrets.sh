#!/bin/bash

# Script to set GitHub secrets from secrets.txt file
# Usage: ./set-github-secrets.sh [repository]

set -e

# Default repository if not provided
DEFAULT_REPO="fabioctetsuo/video-processor-api-gateway"

# Get repository from command line argument or use default
REPO="${1:-$DEFAULT_REPO}"

# Check if secrets.txt exists
if [ ! -f "secrets.txt" ]; then
    echo "Error: secrets.txt file not found in current directory"
    echo "Please make sure you're running this script from the directory containing secrets.txt"
    exit 1
fi

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed"
    echo "Please install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated with GitHub CLI
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI"
    echo "Please run: gh auth login"
    exit 1
fi

echo "Setting GitHub secrets for repository: $REPO"
echo "Reading secrets from: secrets.txt"
echo ""

# Counter for tracking progress
count=0
total=$(wc -l < secrets.txt)

# Read secrets.txt and set each secret
while IFS='=' read -r name value; do
    # Skip empty lines and comments
    if [[ -z "$name" || "$name" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    # Trim whitespace
    name=$(echo "$name" | xargs)
    value=$(echo "$value" | xargs)
    
    # Skip if name is empty after trimming
    if [[ -z "$name" ]]; then
        continue
    fi
    
    count=$((count + 1))
    echo "[$count/$total] Setting secret: $name"
    
    # Set the secret using GitHub CLI
    if gh secret set "$name" -b"$value" --repo "$REPO"; then
        echo "  ✓ Successfully set secret: $name"
    else
        echo "  ✗ Failed to set secret: $name"
        exit 1
    fi
done < secrets.txt

echo ""
echo "✅ Successfully set $count GitHub secrets for repository: $REPO" 