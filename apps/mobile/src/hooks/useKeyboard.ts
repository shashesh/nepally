import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

interface UseKeyboardReturn {
  isKeyboardVisible: boolean;
  keyboardHeight: number;
}

/**
 * Hook to detect keyboard visibility and height
 */
export function useKeyboard(): UseKeyboardReturn {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      'keyboardDidShow',
      (event: KeyboardEvent) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const hideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return {
    isKeyboardVisible,
    keyboardHeight,
  };
}
