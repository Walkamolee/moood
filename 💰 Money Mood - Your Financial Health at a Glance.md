# 💰 Money Mood - Your Financial Health at a Glance

> **Revolutionary personal finance app that changes color based on your spending habits**

Money Mood transforms the way you interact with your finances by providing immediate visual feedback about your budget status. The app's interface and even the app icon itself change colors based on how well you're sticking to your budget - from bright green when you're doing great, to red when you need to take action.

## 🌈 What Makes Money Mood Special

### Dynamic Color System
- **App changes color in real-time** based on your budget status
- **Green** (0-49% spent): Excellent financial health
- **Yellow** (50-74% spent): On track with spending  
- **Orange** (75-99% spent): Approaching budget limit
- **Red** (100%+ spent): Over budget - action needed

### Smart App Icon
- **Your app icon changes color** on your phone's home screen
- **See your financial status at a glance** without opening the app
- **Nightly updates** ensure your icon always reflects current status
- **Emotional connection** to your spending habits

### Nightly Intelligence
- **Automatic updates every night** at midnight
- **Recalculates budget status** based on latest transactions
- **Updates app icon color** to reflect current financial health
- **Background processing** keeps everything current

## 🚀 Key Features

### 📊 Smart Dashboard
- **Net worth tracking** with growth indicators
- **Budget overview** with dynamic progress bars
- **Recent transactions** with categorization
- **Quick actions** for common tasks

### 💳 Account Management
- **Multiple account types** (checking, savings, credit cards)
- **Real-time balance updates**
- **Transaction categorization**
- **Spending insights**

### 🎯 Budget Tracking
- **Monthly and weekly budgets**
- **Category-based spending limits**
- **Visual progress indicators**
- **Overspending alerts**

### 📱 Mobile-First Design
- **Optimized for mobile devices**
- **Touch-friendly interface**
- **Smooth animations and transitions**
- **Responsive design**

## 🛠 Technical Architecture

### Frontend
- **React Native** with Expo for cross-platform development
- **TypeScript** for type safety and better development experience
- **Redux Toolkit** for state management
- **React Navigation** for seamless navigation

### Dynamic Theming
- **Real-time color calculations** based on budget status
- **Smooth color transitions** between states
- **Accessibility-compliant** color contrasts
- **Animated UI elements**

### Background Processing
- **Expo Background Fetch** for nightly updates
- **AsyncStorage** for local data persistence
- **Task Manager** for scheduled operations
- **Error handling and logging**

## 📱 Installation & Setup

### Prerequisites
- Node.js 18+ 
- Expo CLI
- iOS Simulator or Android Emulator (for testing)

### Quick Start
```bash
# Clone the repository
git clone <repository-url>
cd money-mood

# Install dependencies
npm install

# Start development server
npm run web        # For web development
npm run ios        # For iOS simulator
npm run android    # For Android emulator
```

### Environment Setup
```bash
# Install Expo CLI globally
npm install -g @expo/cli

# Install additional dependencies
npx expo install react-native-screens react-native-safe-area-context
```

## 🎨 Color System Guide

### Budget Status Colors
| Status | Percentage | Color | Hex Code | Description |
|--------|------------|-------|----------|-------------|
| Excellent | 0-49% | Bright Green | `#00D4AA` | Well within budget |
| Good | 50-74% | Mint Green | `#00D4AA` | On track |
| Warning | 75-99% | Yellow | `#FFC107` | Approaching limit |
| Danger | 100-109% | Orange | `#FF8C42` | At limit |
| Over Budget | 110%+ | Red | `#DC3545` | Over budget |

### Color Transitions
- **Smooth interpolation** between color states
- **300ms animation duration** for seamless transitions
- **Maintains accessibility** with proper contrast ratios
- **Consistent across all UI elements**

## 🔧 Configuration

### Budget Thresholds
Customize when colors change by modifying `src/utils/budgetColorSystem.ts`:

```typescript
export const BUDGET_THRESHOLDS = {
  EXCELLENT: 0,      // 0-49% spent
  GOOD: 50,          // 50-74% spent  
  WARNING: 75,       // 75-99% spent
  DANGER: 100,       // 100-109% spent
  OVER_BUDGET: 110,  // 110%+ spent
};
```

### App Icon Variants
Configure icon colors in `src/services/dynamicAppIcon.ts`:

