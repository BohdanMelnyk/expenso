import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Surface, IconButton } from 'react-native-paper';

const { width } = Dimensions.get('window');

type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onClose: () => void;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  duration = 3000, 
  onClose,
  visible 
}) => {
  const [slideAnim] = useState(new Animated.Value(-100));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Show toast
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getToastColors = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#4CAF50',
          iconColor: '#fff',
        };
      case 'error':
        return {
          backgroundColor: '#F44336',
          iconColor: '#fff',
        };
      case 'info':
      default:
        return {
          backgroundColor: '#2196F3',
          iconColor: '#fff',
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-circle';
      case 'info':
      default:
        return 'information';
    }
  };

  const colors = getToastColors();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Surface style={[styles.toast, { backgroundColor: colors.backgroundColor }]}>
        <View style={styles.content}>
          <IconButton
            icon={getIcon()}
            iconColor={colors.iconColor}
            size={20}
            style={styles.icon}
          />
          <Text style={[styles.message, { color: colors.iconColor }]} numberOfLines={3}>
            {message}
          </Text>
          <IconButton
            icon="close"
            iconColor={colors.iconColor}
            size={16}
            onPress={hideToast}
            style={styles.closeButton}
          />
        </View>
      </Surface>
    </Animated.View>
  );
};

// Toast container to manage multiple toasts
export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ 
  toasts, 
  onRemoveToast 
}) => {
  return (
    <View style={styles.container}>
      {toasts.map((toast, index) => (
        <Animated.View
          key={toast.id}
          style={[
            styles.toastWrapper,
            { 
              transform: [{ translateY: index * 60 }],
              zIndex: toasts.length - index,
            }
          ]}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => onRemoveToast(toast.id)}
            visible={true}
          />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastWrapper: {
    position: 'absolute',
    width: '100%',
  },
  toast: {
    borderRadius: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingRight: 8,
  },
  icon: {
    margin: 0,
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    margin: 0,
    marginLeft: 8,
  },
});