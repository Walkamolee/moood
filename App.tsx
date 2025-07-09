import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { store } from './src/store';
import { DynamicThemeProvider } from './src/contexts/DynamicThemeContext';
import { initializeBackgroundTasks } from './src/services/backgroundTaskManager';
import { initializeAppIcon } from './src/services/dynamicAppIcon';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    // Initialize Money Mood features
    const initializeApp = async () => {
      try {
        // Initialize background tasks for nightly updates
        await initializeBackgroundTasks();
        
        // Initialize app icon with current budget status
        // Start with default good status (50% spent)
        await initializeAppIcon(50);
        
        console.log('💰 Money Mood initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize Money Mood:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Provider store={store}>
      <DynamicThemeProvider>
        <NavigationContainer>
          <AppNavigator />
          <StatusBar style="auto" />
        </NavigationContainer>
      </DynamicThemeProvider>
    </Provider>
  );
}

