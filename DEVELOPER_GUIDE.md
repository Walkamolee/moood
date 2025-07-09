# Money Mood Developer Guide

> **Complete guide for developers working on Money Mood - from setup to contribution**

## Table of Contents

1. [Development Setup](#development-setup)
2. [Code Architecture](#code-architecture)
3. [Component Library](#component-library)
4. [Testing Procedures](#testing-procedures)
5. [Contribution Guidelines](#contribution-guidelines)
6. [Debugging and Troubleshooting](#debugging-and-troubleshooting)
7. [Performance Optimization](#performance-optimization)
8. [Development Workflow](#development-workflow)

## Development Setup

### Prerequisites

Before starting development, ensure you have the following installed:

```bash
# Required Software
- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 1.22+
- Git 2.30+
- React Native CLI 2.0.1+
- Expo CLI 6.0+
- Android Studio (for Android development)
- Xcode 14+ (for iOS development, macOS only)
- Docker 20.10+ (for local services)
- PostgreSQL 14+ (or Docker alternative)
- Redis 6+ (or Docker alternative)
```

### Environment Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/moneymood/money-mood.git
cd money-mood
```

#### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install iOS dependencies (macOS only)
cd ios && pod install && cd ..

# Install development tools
npm install -g @expo/cli
npm install -g react-native-cli
```

#### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.development

# Edit environment variables
nano .env.development
```

#### Development Environment Variables
```bash
# .env.development
NODE_ENV=development
APP_VERSION=2.0.0-dev
API_BASE_URL=http://localhost:3001
WEB_BASE_URL=http://localhost:3000

# Database (Local)
DATABASE_URL=postgresql://moneymood:password@localhost:5432/moneymood_dev
DATABASE_SSL=false
DATABASE_POOL_SIZE=5

# Redis (Local)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Plaid (Sandbox)
PLAID_CLIENT_ID=your_sandbox_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
PLAID_WEBHOOK_URL=http://localhost:3001/webhooks/plaid

# Development Security (NOT for production)
JWT_SECRET=dev_jwt_secret_for_testing_only
ENCRYPTION_KEY=dev_encryption_key_32_chars_long
BIOMETRIC_SECRET=dev_biometric_secret

# Feature Flags
ENABLE_DEBUG_LOGGING=true
ENABLE_HOT_RELOAD=true
ENABLE_FLIPPER=true
ENABLE_MOCK_BIOMETRICS=true
```

#### 4. Database Setup
```bash
# Start local PostgreSQL (Docker)
docker run --name moneymood-postgres \
  -e POSTGRES_DB=moneymood_dev \
  -e POSTGRES_USER=moneymood \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:14

# Start local Redis (Docker)
docker run --name moneymood-redis \
  -p 6379:6379 \
  -d redis:6-alpine

# Run database migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

#### 5. Start Development Servers
```bash
# Terminal 1: Start API server
npm run dev:api

# Terminal 2: Start React Native Metro bundler
npm run dev:mobile

# Terminal 3: Start web development server
npm run dev:web

# Terminal 4: Start webhook tunnel (for Plaid webhooks)
npm run dev:tunnel
```

### IDE Configuration

#### Visual Studio Code Setup
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "typescript": "typescriptreact"
  },
  "files.associations": {
    "*.tsx": "typescriptreact"
  }
}
```

#### Recommended Extensions
```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-react-native"
  ]
}
```

## Code Architecture

### Project Structure

```
money-mood/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── common/         # Generic components
│   │   ├── forms/          # Form-specific components
│   │   └── charts/         # Data visualization components
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── main/           # Main app screens
│   │   ├── details/        # Detail view screens
│   │   └── forms/          # Form screens
│   ├── navigation/         # Navigation configuration
│   ├── services/           # Business logic services
│   │   ├── api/            # API communication
│   │   ├── auth/           # Authentication services
│   │   ├── data/           # Data management
│   │   └── security/       # Security services
│   ├── store/              # Redux store configuration
│   │   ├── slices/         # Redux slices
│   │   └── middleware/     # Custom middleware
│   ├── utils/              # Utility functions
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   ├── constants/          # Application constants
│   └── assets/             # Static assets
├── docs/                   # Documentation
├── __tests__/              # Test files
├── android/                # Android-specific code
├── ios/                    # iOS-specific code
└── web/                    # Web-specific code
```

### Architecture Patterns

#### 1. Service Layer Architecture
```typescript
// Service layer pattern
interface FinancialDataService {
  getAccounts(userId: string): Promise<Account[]>;
  getTransactions(accountId: string, options: TransactionOptions): Promise<Transaction[]>;
  syncData(userId: string): Promise<SyncResult>;
}

class PlaidFinancialDataService implements FinancialDataService {
  constructor(
    private plaidClient: PlaidApi,
    private encryptionService: EncryptionService,
    private auditLogger: AuditLogger
  ) {}

  async getAccounts(userId: string): Promise<Account[]> {
    // Implementation with error handling, logging, and encryption
  }
}
```

#### 2. Repository Pattern
```typescript
// Repository pattern for data access
interface TransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByAccountId(accountId: string): Promise<Transaction[]>;
  create(transaction: CreateTransactionDto): Promise<Transaction>;
  update(id: string, updates: UpdateTransactionDto): Promise<Transaction>;
  delete(id: string): Promise<void>;
}

class DatabaseTransactionRepository implements TransactionRepository {
  constructor(private db: Database) {}
  
  async findById(id: string): Promise<Transaction | null> {
    const result = await this.db.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }
}
```

#### 3. Command Pattern for Actions
```typescript
// Command pattern for complex operations
interface Command {
  execute(): Promise<void>;
  undo(): Promise<void>;
}

class SyncAccountDataCommand implements Command {
  constructor(
    private userId: string,
    private accountId: string,
    private syncService: DataSynchronizationService
  ) {}

  async execute(): Promise<void> {
    await this.syncService.syncAccount(this.userId, this.accountId);
  }

  async undo(): Promise<void> {
    await this.syncService.rollbackSync(this.userId, this.accountId);
  }
}
```

### State Management Architecture

#### Redux Store Structure
```typescript
// Root state interface
interface RootState {
  auth: AuthState;
  accounts: AccountsState;
  transactions: TransactionsState;
  budgets: BudgetsState;
  categories: CategoriesState;
  financialProviders: FinancialProvidersState;
  ui: UIState;
  settings: SettingsState;
}

// Example slice structure
const transactionsSlice = createSlice({
  name: 'transactions',
  initialState: {
    transactions: [],
    loading: false,
    error: null,
    filters: defaultFilters,
    pagination: defaultPagination
  },
  reducers: {
    setTransactions: (state, action) => {
      state.transactions = action.payload;
    },
    addTransaction: (state, action) => {
      state.transactions.unshift(action.payload);
    },
    updateTransaction: (state, action) => {
      const index = state.transactions.findIndex(t => t.id === action.payload.id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.loading = false;
        state.transactions = action.payload;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});
```

## Component Library

### Component Categories

#### 1. Base Components
```typescript
// Button component with variants
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  loading,
  disabled,
  onPress,
  children
}) => {
  const buttonStyles = getButtonStyles(variant, size);
  
  return (
    <TouchableOpacity
      style={[buttonStyles, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator color={getSpinnerColor(variant)} />
      ) : (
        <Text style={getTextStyles(variant, size)}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};
```

#### 2. Form Components
```typescript
// Input component with validation
interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  error?: string;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  error,
  required
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        accessibilityLabel={label}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};
```

#### 3. Data Display Components
```typescript
// Transaction list item component
interface TransactionItemProps {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
  showAccount?: boolean;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  showAccount = false
}) => {
  const moodColor = getBudgetMoodColor(transaction.categoryId);
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(transaction)}
      accessibilityRole="button"
      accessibilityLabel={`Transaction: ${transaction.description}, Amount: ${formatCurrency(transaction.amount)}`}
    >
      <View style={styles.leftSection}>
        <View style={[styles.moodIndicator, { backgroundColor: moodColor }]} />
        <View style={styles.details}>
          <Text style={styles.description}>{transaction.description}</Text>
          {showAccount && (
            <Text style={styles.account}>{transaction.account?.name}</Text>
          )}
          <Text style={styles.date}>{formatDate(transaction.date)}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <Text style={[styles.amount, getAmountStyle(transaction.amount)]}>
          {formatCurrency(transaction.amount)}
        </Text>
        {transaction.isPending && (
          <Text style={styles.pending}>Pending</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
```

#### 4. Chart Components
```typescript
// Money Mood chart component
interface MoneyMoodChartProps {
  budgets: Budget[];
  timeframe: 'week' | 'month' | 'year';
  onMoodPress: (budget: Budget) => void;
}

const MoneyMoodChart: React.FC<MoneyMoodChartProps> = ({
  budgets,
  timeframe,
  onMoodPress
}) => {
  const chartData = useMemo(() => 
    budgets.map(budget => ({
      budget,
      mood: calculateBudgetMood(budget),
      percentage: calculateSpentPercentage(budget)
    })), [budgets]
  );

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.title}>Money Mood Overview</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {chartData.map(({ budget, mood, percentage }) => (
          <TouchableOpacity
            key={budget.id}
            style={styles.moodItem}
            onPress={() => onMoodPress(budget)}
          >
            <MoodFaceIcon mood={mood} size={60} />
            <Text style={styles.budgetName}>{budget.name}</Text>
            <Text style={styles.percentage}>{percentage}%</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
```

### Component Documentation

#### Storybook Setup
```typescript
// .storybook/main.js
module.exports = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-react-native-web',
    '@storybook/addon-controls',
    '@storybook/addon-docs'
  ]
};

// Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost']
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large']
    }
  }
};

export const Primary = {
  args: {
    variant: 'primary',
    size: 'medium',
    children: 'Primary Button'
  }
};

export const Loading = {
  args: {
    variant: 'primary',
    size: 'medium',
    loading: true,
    children: 'Loading Button'
  }
};
```

## Testing Procedures

### Testing Strategy

#### 1. Unit Testing
```typescript
// Component unit test example
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button Component', () => {
  it('renders correctly with primary variant', () => {
    render(
      <Button variant="primary" size="medium" onPress={jest.fn()}>
        Test Button
      </Button>
    );
    
    expect(screen.getByText('Test Button')).toBeTruthy();
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPressMock = jest.fn();
    
    render(
      <Button variant="primary" size="medium" onPress={onPressMock}>
        Test Button
      </Button>
    );
    
    fireEvent.press(screen.getByRole('button'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    render(
      <Button variant="primary" size="medium" loading onPress={jest.fn()}>
        Test Button
      </Button>
    );
    
    expect(screen.getByTestId('loading-indicator')).toBeTruthy();
    expect(screen.queryByText('Test Button')).toBeFalsy();
  });
});
```

#### 2. Integration Testing
```typescript
// Service integration test
import { PlaidService } from '../services/PlaidService';
import { mockPlaidClient } from '../__mocks__/plaidClient';

describe('PlaidService Integration', () => {
  let plaidService: PlaidService;

  beforeEach(() => {
    plaidService = new PlaidService(mockPlaidClient);
  });

  it('should create link token successfully', async () => {
    const userId = 'test-user-id';
    const mockResponse = {
      link_token: 'link-test-token',
      expiration: '2024-12-31T23:59:59Z'
    };

    mockPlaidClient.linkTokenCreate.mockResolvedValue({ data: mockResponse });

    const result = await plaidService.createLinkToken(userId);

    expect(result.linkToken).toBe('link-test-token');
    expect(mockPlaidClient.linkTokenCreate).toHaveBeenCalledWith({
      user: { client_user_id: userId },
      client_name: 'Money Mood',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'en'
    });
  });
});
```

#### 3. E2E Testing with Detox
```typescript
// e2e/onboarding.e2e.js
describe('Onboarding Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete onboarding flow', async () => {
    // Welcome screen
    await expect(element(by.text('Welcome to Money Mood'))).toBeVisible();
    await element(by.id('get-started-button')).tap();

    // Biometric setup
    await expect(element(by.text('Set Up Biometric Authentication'))).toBeVisible();
    await element(by.id('enable-biometric-button')).tap();

    // Bank connection
    await expect(element(by.text('Connect Your Bank Account'))).toBeVisible();
    await element(by.id('connect-bank-button')).tap();

    // Verify main screen
    await expect(element(by.text('Dashboard'))).toBeVisible();
  });
});
```

### Test Configuration

#### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/__tests__/**/*'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

#### Test Setup
```typescript
// src/__tests__/setup.ts
import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true }))
}));

