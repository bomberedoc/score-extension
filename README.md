# 🏆 Live Sports Scores Browser Extension

A sleek, modern browser extension for Brave/Chrome that delivers live cricket and football scores right to your browser. Track your favorite teams, get instant notifications for goals and wickets, and never miss a moment of the action!

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 Core Features
- **Live Scores** - Real-time updates for cricket and football matches
- **Smart Notifications** - Get notified about goals, wickets, and match events
- **Favorite Teams** - Track your favorite teams and get personalized alerts
- **Multiple Leagues** - Coverage of major leagues worldwide

### 🏏 Cricket Coverage
- International matches (ICC events)
- IPL, BBL, PSL, and other major T20 leagues
- Test matches, ODIs, T20Is
- Ball-by-ball updates

### ⚽ Football Coverage
- Bundesliga (Germany)
- Premier League (England)
- La Liga (Spain)
- Serie A (Italy)
- Ligue 1 (France)
- Champions League & Europa League
- DFB-Pokal

### 🎨 User Experience
- Beautiful dark theme with gradient accents
- Smooth animations and transitions
- Tab-based navigation between sports
- Filter matches by Live, Today, Upcoming, or Finished
- Auto-refresh every minute
- Responsive design

## 📦 Installation

### Method 1: Load Unpacked (Developer Mode)

1. **Download the extension files**
   - Download and extract the `live-scores-extension` folder

2. **Open Brave/Chrome Extensions page**
   - Navigate to `brave://extensions/` or `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right corner)

3. **Load the extension**
   - Click "Load unpacked"
   - Select the `live-scores-extension` folder
   - The extension will be installed and ready to use!

### Method 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store soon for one-click installation.

## 🚀 Getting Started

### First Use
1. Click the 🏆 icon in your browser toolbar
2. Select your preferred sport (Football or Cricket)
3. Choose which matches to view (Live, Today's, Upcoming, Finished)
4. Click the ⚙️ settings icon to customize your experience

### Setting Up Notifications
1. Open the extension settings
2. Enable "Enable Notifications"
3. Add your favorite teams
4. Choose your preferred update interval

### Adding Favorite Teams
1. Go to Settings → Favorite Teams
2. Enter team names (e.g., "Manchester United", "India")
3. Click "Add"
4. You'll get notifications when these teams play!

## ⚙️ Configuration

### API Keys (Optional)
The extension works out of the box with free APIs, but you can add your own API keys for better rate limits:

**CricketData API:**
1. Visit [cricketdata.org](https://cricketdata.org/)
2. Sign up for a free API key
3. Enter the key in Settings → API Configuration

### Default Preferences
- **Default Sport** - Choose which sport opens by default
- **Default Filter** - Set your preferred match filter
- **Update Interval** - How often to check for updates (30s to 10min)

## 🔔 Notifications

You'll receive notifications for:
- ⚽ **Goals** - When a goal is scored in football matches
- 🏏 **Wickets** - When a wicket falls in cricket matches
- 🎬 **Match Start** - When a match involving your favorite team begins
- 🏁 **Match End** - Final results of tracked matches

## 🛠️ Technical Details

### APIs Used
- **Football:** [OpenLigaDB](https://www.openligadb.de/) - Free, no API key required
- **Cricket:** [CricketData](https://cricketdata.org/) - Free tier available

### Browser Compatibility
- ✅ Brave Browser (recommended)
- ✅ Google Chrome
- ✅ Microsoft Edge
- ✅ Any Chromium-based browser

### Permissions
- `storage` - Save user preferences
- `notifications` - Send score alerts
- `alarms` - Periodic score updates
- `activeTab` - Extension functionality

## 📝 File Structure

```
live-scores-extension/
├── manifest.json          # Extension configuration
├── README.md             # This file
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── popup/                # Main popup UI
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/              # Settings page
│   ├── options.html
│   ├── options.css
│   └── options.js
└── background/           # Service worker
    └── background.js
```

## 🐛 Troubleshooting

### No scores showing up?
- Check your internet connection
- Try refreshing the extension
- Wait a moment - some APIs have rate limits

### Notifications not working?
- Make sure notifications are enabled in settings
- Check browser notification permissions
- Ensure you've added favorite teams

### Extension not loading?
- Make sure Developer mode is enabled
- Check that all files are present
- Try reloading the extension

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [OpenLigaDB](https://www.openligadb.de/) for football data
- [CricketData](https://cricketdata.org/) for cricket data
- All the sports fans who inspired this extension!

---

**Enjoy live sports scores at your fingertips!** 🏆⚽🏏