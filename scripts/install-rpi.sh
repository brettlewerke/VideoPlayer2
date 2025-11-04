#!/bin/bash
#
# Hoser Video - Raspberry Pi Installation Script
# Installs and configures Hoser Video as a kiosk media center
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Hoser Video"
INSTALL_DIR="/opt/hoser-video"
USER_HOME="$HOME"
CONFIG_DIR="$USER_HOME/.config/hoser-video"
DATA_DIR="$USER_HOME/.local/share/hoser-video"

# Print colored message
print_msg() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check if running on Raspberry Pi
check_raspberry_pi() {
    print_header "Checking Platform"
    
    if [ -f /proc/device-tree/model ]; then
        MODEL=$(tr -d '\0' < /proc/device-tree/model)
        if echo "$MODEL" | grep -q "Raspberry Pi"; then
            print_msg "Detected: $MODEL"
            return 0
        fi
    fi
    
    print_warning "Not running on Raspberry Pi. Installation will continue but may not work optimally."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

# Update system
update_system() {
    print_header "Updating System"
    print_msg "Running apt update..."
    sudo apt update
    print_msg "System updated successfully"
}

# Install dependencies
install_dependencies() {
    print_header "Installing Dependencies"
    
    local packages=(
        # CEC support for TV remote control
        "cec-utils"
        "libcec-dev"
        "libcec6"
        
        # MPV player with hardware acceleration
        "mpv"
        "libmpv-dev"
        
        # FFmpeg for video processing
        "ffmpeg"
        
        # Graphics and display
        "xorg"
        "xinit"
        "x11-xserver-utils"
        "unclutter"  # Hide mouse cursor
        
        # System utilities
        "curl"
        "wget"
        "git"
        
        # Audio support
        "alsa-utils"
        "pulseaudio"
    )
    
    print_msg "Installing required packages..."
    for package in "${packages[@]}"; do
        if dpkg -l | grep -q "^ii  $package "; then
            echo "  ✓ $package (already installed)"
        else
            echo "  → Installing $package..."
            sudo apt install -y "$package" > /dev/null 2>&1
        fi
    done
    
    print_msg "All dependencies installed successfully"
}

# Install Hoser Video
install_hoser_video() {
    print_header "Installing Hoser Video"
    
    # Check if AppImage exists in current directory
    APPIMAGE=$(find . -maxdepth 1 -name "hoser-video-*.AppImage" -type f | head -n 1)
    
    if [ -z "$APPIMAGE" ]; then
        print_error "No AppImage found in current directory"
        print_msg "Please download the Linux AppImage from the releases page"
        exit 1
    fi
    
    print_msg "Found: $(basename "$APPIMAGE")"
    
    # Create installation directory
    print_msg "Creating installation directory..."
    sudo mkdir -p "$INSTALL_DIR"
    
    # Copy AppImage to installation directory
    print_msg "Installing Hoser Video..."
    sudo cp "$APPIMAGE" "$INSTALL_DIR/hoser-video.AppImage"
    sudo chmod +x "$INSTALL_DIR/hoser-video.AppImage"
    
    # Create symlink for easy access
    sudo ln -sf "$INSTALL_DIR/hoser-video.AppImage" /usr/bin/hoser-video
    
    print_msg "Hoser Video installed to $INSTALL_DIR"
}

# Create configuration files
create_config() {
    print_header "Creating Configuration"
    
    # Create config directory
    mkdir -p "$CONFIG_DIR"
    mkdir -p "$DATA_DIR"
    
    # Create kiosk configuration file
    cat > "$CONFIG_DIR/kiosk.json" << EOF
{
  "kioskMode": true,
  "fullscreen": true,
  "hideCursor": true,
  "cursorTimeout": 3000,
  "enableCEC": true,
  "autoScan": true,
  "scanInterval": 300,
  "theme": "dark",
  "fontSize": "large",
  "navigation": "remote"
}
EOF
    
    print_msg "Configuration created at $CONFIG_DIR/kiosk.json"
}

# Setup systemd service
setup_systemd() {
    print_header "Setting up Systemd Service"
    
    local SERVICE_FILE="/etc/systemd/system/hoser-video@.service"
    
    # Copy service file
    if [ -f "systemd/hoser-video.service" ]; then
        print_msg "Installing systemd service..."
        sudo cp systemd/hoser-video.service "$SERVICE_FILE"
    else
        print_error "systemd/hoser-video.service not found"
        exit 1
    fi
    
    # Reload systemd
    print_msg "Reloading systemd daemon..."
    sudo systemctl daemon-reload
    
    # Enable service for current user
    print_msg "Enabling service for user: $USER"
    sudo systemctl enable "hoser-video@$USER.service"
    
    print_msg "Systemd service configured successfully"
    print_warning "Service will start automatically on next boot"
}

# Configure auto-login
configure_autologin() {
    print_header "Configuring Auto-login (Optional)"
    
    read -p "Enable auto-login for kiosk mode? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_msg "Configuring auto-login for user: $USER"
        
        # Create systemd override directory
        sudo mkdir -p /etc/systemd/system/getty@tty1.service.d
        
        # Create override configuration
        sudo tee /etc/systemd/system/getty@tty1.service.d/autologin.conf > /dev/null << EOF
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin $USER --noclear %I \$TERM
EOF
        
        print_msg "Auto-login configured"
    else
        print_msg "Skipping auto-login configuration"
    fi
}

# Configure X11 autostart
configure_x11() {
    print_header "Configuring X11 Autostart"
    
    read -p "Start X11 automatically? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Create .xinitrc
        cat > "$USER_HOME/.xinitrc" << EOF
#!/bin/sh
# Hoser Video Kiosk Mode

# Disable screen blanking
xset s off
xset -dpms
xset s noblank

# Hide mouse cursor after 3 seconds of inactivity
unclutter -idle 3 &

# Start Hoser Video
exec hoser-video --no-sandbox --kiosk
EOF
        chmod +x "$USER_HOME/.xinitrc"
        
        # Add startx to .bash_profile if not in SSH
        if ! grep -q "startx" "$USER_HOME/.bash_profile" 2>/dev/null; then
            cat >> "$USER_HOME/.bash_profile" << 'EOF'

# Start X11 on login (if not in SSH session)
if [ -z "$DISPLAY" ] && [ -z "$SSH_CONNECTION" ] && [ "$(tty)" = "/dev/tty1" ]; then
    exec startx
fi
EOF
        fi
        
        print_msg "X11 autostart configured"
    else
        print_msg "Skipping X11 autostart"
    fi
}

# Configure CEC
configure_cec() {
    print_header "Configuring HDMI-CEC"
    
    # Add user to video group for CEC access
    print_msg "Adding $USER to video group..."
    sudo usermod -a -G video "$USER"
    
    # Test CEC
    print_msg "Testing CEC connection..."
    if echo "quit" | cec-client -s -d 1 2>&1 | grep -q "detected"; then
        print_msg "CEC adapter detected successfully"
    else
        print_warning "CEC adapter not detected. Check HDMI connection."
    fi
    
    print_msg "CEC configuration complete"
}

# Setup media directories
setup_media_directories() {
    print_header "Setting up Media Directories"
    
    print_msg "Creating common mount points..."
    sudo mkdir -p /media/usb
    sudo mkdir -p /media/nas
    sudo mkdir -p /mnt/movies
    sudo mkdir -p /mnt/tv
    
    # Set permissions
    sudo chown "$USER:$USER" /media/usb /media/nas /mnt/movies /mnt/tv 2>/dev/null || true
    
    print_msg "Media directories created"
}

# Print completion message
print_completion() {
    print_header "Installation Complete!"
    
    echo ""
    print_msg "Hoser Video has been installed successfully"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "  1. Reboot your Raspberry Pi: ${GREEN}sudo reboot${NC}"
    echo "  2. Hoser Video will start automatically"
    echo "  3. Use your TV remote to control the app"
    echo ""
    echo -e "${BLUE}Manual Commands:${NC}"
    echo "  Start service:   ${GREEN}sudo systemctl start hoser-video@$USER${NC}"
    echo "  Stop service:    ${GREEN}sudo systemctl stop hoser-video@$USER${NC}"
    echo "  View logs:       ${GREEN}journalctl -u hoser-video@$USER -f${NC}"
    echo "  Run manually:    ${GREEN}hoser-video${NC}"
    echo ""
    echo -e "${BLUE}Configuration Files:${NC}"
    echo "  Config:  $CONFIG_DIR/kiosk.json"
    echo "  Data:    $DATA_DIR"
    echo "  Service: /etc/systemd/system/hoser-video@.service"
    echo ""
    echo -e "${YELLOW}Note:${NC} You may need to log out and back in for group changes to take effect"
    echo ""
}

# Main installation flow
main() {
    echo ""
    print_header "Hoser Video - Raspberry Pi Installer"
    echo ""
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Do not run this script as root"
        print_msg "Run as a regular user: ./install-rpi.sh"
        exit 1
    fi
    
    # Run installation steps
    check_raspberry_pi
    update_system
    install_dependencies
    install_hoser_video
    create_config
    setup_systemd
    configure_autologin
    configure_x11
    configure_cec
    setup_media_directories
    print_completion
}

# Run main installation
main "$@"