// Global test utilities
global.mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  reset: jest.fn()
};
```

## Contribution Guidelines

### Git Workflow

#### Branch Naming Convention
```bash
# Feature branches
feature/add-biometric-authentication
feature/implement-plaid-integration

# Bug fix branches
bugfix/fix-transaction-sync-error
bugfix/resolve-memory-leak

# Hotfix branches
hotfix/security-vulnerability-fix
hotfix/critical-crash-fix

# Release branches
release/v2.0.0
release/v2.1.0
```

#### Commit Message Format
```bash
# Format: <type>(<scope>): <subject>

# Types: feat, fix, docs, style, refactor, test, chore
# Examples:
feat(auth): add biometric authentication support
fix(sync): resolve transaction duplicate detection
docs(api): update Plaid integration documentation
test(components): add unit tests for Button component
refactor(services): improve error handling in PlaidService
```

#### Pull Request Process

1. **Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
git push -u origin feature/your-feature-name
```

2. **Development Process**
```bash
# Make changes
git add .
git commit -m "feat(feature): implement new functionality"

# Keep branch updated
git fetch origin
git rebase origin/main

# Push changes
git push origin feature/your-feature-name
```

3. **Pull Request Template**
```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Security Checklist
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] Authentication/authorization checked
- [ ] Security tests added

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Additional Notes
Any additional information or context.
```

