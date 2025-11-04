# Hoser Video - Raspberry Pi Setup Guide

Transform your Raspberry Pi into a dedicated media center with Hoser Video! This guide covers installation, configuration, and troubleshooting for running Hoser Video on Raspberry Pi as a TV kiosk.

## 📋 Table of Contents

- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Detailed Installation](#detailed-installation)
- [Configuration](#configuration)
- [TV Remote Control (HDMI-CEC)](#tv-remote-control-hdmi-cec)
- [Auto-Start Setup](#auto-start-setup)
- [Troubleshooting](#troubleshooting)
- [Performance Tuning](#performance-tuning)
- [Uninstallation](#uninstallation)

## 🎯 Requirements

### Hardware
- **Raspberry Pi 4** (4GB or 8GB RAM recommended) or **Raspberry Pi 5**
- Raspberry Pi 3 B+ is supported but with limited hardware acceleration
- microSD card (32GB+ recommended)
- HDMI cable connected to TV
- USB storage or network storage with media files
- (Optional) IR remote or USB keyboard for initial setup

### Software
- **Raspberry Pi OS** (64-bit recommended)
  - Raspberry Pi OS Lite for dedicated kiosk
  - Raspberry Pi OS with Desktop for dual-purpose use
- Internet connection for installation

### Supported Features by Model

| Feature | Pi 3 B+ | Pi 4 | Pi 5 |
|---------|---------|------|------|
| H.264 Hardware Decode | ✅ | ✅ | ✅ |
| HEVC/H.265 Hardware Decode | ❌ | ✅ | ✅ |
| 4K Video Playback | ❌ | ✅ (30fps) | ✅ (60fps) |
| HDMI-CEC | ✅ | ✅ | ✅ |
| Multiple Drives | ✅ | ✅ | ✅ |

## 🚀 Quick Start

```bash
# 1. Download the installer
cd ~/Downloads
wget https://github.com/brettlewerke/VideoPlayer2/releases/latest/download/hoser-video-linux-arm64.AppImage

# 2. Download the installation script
wget https://raw.githubusercontent.com/brettlewerke/VideoPlayer2/main/scripts/install-rpi.sh
chmod +x install-rpi.sh

# 3. Run the installer
./install-rpi.sh

# 4. Reboot
sudo reboot
```

That's it! Hoser Video will start automatically on boot.

## 📦 Detailed Installation

### Step 1: Prepare Your Raspberry Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required tools
sudo apt install -y curl wget git
```

### Step 2: Download Hoser Video

Download the latest AppImage from the [releases page](https://github.com/brettlewerke/VideoPlayer2/releases):

```bash
cd ~/Downloads

# For 64-bit Pi OS (recommended)
wget https://github.com/brettlewerke/VideoPlayer2/releases/latest/download/hoser-video-3.2.11-arm64.AppImage

# For 32-bit Pi OS
wget https://github.com/brettlewerke/VideoPlayer2/releases/latest/download/hoser-video-3.2.11-armv7l.AppImage
```

### Step 3: Run the Installer

The installer will:
- Install all dependencies (CEC, MPV, FFmpeg, etc.)
- Set up Hoser Video in `/opt/hoser-video`
- Configure systemd service for auto-start
- Set up TV remote control (HDMI-CEC)
- Configure kiosk mode

```bash
# Make installer executable
chmod +x install-rpi.sh

# Run installer
./install-rpi.sh
```

Follow the prompts:
- ✅ Enable auto-login? (Recommended for kiosk mode)
- ✅ Start X11 automatically? (Recommended for kiosk mode)

### Step 4: Reboot

```bash
sudo reboot
```

Hoser Video will start automatically!

## ⚙️ Configuration

### Kiosk Configuration File

Edit `~/.config/hoser-video/kiosk.json`:

```json
{
  "kiosk": {
    "enabled": true,
    "fullscreen": true,
    "hideCursor": true
  },
  "cec": {
    "enabled": true,
    "turnOnTVOnStart": false,
    "setActiveSourceOnStart": true
  },
  "scanning": {
    "autoScan": true,
    "scanOnMount": true,
    "mountPoints": [
      "/media/usb",
      "/media/nas"
    ]
  }
}
```

### Display Settings

Adjust for your TV:

```json
{
  "display": {
    "fontSize": "large",
    "fontScale": 1.5,
    "uiScale": 1.3,
    "highlightColor": "#00A8FF"
  }
}
```

### Player Configuration

Optimize for Raspberry Pi:

```json
{
  "player": {
    "hardwareAcceleration": "auto",
    "mpvOptions": {
      "hwdec": "auto-safe",
      "vo": "gpu",
      "cache": true
    }
  }
}
```

## 📺 TV Remote Control (HDMI-CEC)

### Enable CEC on Your TV

1. Go to TV settings
2. Look for "HDMI-CEC", "Anynet+", "Bravia Sync", or similar
3. Enable the feature
4. Connect Raspberry Pi via HDMI

### Supported Buttons

| TV Remote | Action |
|-----------|--------|
| ↑ ↓ ← → | Navigate menus |
| OK/Enter | Select/Play |
| Back | Go back |
| Play/Pause | Toggle playback |
| Stop | Stop playback |
| Fast Forward | Skip forward 10s |
| Rewind | Skip backward 10s |
| Number keys | Quick jump (0-9) |

### Test CEC Connection

```bash
# Check if CEC is detected
echo "scan" | cec-client -s -d 1

# You should see your TV listed
# Example output:
# device #0: TV
# device #1: Raspberry Pi
```

### Troubleshooting CEC

If CEC doesn't work:

1. **Check HDMI cable**: Use a high-quality HDMI cable
2. **Enable CEC on TV**: Look in TV settings for CEC/Anynet+/Bravia Sync
3. **Check permissions**:
   ```bash
   groups | grep video  # Should show 'video' group
   ```
4. **Check device**:
   ```bash
   ls -l /dev/cec*  # Should show /dev/cec0
   ```

## 🔄 Auto-Start Setup

### Systemd Service

Hoser Video is installed as a systemd service:

```bash
# Check service status
systemctl status hoser-video@$USER

# View logs
journalctl -u hoser-video@$USER -f

# Start/stop manually
sudo systemctl start hoser-video@$USER
sudo systemctl stop hoser-video@$USER

# Disable auto-start
sudo systemctl disable hoser-video@$USER
```

### Manual Start

If you disabled auto-start:

```bash
# Start from terminal
hoser-video

# Start in kiosk mode
hoser-video --kiosk
```

## 🔧 Troubleshooting

### Video Won't Play

**Black screen or stuttering video:**

```bash
# Check hardware acceleration
hoser-video --version

# View player logs
journalctl -u hoser-video@$USER | grep -i mpv
```

**For H.265/HEVC on Pi 4:**
- Ensure you have the latest firmware
- Check `config.txt` for hardware decode support

### Audio Issues

**No audio output:**

```bash
# Check audio devices
aplay -l

# Set default audio output to HDMI
sudo raspi-config
# Select: System Options → Audio → HDMI
```

**Audio/video out of sync:**
- This is usually due to codec compatibility
- Try enabling hardware acceleration in settings

### CEC Not Working

```bash
# Reinstall CEC packages
sudo apt install --reinstall cec-utils libcec6

# Add user to video group
sudo usermod -a -G video $USER

# Reboot
sudo reboot
```

### App Crashes on Start

```bash
# View crash logs
journalctl -u hoser-video@$USER --since "10 minutes ago"

# Check GPU memory (should be 128MB+)
vcgencmd get_mem gpu

# Increase GPU memory if needed
sudo raspi-config
# Performance Options → GPU Memory → 256
```

### High CPU Usage

```bash
# Check if hardware acceleration is enabled
cat ~/.config/hoser-video/kiosk.json | grep hardwareAcceleration

# Should show: "hardwareAcceleration": "auto"
```

### Drives Not Detected

```bash
# Check mounted drives
lsblk

# Manually mount USB drive
sudo mount /dev/sda1 /media/usb

# Check scanning logs
journalctl -u hoser-video@$USER | grep -i scan
```

## ⚡ Performance Tuning

### Raspberry Pi 4/5

Recommended `/boot/config.txt` settings:

```ini
# GPU Memory (256MB for 4K video)
gpu_mem=256

# Enable hardware acceleration
dtoverlay=vc4-kms-v3d

# Overclock (Pi 4 - use at your own risk)
over_voltage=2
arm_freq=1750

# Disable unnecessary features for kiosk
dtparam=audio=off  # If using HDMI audio
disable_splash=1
boot_delay=0
```

### Raspberry Pi 3

```ini
# GPU Memory
gpu_mem=128

# Use legacy graphics driver for better compatibility
dtoverlay=vc4-fkms-v3d
```

### Optimize for 24/7 Operation

```bash
# Disable screen blanking
sudo nano /etc/xdg/lxsession/LXDE-pi/autostart
# Add:
@xset s noblank
@xset s off
@xset -dpms

# Reduce SD card writes
sudo nano /etc/fstab
# Add to tmpfs mounts:
tmpfs /tmp tmpfs defaults,noatime,nosuid,size=100m 0 0
tmpfs /var/tmp tmpfs defaults,noatime,nosuid,size=30m 0 0
```

### Network Storage Performance

For NAS/network drives:

```bash
# Install NFS client
sudo apt install nfs-common

# Mount NFS share
sudo mkdir -p /media/nas
sudo mount -t nfs nas-ip:/path/to/share /media/nas

# Add to /etc/fstab for auto-mount
nas-ip:/path/to/share /media/nas nfs defaults,_netdev,auto 0 0
```

## 🗑️ Uninstallation

```bash
# Run uninstall script
cd ~/Downloads
./uninstall-rpi.sh

# Or manually remove
sudo systemctl stop hoser-video@$USER
sudo systemctl disable hoser-video@$USER
sudo rm -f /etc/systemd/system/hoser-video@.service
sudo rm -rf /opt/hoser-video
sudo rm -f /usr/bin/hoser-video
rm -rf ~/.config/hoser-video
rm -rf ~/.local/share/hoser-video
```

## 📚 Additional Resources

- [Hoser Video Documentation](https://github.com/brettlewerke/VideoPlayer2)
- [Raspberry Pi Forums](https://forums.raspberrypi.com/)
- [HDMI-CEC Documentation](https://www.cec-o-matic.com/)
- [Issue Tracker](https://github.com/brettlewerke/VideoPlayer2/issues)

## 💡 Tips & Tricks

### Using Multiple Storage Drives

```bash
# Create mount points
sudo mkdir -p /media/movies /media/tv

# Auto-mount USB drives with udev rule
sudo nano /etc/udev/rules.d/99-usb-automount.rules
# Add:
ACTION=="add", KERNEL=="sd[a-z][0-9]", RUN+="/usr/bin/systemctl start usb-mount@%k.service"
```

### Backup Your Library

```bash
# Backup database and configuration
tar -czf hoser-video-backup.tar.gz \
  ~/.local/share/hoser-video \
  ~/.config/hoser-video

# Restore backup
tar -xzf hoser-video-backup.tar.gz -C ~/
```

### Remote Access

```bash
# Access via VNC for remote management
sudo apt install realvnc-vnc-server
sudo raspi-config
# Interface Options → VNC → Enable
```

## 🎉 Enjoy!

Your Raspberry Pi is now a powerful media center! Use your TV remote to navigate and enjoy your movie collection.

For support, visit our [GitHub Discussions](https://github.com/brettlewerke/VideoPlayer2/discussions).
