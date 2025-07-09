import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CreateBudgetScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Budget</Text>
      <Text style={styles.subtitle}>Create budget form will be implemented here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default CreateBudgetScreen;