### Code Standards

#### TypeScript Guidelines
```typescript
// Use strict typing
interface User {
  id: string;
  email: string;
  profile: UserProfile;
}

// Avoid 'any' type
// Bad
const userData: any = response.data;

// Good
const userData: User = response.data;

// Use proper error handling
try {
  const result = await apiCall();
  return result;
} catch (error) {
  if (error instanceof ApiError) {
    throw new UserFriendlyError(error.message);
  }
  throw error;
}
```

#### React Native Best Practices
```typescript
// Use functional components with hooks
const TransactionScreen: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Use useCallback for event handlers
  const handleTransactionPress = useCallback((transaction: Transaction) => {
    navigation.navigate('TransactionDetail', { transactionId: transaction.id });
  }, [navigation]);

  // Use useMemo for expensive calculations
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => t.amount > 0);
  }, [transactions]);

  return (
    <FlatList
      data={filteredTransactions}
      renderItem={({ item }) => (
        <TransactionItem
          transaction={item}
          onPress={handleTransactionPress}
        />
      )}
      keyExtractor={item => item.id}
    />
  );
};
```

## Debugging and Troubleshooting

### Development Tools

#### React Native Debugger
```bash
# Install React Native Debugger
brew install --cask react-native-debugger

# Start debugger
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

#### Flipper Integration
```typescript
// Flipper network plugin setup
import { NetworkingManager } from 'react-native';
import { logger } from 'flipper';

