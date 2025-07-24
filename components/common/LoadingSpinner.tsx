import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#6366f1',
  message,
  overlay = false,
}) => {
  const containerStyle = overlay ? [styles.container, styles.overlay] : styles.container;

  return (
    <View style={containerStyle}>
      <View style={styles.spinnerContainer}>
        <ActivityIndicator size={size} color={color} />
        {message && (
          <Text style={[styles.message, { color }]}>{message}</Text>
        )}
      </View>
    </View>
  );
};

interface LoadingStateProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  overlay?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  overlay = false,
}) => {
  if (isLoading) {
    return (
      <LoadingSpinner 
        message={message} 
        overlay={overlay}
      />
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  spinnerContainer: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default LoadingSpinner;