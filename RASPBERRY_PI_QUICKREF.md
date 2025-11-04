# Hoser Video - Raspberry Pi Quick Reference

## 🎮 TV Remote Control

| Button | Action |
|--------|--------|
| ↑ ↓ ← → | Navigate |
| OK/Enter | Select |
| Back | Go Back |
| Play/Pause | Toggle Playback |
| Stop | Stop Video |
| FF/Rewind | Skip ±10s |

## 🔧 Common Commands

### Service Management
```bash
# Check status
systemctl status hoser-video@$USER

# View logs
journalctl -u hoser-video@$USER -f

# Restart service
sudo systemctl restart hoser-video@$USER

# Stop service
sudo systemctl stop hoser-video@$USER
```

### Manual Start
```bash
# Start app
hoser-video

# Start in kiosk mode
hoser-video --kiosk

# Start with debug output
hoser-video --enable-logging
```

### File Locations
```
Config:   ~/.config/hoser-video/kiosk.json
Data:     ~/.local/share/hoser-video/
Service:  /etc/systemd/system/hoser-video@.service
App:      /opt/hoser-video/
```

## 🐛 Quick Troubleshooting

### No Video
```bash
# Check hardware acceleration
vcgencmd get_mem gpu  # Should be 128+

# Increase GPU memory
sudo raspi-config → Performance Options → GPU Memory → 256
```

### No Audio
```bash
# Select HDMI audio
sudo raspi-config → System Options → Audio → HDMI
```

### CEC Not Working
```bash
# Check CEC device
ls -l /dev/cec*

# Test CEC
echo "scan" | cec-client -s -d 1

# Add user to video group
sudo usermod -a -G video $USER
```

### Drives Not Detected
```bash
# List drives
lsblk

# View scan logs
journalctl -u hoser-video@$USER | grep -i scan
```

## 📊 Performance

### Recommended Settings
- **GPU Memory**: 256MB (4K), 128MB (1080p)
- **Hardware Accel**: Enabled (auto)
- **Pi 4**: H.265 supported, 4K@30fps
- **Pi 5**: H.265 supported, 4K@60fps
- **Pi 3**: H.264 only, 1080p max

### Check Performance
```bash
# CPU usage
top

# Temperature
vcgencmd measure_temp

# GPU memory
vcgencmd get_mem gpu
```

## 🔄 Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Download new version
cd /opt/hoser-video
sudo wget https://github.com/.../hoser-video-latest.AppImage
sudo chmod +x hoser-video-latest.AppImage

# Restart service
sudo systemctl restart hoser-video@$USER
```

## 📞 Support

- **Documentation**: See RASPBERRY_PI_SETUP.md
- **Issues**: https://github.com/brettlewerke/VideoPlayer2/issues
- **Logs**: `journalctl -u hoser-video@$USER --since "1 hour ago"`
