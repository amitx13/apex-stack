import React, { createContext, useContext, useRef } from 'react';
import { MessageBottomSheet, MessageBottomSheetRef, MessageType } from '@/components/MessageBottomSheet';

interface MessageContextType {
  showMessage: (
    type: MessageType,
    title: string,
    message: string,
    options?: {
      onConfirm?: () => void;
      confirmText?: string;
      showCancel?: boolean;
      cancelText?: string;
    }
  ) => void;
  showSuccess: (title: string, message: string, onConfirm?: () => void) => void;
  showError: (title: string, message: string, onConfirm?: () => void) => void;
  showWarning: (
    title: string,
    message: string,
    onConfirm?: () => void,
    showCancel?: boolean
  ) => void;
  showInfo: (title: string, message: string, onConfirm?: () => void) => void;
}

const MessageContext = createContext<MessageContextType | undefined>(undefined);

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const messageRef = useRef<MessageBottomSheetRef>(null);

  const showMessage: MessageContextType['showMessage'] = (
    type,
    title,
    message,
    options
  ) => {
    messageRef.current?.show({
      type,
      title,
      message,
      ...options,
    });
  };

  const showSuccess: MessageContextType['showSuccess'] = (
    title,
    message,
    onConfirm
  ) => {
    showMessage('success', title, message, { onConfirm, confirmText: 'Great!' });
  };

  const showError: MessageContextType['showError'] = (title, message, onConfirm) => {
    showMessage('error', title, message, { onConfirm, confirmText: 'Got it' });
  };

  const showWarning: MessageContextType['showWarning'] = (
    title,
    message,
    onConfirm,
    showCancel = true
  ) => {
    showMessage('warning', title, message, {
      onConfirm,
      confirmText: 'Proceed',
      showCancel,
      cancelText: 'Cancel',
    });
  };

  const showInfo: MessageContextType['showInfo'] = (title, message, onConfirm) => {
    showMessage('info', title, message, { onConfirm, confirmText: 'OK' });
  };

  return (
    <MessageContext.Provider
      value={{
        showMessage,
        showSuccess,
        showError,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <MessageBottomSheet ref={messageRef} />
    </MessageContext.Provider>
  );
}

export const useMessage = () => {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error('useMessage must be used within MessageProvider');
  }
  return context;
};
