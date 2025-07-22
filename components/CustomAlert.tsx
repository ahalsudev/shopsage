import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: AlertButton[];
  onClose: () => void;
}

export function CustomAlert({ visible, title, message, buttons, onClose }: CustomAlertProps) {
  const handleButtonPress = (onPress?: () => void) => {
    onPress?.();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.alertContainer}>
          <View style={styles.alertContent}>
            <Text style={styles.title}>{title}</Text>
            {message && <Text style={styles.message}>{message}</Text>}
          </View>
          
          <View style={styles.buttonContainer}>
            {buttons.map((button, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  button.style === 'cancel' && styles.cancelButton,
                  button.style === 'destructive' && styles.destructiveButton,
                  buttons.length === 1 && styles.singleButton,
                  index === 0 && buttons.length > 1 && styles.leftButton,
                  index === buttons.length - 1 && buttons.length > 1 && styles.rightButton,
                ]}
                onPress={() => handleButtonPress(button.onPress)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    button.style === 'cancel' && styles.cancelButtonText,
                    button.style === 'destructive' && styles.destructiveButtonText,
                  ]}
                >
                  {button.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Hook for easier usage
export function useCustomAlert() {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: AlertButton[];
  }>({
    visible: false,
    title: '',
    message: undefined,
    buttons: [],
  });

  const showAlert = (title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
    });
  };

  const hideAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  };

  const AlertComponent = (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onClose={hideAlert}
    />
  );

  return { showAlert, AlertComponent };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    minWidth: 280,
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  alertContent: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  singleButton: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  leftButton: {
    borderRightWidth: 0.5,
    borderRightColor: '#e5e7eb',
    borderBottomLeftRadius: 12,
  },
  rightButton: {
    borderLeftWidth: 0.5,
    borderLeftColor: '#e5e7eb',
    borderBottomRightRadius: 12,
  },
  cancelButton: {
    backgroundColor: '#f8fafc',
  },
  destructiveButton: {
    backgroundColor: '#fef2f2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  cancelButtonText: {
    color: '#64748b',
  },
  destructiveButtonText: {
    color: '#ef4444',
  },
});