if (__DEV__) {
  NetworkingManager.addRequestInterceptor((request) => {
    logger.info('Network Request', request);
  });

  NetworkingManager.addResponseInterceptor((response) => {
    logger.info('Network Response', response);
  });
}
```

### Common Issues and Solutions

#### 1. Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear node modules and reinstall
rm -rf node_modules
npm install

# Clear iOS build cache
cd ios && xcodebuild clean && cd ..

# Clear Android build cache
cd android && ./gradlew clean && cd ..
```

#### 2. Plaid Integration Issues
```typescript
// Debug Plaid errors
const handlePlaidError = (error: PlaidError) => {
  console.log('Plaid Error:', {
    errorCode: error.error_code,
    errorMessage: error.error_message,
    errorType: error.error_type,
    displayMessage: error.display_message
  });

  // Common error handling
  switch (error.error_code) {
    case 'ITEM_LOGIN_REQUIRED':
      // Redirect to re-authentication
      break;
    case 'INSUFFICIENT_CREDENTIALS':
      // Show credential update flow
      break;
    case 'RATE_LIMIT_EXCEEDED':
      // Implement retry with backoff
      break;
    default:
      // Show generic error message
      break;
  }
};
```

#### 3. Performance Issues
```typescript
// Performance monitoring
import { Performance } from 'react-native-performance';

const measurePerformance = (operationName: string) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Performance.now();
      
      try {
        const result = await method.apply(this, args);
        const endTime = Performance.now();
        
        console.log(`${operationName} took ${endTime - startTime} milliseconds`);
        return result;
      } catch (error) {
        const endTime = Performance.now();
        console.log(`${operationName} failed after ${endTime - startTime} milliseconds`);
        throw error;
      }
    };
  };
};

// Usage
class DataService {
  @measurePerformance('syncTransactions')
  async syncTransactions(userId: string) {
    // Implementation
  }
}
```

