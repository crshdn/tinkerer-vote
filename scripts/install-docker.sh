#!/bin/bash
# Secure Docker Installation Script
# For Debian/Ubuntu systems

set -e

echo "=== Secure Docker Installation ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    error "This script must be run as root (use sudo)"
fi

# Get the actual user (not root)
ACTUAL_USER="${SUDO_USER:-$USER}"
if [ "$ACTUAL_USER" = "root" ]; then
    error "Run this script with sudo from a non-root user"
fi

echo "Installing Docker for user: $ACTUAL_USER"
echo ""

# Remove old versions
echo "Removing old Docker versions..."
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
status "Old versions removed"

# Install prerequisites
echo "Installing prerequisites..."
apt-get update
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
status "Prerequisites installed"

# Add Docker's official GPG key
echo "Adding Docker GPG key..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
status "GPG key added"

# Set up repository
echo "Setting up Docker repository..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null
status "Repository configured"

# Install Docker
echo "Installing Docker..."
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
status "Docker installed"

# Configure Docker daemon for security
echo "Configuring Docker daemon..."
mkdir -p /etc/docker
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "no-new-privileges": true,
  "live-restore": true,
  "userland-proxy": false
}
EOF
status "Daemon configured"

# Restart Docker
systemctl restart docker
systemctl enable docker
status "Docker service enabled"

# Add user to docker group
echo "Adding $ACTUAL_USER to docker group..."
usermod -aG docker "$ACTUAL_USER"
status "User added to docker group"

# Security: Ensure Docker socket permissions
chmod 660 /var/run/docker.sock
chown root:docker /var/run/docker.sock
status "Socket permissions secured"

# Verify installation
echo ""
echo "Verifying installation..."
docker --version
docker compose version
status "Docker installation verified"

echo ""
echo "=== Docker Installation Complete ==="
echo ""
echo -e "${YELLOW}IMPORTANT:${NC} Log out and log back in for group changes to take effect."
echo "Or run: newgrp docker"
echo ""
echo "Test with: docker run hello-world"
echo ""
