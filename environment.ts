/**
 * Environment Configuration for Money Mood
 * Manages configuration for different environments and financial data providers
 */

export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production';
  api: {
    baseUrl: string;
    timeout: number;
  };
  financialProviders: {
    plaid: {
      clientId: string;
      environment: 'sandbox' | 'development' | 'production';
      publicKey: string;
      baseUrl: string;
    };
    yodlee: {
      clientId: string;
      environment: 'sandbox' | 'development' | 'production';
      baseUrl: string;
    };
  };
  security: {
    encryptionKey: string;
    tokenExpirationTime: number;
    maxRetryAttempts: number;
  };
  features: {
    enableRealTimeSync: boolean;
    enableOfflineMode: boolean;
    enableBiometricAuth: boolean;
    enablePushNotifications: boolean;
  };
}

const developmentConfig: EnvironmentConfig = {
  environment: 'development',
  api: {
    baseUrl: 'https://api-dev.moneymood.com',
    timeout: 30000,
  },
  financialProviders: {
    plaid: {
      clientId: process.env.EXPO_PUBLIC_PLAID_CLIENT_ID || 'dev_client_id',
      environment: 'sandbox',
      publicKey: process.env.EXPO_PUBLIC_PLAID_PUBLIC_KEY || 'dev_public_key',
      baseUrl: 'https://sandbox.plaid.com',
    },
    yodlee: {
      clientId: process.env.EXPO_PUBLIC_YODLEE_CLIENT_ID || 'dev_yodlee_client',
      environment: 'sandbox',
      baseUrl: 'https://sandbox.api.yodlee.com',
    },
  },
  security: {
    encryptionKey: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'dev_encryption_key_32_chars_long',
    tokenExpirationTime: 3600000, // 1 hour
    maxRetryAttempts: 3,
  },
  features: {
    enableRealTimeSync: true,
    enableOfflineMode: true,
    enableBiometricAuth: true,
    enablePushNotifications: false, // Disabled in development
  },
};

const stagingConfig: EnvironmentConfig = {
  environment: 'staging',
  api: {
    baseUrl: 'https://api-staging.moneymood.com',
    timeout: 30000,
  },
  financialProviders: {
    plaid: {
      clientId: process.env.EXPO_PUBLIC_PLAID_CLIENT_ID || '',
      environment: 'development',
      publicKey: process.env.EXPO_PUBLIC_PLAID_PUBLIC_KEY || '',
      baseUrl: 'https://development.plaid.com',
    },
    yodlee: {
      clientId: process.env.EXPO_PUBLIC_YODLEE_CLIENT_ID || '',
      environment: 'development',
      baseUrl: 'https://development.api.yodlee.com',
    },
  },
  security: {
    encryptionKey: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || '',
    tokenExpirationTime: 3600000, // 1 hour
    maxRetryAttempts: 3,
  },
  features: {
    enableRealTimeSync: true,
    enableOfflineMode: true,
    enableBiometricAuth: true,
    enablePushNotifications: true,
  },
};

const productionConfig: EnvironmentConfig = {
  environment: 'production',
  api: {
    baseUrl: 'https://api.moneymood.com',
    timeout: 30000,
  },
  financialProviders: {
    plaid: {
      clientId: process.env.EXPO_PUBLIC_PLAID_CLIENT_ID || '',
      environment: 'production',
      publicKey: process.env.EXPO_PUBLIC_PLAID_PUBLIC_KEY || '',
      baseUrl: 'https://production.plaid.com',
    },
    yodlee: {
      clientId: process.env.EXPO_PUBLIC_YODLEE_CLIENT_ID || '',
      environment: 'production',
      baseUrl: 'https://api.yodlee.com',
    },
  },
  security: {
    encryptionKey: process.env.EXPO_PUBLIC_ENCRYPTION_KEY || '',
    tokenExpirationTime: 1800000, // 30 minutes in production
    maxRetryAttempts: 5,
  },
  features: {
    enableRealTimeSync: true,
    enableOfflineMode: true,
    enableBiometricAuth: true,
    enablePushNotifications: true,
  },
};

/**
 * Get the current environment configuration
 */
export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    default:
      return developmentConfig;
  }
};

/**
 * Current environment configuration
 */
export const config = getEnvironmentConfig();

/**
 * Validate that all required environment variables are set
 */
export const validateEnvironmentConfig = (): boolean => {
  const requiredVars = [
    'EXPO_PUBLIC_PLAID_CLIENT_ID',
    'EXPO_PUBLIC_PLAID_PUBLIC_KEY',
    'EXPO_PUBLIC_YODLEE_CLIENT_ID',
    'EXPO_PUBLIC_ENCRYPTION_KEY',
  ];

  if (config.environment === 'production') {
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('Missing required environment variables:', missingVars);
      return false;
    }
  }

  return true;
};

/**
 * Get feature flag status
 */
export const isFeatureEnabled = (feature: keyof EnvironmentConfig['features']): boolean => {
  return config.features[feature];
};

/**
 * Get financial provider configuration
 */
export const getProviderConfig = (provider: 'plaid' | 'yodlee') => {
  return config.financialProviders[provider];
};

