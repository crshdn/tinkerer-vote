#!/bin/bash
# Tinkerer Vote - Deployment Script
# Run this on the server to deploy the application

set -e

echo "=== Tinkerer Vote Deployment ==="
echo ""

# Configuration
APP_DIR="/opt/tinkerer-vote"
REPO_URL="https://github.com/YOUR_USERNAME/tinkerer-vote.git"  # Update this

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}Error: Don't run this script as root.${NC}"
    echo "Run as a regular user with sudo access."
    exit 1
fi

# Function to print status
status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "${RED}[✗]${NC} $1"
    exit 1
}

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    error "Docker is not installed. Run install-docker.sh first."
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    error "Docker Compose is not installed."
fi

status "Docker is installed"

# Create app directory
echo ""
echo "Setting up application directory..."

sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"
status "Created $APP_DIR"

# Copy files (if running locally) or clone repo
if [ -f "./docker-compose.yml" ]; then
    echo "Copying files from current directory..."
    cp -r . "$APP_DIR/"
    status "Files copied"
else
    echo "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
    status "Repository cloned"
fi

cd "$APP_DIR"

# Check for .env file
if [ ! -f ".env" ]; then
    warn ".env file not found!"
    echo ""
    echo "Creating .env from template..."
    cp .env.example .env
    chmod 600 .env
    echo ""
    echo -e "${YELLOW}IMPORTANT: Edit .env file with your credentials:${NC}"
    echo "  nano $APP_DIR/.env"
    echo ""
    echo "Then run this script again."
    exit 0
fi

# Secure .env file
chmod 600 .env
status ".env file secured (permissions: 600)"

# Build and start containers
echo ""
echo "Building Docker image..."
docker compose build
status "Docker image built"

echo ""
echo "Starting containers..."
docker compose up -d
status "Containers started"

# Wait for health check
echo ""
echo "Waiting for application to be healthy..."
sleep 5

if docker compose ps | grep -q "healthy"; then
    status "Application is healthy"
else
    warn "Health check pending... checking logs:"
    docker compose logs --tail=20
fi

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Application URL: https://tinkerer.vote"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f      # View logs"
echo "  docker compose restart      # Restart app"
echo "  docker compose down         # Stop app"
echo "  docker compose pull && docker compose up -d  # Update"
echo ""