## Performance Optimization

### React Native Performance

#### 1. List Optimization
```typescript
// Use FlatList with optimization props
<FlatList
  data={transactions}
  renderItem={renderTransaction}
  keyExtractor={keyExtractor}
  getItemLayout={getItemLayout} // If item height is fixed
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={10}
  windowSize={10}
/>

// Memoize list items
const TransactionItem = React.memo<TransactionItemProps>(({ transaction, onPress }) => {
  return (
    <TouchableOpacity onPress={() => onPress(transaction)}>
      <Text>{transaction.description}</Text>
      <Text>{formatCurrency(transaction.amount)}</Text>
    </TouchableOpacity>
  );
});
```

#### 2. Image Optimization
```typescript
// Use optimized image loading
import FastImage from 'react-native-fast-image';

const OptimizedImage: React.FC<{ uri: string }> = ({ uri }) => (
  <FastImage
    style={styles.image}
    source={{
      uri,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable
    }}
    resizeMode={FastImage.resizeMode.cover}
  />
);
```

#### 3. Bundle Size Optimization
```javascript
// Metro configuration for bundle optimization
module.exports = {
  transformer: {
    minifierConfig: {
      mangle: {
        keep_fnames: true,
      },
      output: {
        ascii_only: true,
        quote_style: 3,
        wrap_iife: true,
      },
      sourceMap: {
        includeSources: false,
      },
      toplevel: false,
      compress: {
        reduce_funcs: false,
      },
    },
  },
};
```

### Database Performance

#### 1. Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX idx_transactions_account_date ON transactions(account_id, date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- Use EXPLAIN to analyze query performance
EXPLAIN ANALYZE SELECT * FROM transactions 
WHERE account_id = $1 AND date >= $2 
ORDER BY date DESC LIMIT 50;
```

#### 2. Connection Pooling
```typescript
// Optimized database connection pool
const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  min: 5,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 30000,
  query_timeout: 30000,
});
```

## Development Workflow

### Daily Development Process

1. **Start Development Session**
```bash
# Pull latest changes
git pull origin main

# Start development services
npm run dev:services

# Start development servers
npm run dev
```

2. **Development Cycle**
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and test
npm run test:watch

# Commit changes
git add .
git commit -m "feat: implement new feature"

# Push and create PR
git push origin feature/new-feature
```

3. **Code Review Process**
- Automated checks must pass (tests, linting, security)
- At least one code review approval required
- Security review for sensitive changes
- Performance review for optimization changes

### Release Process

#### 1. Version Management
```bash
# Update version
npm version patch  # 2.0.0 -> 2.0.1
npm version minor  # 2.0.0 -> 2.1.0
npm version major  # 2.0.0 -> 3.0.0

# Create release branch
git checkout -b release/v2.1.0

# Update changelog
npm run changelog:generate

# Commit and tag
git commit -m "chore: release v2.1.0"
git tag v2.1.0
```

#### 2. Deployment Pipeline
```bash
# Deploy to staging
npm run deploy:staging

# Run E2E tests
npm run test:e2e:staging

# Deploy to production
npm run deploy:production

# Monitor deployment
npm run monitor:deployment
```

---

## Development Support

### Getting Help
- **Development Team**: dev@moneymood.app
- **Architecture Questions**: architecture@moneymood.app
- **Security Questions**: security@moneymood.app
- **Performance Issues**: performance@moneymood.app

### Resources
- **Internal Wiki**: [https://wiki.moneymood.app](https://wiki.moneymood.app)
- **API Documentation**: [https://docs.moneymood.app](https://docs.moneymood.app)
- **Component Library**: [https://storybook.moneymood.app](https://storybook.moneymood.app)
- **Performance Dashboard**: [https://performance.moneymood.app](https://performance.moneymood.app)

---

*Money Mood Developer Guide - Version 1.0*
*Last Updated: January 15, 2024*
*Classification: Internal Use Only*

