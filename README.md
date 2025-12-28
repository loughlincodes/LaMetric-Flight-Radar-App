# ✈️ LaMetric Flight Tracker

**Real-time aircraft notifications for your LaMetric Time clock**

Get push notifications on your LaMetric Time whenever aircraft fly over your house. Perfect for aviation enthusiasts, plane spotters, or anyone curious about what's flying overhead.

![LaMetric Time](https://developer.lametric.com/assets/images/time-logo.png)

## 🎯 What It Does

This app monitors the airspace above your home using the free [OpenSky Network API](https://opensky-network.org/) and sends push notifications to your LaMetric Time clock whenever an aircraft enters your configured radius.

**Each notification shows:**
- ✈️ Flight callsign (e.g., `EIN123`)
- 🛩️ Aircraft type (e.g., `A320`, `B738`)
- 📍 Altitude in feet
- 📏 Distance from your location

The notification displays twice, plays a sound, then automatically dismisses after 8 seconds—returning your LaMetric to its normal clock display.

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   OpenSky API   │────▶│  Flight Monitor  │────▶│  LaMetric Time  │
│   (Aircraft     │     │  (Node.js)       │     │  (Local Push)   │
│    Data)        │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Haversine Calc  │
                        │  (Distance       │
                        │   Filtering)     │
                        └──────────────────┘
```

**Flow:**
1. Every 60 seconds, query OpenSky for aircraft in a bounding box around your home
2. Calculate exact distance using the Haversine formula
3. Filter to aircraft within your configured radius (default: 10 miles)
4. For new aircraft (not recently notified), push to LaMetric
5. Cooldown prevents duplicate notifications (default: 5 minutes per aircraft)

## 📋 Prerequisites

- **LaMetric Time** clock on your local network
- **Node.js** 16+ installed
- Your home's **latitude and longitude**
- LaMetric device **IP address** and **API key**

### Getting Your LaMetric API Key

1. Open the LaMetric mobile app
2. Go to **Settings** → **Your Device** → **API**
3. Note the **Local API key** and **IP address**

Alternatively, find the IP in your router's connected devices list.

## 🚀 Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/lametric-flight-tracker.git
cd lametric-flight-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the template and fill in your values:

```bash
cp env.template .env
```

Edit `.env`:

```env
# LaMetric Device Configuration
LAMETRIC_DEVICE_IP=192.168.1.100    # Your LaMetric's IP address
LAMETRIC_API_KEY=your-api-key-here  # From LaMetric app settings

# Home Location (get from Google Maps)
HOME_LATITUDE=53.3498
HOME_LONGITUDE=-6.2603

# Tracking Configuration
RADIUS_MILES=10                      # Detection radius
POLL_INTERVAL_SECONDS=60             # How often to check (60s recommended)
COOLDOWN_MINUTES=5                   # Avoid duplicate alerts

# OpenSky API (required for new accounts since March 2025)
OPENSKY_CLIENT_ID=your-client-id
OPENSKY_CLIENT_SECRET=your-client-secret
```

### 4. Test the connection

```bash
npm run test-push
```

You should see a test notification on your LaMetric!

### 5. Start the flight monitor

```bash
npm start
```

## 📦 Available Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start the flight monitor service |
| `npm run test-push` | Send a test notification |
| `npm run test-push -- "message"` | Send a custom message |
| `npm run test-flight` | Send sample flight notification |
| `npm run test-opensky` | Test OpenSky API connectivity |
| `npm run reset` | Dismiss all notifications |

## 🔧 Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `LAMETRIC_DEVICE_IP` | — | LaMetric device IP address |
| `LAMETRIC_API_KEY` | — | Local API key from LaMetric app |
| `HOME_LATITUDE` | — | Your home latitude |
| `HOME_LONGITUDE` | — | Your home longitude |
| `RADIUS_MILES` | `10` | Aircraft detection radius in miles |
| `POLL_INTERVAL_SECONDS` | `60` | API polling frequency |
| `COOLDOWN_MINUTES` | `5` | Prevent duplicate alerts |
| `OPENSKY_CLIENT_ID` | — | OpenSky OAuth2 client ID (required for new accounts) |
| `OPENSKY_CLIENT_SECRET` | — | OpenSky OAuth2 client secret |
| `FETCH_AIRCRAFT_METADATA` | `false` | Enable aircraft type lookups (uses extra API credits) |

### OpenSky API Authentication

**New accounts (created after March 2025)** require OAuth2 authentication:

1. Register at [opensky-network.org](https://opensky-network.org/)
2. Go to your account settings → API Clients
3. Create a new client to get your `client_id` and `client_secret`
4. Add these to your `.env` file

The app automatically handles token refresh when tokens expire (~30 minutes).

## 🏠 Deployment Options

### Option 1: Run on your computer

Simply run `npm start` when you want to monitor flights. Great for testing, but requires your computer to stay on.

### Option 2: Raspberry Pi / Pi Zero (Recommended for 24/7)

A Raspberry Pi is perfect for running this 24/7 with minimal power consumption (~2-5 watts). Works great on any model including the Pi Zero W/2W.

#### Hardware Requirements

| Component | Notes |
|-----------|-------|
| **Raspberry Pi** | Any model with WiFi (Pi Zero W, Pi Zero 2W, Pi 3, Pi 4, Pi 5) |
| **MicroSD Card** | 8GB+ (16GB recommended) |
| **Power Supply** | Official Pi power supply recommended |
| **Case** (optional) | Keeps it tidy and protected |

> 💡 **Pi Zero 2W** is ideal — tiny, cheap (~$15), and plenty powerful for this app.

#### Step 1: Set Up Raspberry Pi OS

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Insert your microSD card
3. In Imager, click **Choose OS** → **Raspberry Pi OS (other)** → **Raspberry Pi OS Lite (64-bit)**
4. Click the **gear icon** ⚙️ to configure:
   - Set hostname: `flighttracker`
   - Enable SSH
   - Set username/password
   - Configure WiFi (SSID and password)
   - Set locale/timezone
5. Write the image to SD card
6. Insert SD into Pi and power on

#### Step 2: Connect via SSH

After ~1-2 minutes, the Pi should be on your network:

```bash
# Find Pi on network (or check your router)
ping flighttracker.local

# Connect via SSH
ssh pi@flighttracker.local
```

#### Step 3: Install Node.js

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (using NodeSource for latest LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version
```

> **Pi Zero (32-bit)?** Use `setup_18.x` instead — Node 20 requires 64-bit.

#### Step 4: Clone and Configure the App

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/lametric-flight-tracker.git
cd lametric-flight-tracker

# Install dependencies
npm install

# Create your configuration
cp env.template .env
nano .env
```

Edit `.env` with your values:

```env
LAMETRIC_DEVICE_IP=192.168.1.100
LAMETRIC_API_KEY=your-api-key
HOME_LATITUDE=53.3498
HOME_LONGITUDE=-6.2603
RADIUS_MILES=10
POLL_INTERVAL_SECONDS=60
COOLDOWN_MINUTES=5
OPENSKY_CLIENT_ID=your-client-id
OPENSKY_CLIENT_SECRET=your-client-secret
```

Press `Ctrl+X`, then `Y`, then `Enter` to save.

#### Step 5: Test It Works

```bash
# Test the LaMetric connection
npm run test-push

# Run the monitor briefly to verify
npm start
# Press Ctrl+C after seeing it work
```

#### Step 6: Set Up PM2 for 24/7 Operation

PM2 keeps your app running and restarts it if it crashes or the Pi reboots.

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the flight tracker
pm2 start src/index.js --name flight-tracker

# View logs
pm2 logs flight-tracker

# Configure PM2 to start on boot
pm2 startup
# Run the command it outputs (starts with 'sudo env...')

# Save the current process list
pm2 save
```

#### Step 7: Useful PM2 Commands

```bash
pm2 status              # Check if running
pm2 logs flight-tracker # View live logs
pm2 restart flight-tracker  # Restart the app
pm2 stop flight-tracker     # Stop the app
pm2 monit               # Real-time monitoring dashboard
```

#### Step 8: (Optional) Keep Pi Updated

Create a simple update script:

```bash
nano ~/update-flight-tracker.sh
```

Add:

```bash
#!/bin/bash
cd ~/lametric-flight-tracker
git pull
npm install
pm2 restart flight-tracker
```

Make executable:

```bash
chmod +x ~/update-flight-tracker.sh
```

#### Troubleshooting Pi Setup

**Can't find Pi on network:**
- Wait 2-3 minutes after first boot
- Try `ping flighttracker.local` or check router for connected devices
- Verify WiFi credentials were entered correctly in Imager

**Node.js install fails on Pi Zero:**
- Pi Zero (original) is 32-bit ARM6 — use Node 18: `setup_18.x`
- Pi Zero 2W supports 64-bit OS and Node 20

**"Cannot connect to LaMetric":**
- Ensure Pi and LaMetric are on same network/subnet
- Try pinging the LaMetric IP: `ping 192.168.x.x`
- Check firewall isn't blocking port 8080

**App crashes or stops:**
- Check logs: `pm2 logs flight-tracker --lines 50`
- OpenSky API has rate limits — the app handles this gracefully
- Restart: `pm2 restart flight-tracker`

#### Power Consumption

| Model | Idle | Running App |
|-------|------|-------------|
| Pi Zero W | ~0.5W | ~1W |
| Pi Zero 2W | ~0.6W | ~1.5W |
| Pi 4 | ~3W | ~4W |

A Pi Zero running 24/7 costs roughly **$1-2 per year** in electricity!

### Option 3: Windows PC (24/7 Operation)

If you have a Windows PC that stays on, you can run the flight tracker as a background service that starts automatically on boot.

#### Prerequisites

- Windows 10 or 11
- Node.js installed ([download](https://nodejs.org/))
- The app cloned and configured (see Quick Start above)

#### Method A: Task Scheduler (Recommended — No extra software)

1. **Open Task Scheduler**
   - Press `Win + R`, type `taskschd.msc`, hit Enter

2. **Create a new task**
   - Click **Create Task** (not "Create Basic Task")

3. **General tab**
   - Name: `LaMetric Flight Tracker`
   - Check ✅ **Run whether user is logged on or not**
   - Check ✅ **Run with highest privileges**

4. **Triggers tab**
   - Click **New**
   - Begin the task: **At startup**
   - (Optional) Check "Delay task for" → **30 seconds** (allows network to connect)

5. **Actions tab**
   - Click **New**
   - Action: **Start a program**
   - Program/script: `C:\Program Files\nodejs\node.exe`
   - Add arguments: `src/index.js`
   - Start in: `C:\path\to\lametric-flight-tracker` (your app folder)

6. **Settings tab**
   - ❌ Uncheck "Stop the task if it runs longer than"
   - ✅ Check "If the task fails, restart every" → **1 minute**
   - Attempts: **3**

7. Click **OK**, enter your Windows password when prompted

**Test it:** Right-click the task → **Run**. Check your LaMetric for activity!

#### Method B: NSSM (Run as a Windows Service)

NSSM (Non-Sucking Service Manager) runs your app as a true Windows service with automatic restart on failure.

1. **Download NSSM** from [nssm.cc/download](https://nssm.cc/download)

2. **Extract** the zip and note the path to `nssm.exe`

3. **Open PowerShell as Administrator** and navigate to the NSSM folder

4. **Install the service:**

   ```powershell
   .\nssm.exe install LaMetricFlights "C:\Program Files\nodejs\node.exe" "C:\path\to\app\src\index.js"
   .\nssm.exe set LaMetricFlights AppDirectory "C:\path\to\app"
   .\nssm.exe set LaMetricFlights DisplayName "LaMetric Flight Tracker"
   .\nssm.exe set LaMetricFlights Description "Monitors aircraft and pushes to LaMetric"
   .\nssm.exe start LaMetricFlights
   ```

5. **Manage the service:**

   ```powershell
   .\nssm.exe status LaMetricFlights     # Check if running
   .\nssm.exe restart LaMetricFlights    # Restart
   .\nssm.exe stop LaMetricFlights       # Stop
   .\nssm.exe remove LaMetricFlights     # Uninstall service
   ```

   Or use Windows Services (`services.msc`) to manage it graphically.

#### Windows Troubleshooting

**"curl is not recognized":**
- Windows 10 (1803+) includes `curl.exe` by default
- If missing, install via: `winget install curl`

**"Cannot connect to LaMetric":**
- Ensure PC and LaMetric are on the same network
- Windows Firewall may block outbound connections — allow Node.js
- Test with: `curl.exe -u "dev:YOUR_API_KEY" http://LAMETRIC_IP:8080/api/v2/device`

**Task runs but no notifications:**
- Check the "Start in" path is correct (must be the app folder)
- View logs: Create a log file by changing arguments to:
  `src/index.js > C:\path\to\app\logs\output.log 2>&1`

## 🔒 Security Notes

- **Never commit your `.env` file** — it contains your API key
- The `.gitignore` is configured to exclude sensitive files
- LaMetric local API uses HTTP (not HTTPS) on your local network
- No data leaves your local network except OpenSky API calls

## 📡 API Credits

- **[OpenSky Network](https://opensky-network.org/)** — Free, community-driven flight tracking API
- **[LaMetric](https://developer.lametric.com/)** — Smart clock with local push API

## 🛠️ Technical Details

### Why curl instead of axios?

This app uses `curl` via `child_process` for HTTP requests to the LaMetric device. This approach was chosen to bypass corporate VPN/proxy configurations that can interfere with Node.js's native networking stack.

### Notification Payload Structure

```json
{
  "priority": "info",
  "icon_type": "none",
  "lifetime": 8000,
  "model": {
    "cycles": 2,
    "frames": [
      {
        "icon": "i8879",
        "text": "EIN123 A320 35k 2.5mi"
      }
    ],
    "sound": {
      "category": "notifications",
      "id": "notification"
    }
  }
}
```

### Haversine Formula

The app uses the [Haversine formula](https://en.wikipedia.org/wiki/Haversine_formula) to calculate great-circle distance between your home and each aircraft, providing accurate distance measurements regardless of latitude.

## 🐛 Troubleshooting

### "Cannot connect to LaMetric"

- Ensure your computer and LaMetric are on the same network
- Check the IP address is correct
- Verify the API key from the LaMetric app
- Try `ping <LAMETRIC_IP>` to test connectivity

### No aircraft appearing

- OpenSky has rate limits — wait a minute and try again
- Check your coordinates are correct
- Try increasing `RADIUS_MILES` temporarily
- Verify aircraft are actually flying in your area (check flightradar24.com)

### Notifications not dismissing

- The `lifetime` parameter controls auto-dismiss (default: 8 seconds)
- Run `npm run reset` to manually dismiss all notifications

## 📄 License

MIT License — feel free to use, modify, and share!

## 🙏 Acknowledgments

- Built with Node.js
- Flight data from OpenSky Network
- Inspired by wanting to know what's flying overhead

**Special thanks to Blaise McSweeney** for his encyclopedic knowledge of FlightRadar24, OpenSky Network, and general aviation awesomeness. This project wouldn't exist without his passion for plane spotting! ✈️

---

**Made with ☕ and curiosity about the skies above**