```typescript
export const APP_ICON_CONFIGS = {
  EXCELLENT: { color: '#00D4AA', fileName: 'icon-green.png' },
  WARNING: { color: '#FFC107', fileName: 'icon-yellow.png' },
  DANGER: { color: '#FF8C42', fileName: 'icon-orange.png' },
  OVER_BUDGET: { color: '#DC3545', fileName: 'icon-red.png' },
};
```

## 🌙 Nightly Updates

### How It Works
1. **Background task runs** every night at midnight
2. **Fetches latest** transaction and budget data
3. **Recalculates budget status** for all categories
4. **Updates app icon color** based on overall status
5. **Logs update completion** for debugging

### Manual Testing
```typescript
// Trigger manual update (development only)
import { triggerManualUpdate } from './src/services/backgroundTaskManager';
await triggerManualUpdate();
```

### Background Task Features
- **24-hour minimum interval** between updates
- **Survives app termination** and device restarts
- **Error handling and retry logic**
- **Update logging and analytics**

## 📊 App Icon System

### Dynamic Icons
- **5 different color variants** based on budget status
- **Automatic updates** during nightly processing
- **Platform-specific implementation**:
  - **iOS**: Alternate app icons
  - **Android**: Adaptive icon backgrounds
  - **Web**: Dynamic favicon generation

### Icon Status Tracking
```typescript
// Get current icon status
const status = await getIconStatusDescription();
console.log(status); // "Excellent financial health - well within budget"

// Get icon change history
const history = await getIconHistory();
console.log(history); // Array of icon changes with timestamps
```

## 🧪 Testing

### Development Testing
```bash
# Run in development mode
npm run web

# Test on different devices
npm run ios
npm run android
```

### Manual Budget Testing
1. **Modify mock data** in Redux slices
2. **Change spending amounts** to test different color states
3. **Trigger manual updates** to test background processing
4. **Check app icon changes** in development

### Color State Testing
- **0% spent**: Bright green theme
- **60% spent**: Yellow warning theme  
- **85% spent**: Orange danger theme
- **120% spent**: Red over-budget theme

## 🚀 Deployment

### Production Build
```bash
# Build for production
npx expo build:web
npx expo build:ios
npx expo build:android
```

### App Store Requirements
- **App icon variants** must be included in build
- **Background processing permissions** required
- **Privacy policy** for financial data handling
- **App Store description** highlighting dynamic features

## 🔒 Privacy & Security

### Data Handling
- **Local storage only** - no data sent to external servers
- **Encrypted storage** for sensitive financial information
- **No tracking or analytics** beyond app usage
- **User controls** for data export and deletion

### Permissions
- **Background app refresh** for nightly updates
- **Local notifications** for budget alerts (optional)
- **Biometric authentication** for app access (optional)

## 🎯 User Experience

### Emotional Design
- **Green encourages** continued good financial habits
- **Yellow provides** gentle warnings about spending
- **Orange creates** urgency to review budget
- **Red motivates** immediate corrective action

### Gamification Elements
- **Visual progress** toward budget goals
- **Color rewards** for staying on track
- **Achievement system** for financial milestones
- **Streak tracking** for consecutive good months

## 🔮 Future Enhancements

### Advanced Features
- **Smart notifications** with color-coded alerts
- **Spending predictions** based on historical data
- **Goal setting** with visual progress tracking
- **Social features** for family budget sharing

### Technical Improvements
- **Real-time sync** with bank accounts
- **Machine learning** for spending categorization
- **Advanced analytics** and reporting
- **Multi-currency support**

### Design Evolution
- **Seasonal themes** and color variations
- **Accessibility improvements** for color-blind users
- **Customizable color schemes**
- **Dark mode support**

## 🤝 Contributing

### Development Setup
1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Make changes** and test thoroughly
4. **Commit changes**: `git commit -m 'Add amazing feature'`
5. **Push to branch**: `git push origin feature/amazing-feature`
6. **Open Pull Request**

### Code Standards
- **TypeScript** for all new code
- **ESLint** and **Prettier** for code formatting
- **Jest** for unit testing
- **Comprehensive comments** for complex logic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Mint.com** for inspiration and UX patterns
- **Expo team** for excellent React Native tooling
- **Redux Toolkit** for simplified state management
- **React Navigation** for smooth navigation experience

---

**Money Mood** - Because your financial health should be as visible as your mood! 💰🌈

