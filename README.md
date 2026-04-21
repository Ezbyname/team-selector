# 🏀⚽ Team Selector - בוחר קבוצות

A Progressive Web App (PWA) for creating balanced basketball and soccer teams.

## Features

### 🎯 Smart Team Balancing
- Automatic team generation with intelligent algorithms
- Star player distribution across teams
- Position-based balancing
- Linked players stay together

### 🏀 Basketball Mode
- 2v2 to 5v5 games
- Positions: Guard, Forward, Center
- NBA-inspired design

### ⚽ Soccer Mode
- 5v5 to 11v11 games
- Positions: Goalkeeper, Defender, Midfielder, Forward

### ✨ User Experience
- **Bilingual**: Full Hebrew and English support with RTL/LTR
- **Dark/Light Mode**: Easy on the eyes
- **Mobile First**: Optimized for iPhone and Android
- **Offline Ready**: Works without internet (PWA)
- **Kid Friendly**: Simple enough for a 5-year-old to use

### 💾 Smart Features
- Auto-save players between sessions
- Link players to keep them on same team
- Mark star players for balanced distribution
- Bench system for games with extra players

## Installation

### As a Web App
1. Open `index.html` in any modern browser
2. On mobile: Tap "Add to Home Screen" for app-like experience

### As a PWA
The app will automatically prompt to install when opened in a browser that supports PWA.

## Development

The app is built with vanilla JavaScript for maximum compatibility:
- **No build process required**
- **No dependencies**
- **Works offline**
- **Fast and lightweight**

### File Structure
```
team-selector/
├── index.html          # Main HTML structure
├── styles.css          # NBA-themed styling with dark mode
├── app.js              # Application logic and algorithms
├── manifest.json       # PWA manifest
├── sw.js              # Service worker for offline support
├── icon.svg           # Source icon
├── icon-192.png       # App icon (192x192)
└── icon-512.png       # App icon (512x512)
```

## Usage

1. **Choose Sport**: Select Basketball or Soccer
2. **Add Players**: Enter player names
3. **Assign Positions** (Optional): Click on position dropdown
4. **Mark Stars** ⭐: Click star icon for key players
5. **Link Players** 🔗: Keep friends/family together
6. **Set Team Size**: Choose how many players per team
7. **Generate Teams**: Get balanced teams instantly!

## Algorithm

The team generation algorithm:
1. Identifies linked player groups
2. Separates star players between teams
3. Balances positions across teams
4. Handles extra players (bench system)
5. Ensures fairness while respecting constraints

## Browser Support

Works on all modern browsers:
- Chrome/Edge (Desktop & Mobile)
- Safari (iOS & macOS)
- Firefox
- Samsung Internet

## License

MIT License - Free to use and modify

## Contributing

Feel free to open issues or submit pull requests!

---

Made with ❤️ for basketball and soccer lovers everywhere
