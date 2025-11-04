#!/bin/bash
#
# Hoser Video - Raspberry Pi Uninstallation Script
# Removes Hoser Video and all configuration files
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

confirm_uninstall() {
    print_header "Hoser Video - Uninstaller"
    echo ""
    print_warning "This will remove Hoser Video and all configuration files"
    echo ""
    read -p "Are you sure you want to continue? (y/N) " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_msg "Uninstallation cancelled"
        exit 0
    fi
}

stop_service() {
    print_header "Stopping Service"
    
    if systemctl is-active --quiet "hoser-video@$USER.service"; then
        print_msg "Stopping Hoser Video service..."
        sudo systemctl stop "hoser-video@$USER.service"
    fi
    
    if systemctl is-enabled --quiet "hoser-video@$USER.service" 2>/dev/null; then
        print_msg "Disabling service..."
        sudo systemctl disable "hoser-video@$USER.service"
    fi
}

remove_systemd() {
    print_header "Removing Systemd Service"
    
    if [ -f "/etc/systemd/system/hoser-video@.service" ]; then
        print_msg "Removing service file..."
        sudo rm -f /etc/systemd/system/hoser-video@.service
        sudo systemctl daemon-reload
    fi
}

remove_application() {
    print_header "Removing Application"
    
    if [ -L "/usr/bin/hoser-video" ]; then
        print_msg "Removing symlink..."
        sudo rm -f /usr/bin/hoser-video
    fi
    
    if [ -d "/opt/hoser-video" ]; then
        print_msg "Removing installation directory..."
        sudo rm -rf /opt/hoser-video
    fi
    
    if [ -f "/usr/share/applications/hoser-video.desktop" ]; then
        print_msg "Removing desktop file..."
        sudo rm -f /usr/share/applications/hoser-video.desktop
    fi
}

remove_config() {
    print_header "Removing Configuration Files"
    
    read -p "Remove user configuration and data? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -d "$HOME/.config/hoser-video" ]; then
            print_msg "Removing config directory..."
            rm -rf "$HOME/.config/hoser-video"
        fi
        
        if [ -d "$HOME/.local/share/hoser-video" ]; then
            print_msg "Removing data directory..."
            rm -rf "$HOME/.local/share/hoser-video"
        fi
        
        # Remove database folders from drives
        print_msg "Removing database folders from drives..."
        for mount in /media/* /mnt/*; do
            if [ -d "$mount/.hoser-video" ]; then
                rm -rf "$mount/.hoser-video" 2>/dev/null || true
            fi
        done
    else
        print_msg "Keeping user configuration and data"
    fi
}

remove_autologin() {
    print_header "Removing Auto-login (Optional)"
    
    if [ -f "/etc/systemd/system/getty@tty1.service.d/autologin.conf" ]; then
        read -p "Remove auto-login configuration? (y/N) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_msg "Removing auto-login..."
            sudo rm -f /etc/systemd/system/getty@tty1.service.d/autologin.conf
            sudo rmdir /etc/systemd/system/getty@tty1.service.d 2>/dev/null || true
        fi
    fi
}

remove_x11() {
    print_header "Removing X11 Configuration (Optional)"
    
    if [ -f "$HOME/.xinitrc" ] && grep -q "hoser-video" "$HOME/.xinitrc"; then
        read -p "Remove X11 autostart configuration? (y/N) " -n 1 -r
        echo
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_msg "Removing .xinitrc..."
            rm -f "$HOME/.xinitrc"
            
            if [ -f "$HOME/.bash_profile" ] && grep -q "startx" "$HOME/.bash_profile"; then
                print_msg "Cleaning .bash_profile..."
                sed -i '/Start X11 on login/,/fi/d' "$HOME/.bash_profile"
            fi
        fi
    fi
}

print_completion() {
    print_header "Uninstallation Complete"
    echo ""
    print_msg "Hoser Video has been removed successfully"
    echo ""
    print_warning "Note: Dependencies (cec-utils, mpv, etc.) were NOT removed"
    print_msg "To remove dependencies, run: sudo apt autoremove"
    echo ""
}

main() {
    confirm_uninstall
    stop_service
    remove_systemd
    remove_application
    remove_config
    remove_autologin
    remove_x11
    print_completion
}

main "$@"
