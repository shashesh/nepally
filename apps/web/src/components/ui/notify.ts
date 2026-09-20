/**
 * Toasts for the whole web app. Callers pass a sentence; colour and duration
 * are decided here so success and failure always look the same.
 */
import { notifications } from '@mantine/notifications';

export const notify = {
  success(message: string): void {
    notifications.show({ message, color: 'green', autoClose: 2500 });
  },
  error(message: string): void {
    notifications.show({ message, color: 'red', autoClose: 5000 });
  },
};
