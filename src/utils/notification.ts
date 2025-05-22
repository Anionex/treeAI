import { useNotificationStore, NotificationType } from '../stores/notificationStore';

// 默认通知持续时间（毫秒）
const DEFAULT_DURATION = 3000;

/**
 * 显示通知的辅助函数
 * @param message 通知消息
 * @param type 通知类型
 * @param duration 持续时间（毫秒），如果不设置则使用默认值
 * @returns 通知ID
 */
export const showNotification = (
  message: string,
  type: NotificationType = 'info',
  duration: number = DEFAULT_DURATION
): string => {
  return useNotificationStore.getState().addNotification({
    message,
    type,
    duration
  });
};

/**
 * 显示信息通知
 * @param message 通知消息
 * @param duration 持续时间（毫秒）
 * @returns 通知ID
 */
export const showInfo = (message: string, duration?: number): string => {
  return showNotification(message, 'info', duration);
};

/**
 * 显示成功通知
 * @param message 通知消息
 * @param duration 持续时间（毫秒）
 * @returns 通知ID
 */
export const showSuccess = (message: string, duration?: number): string => {
  return showNotification(message, 'success', duration);
};

/**
 * 显示警告通知
 * @param message 通知消息
 * @param duration 持续时间（毫秒）
 * @returns 通知ID
 */
export const showWarning = (message: string, duration?: number): string => {
  return showNotification(message, 'warning', duration);
};

/**
 * 显示错误通知
 * @param message 通知消息
 * @param duration 持续时间（毫秒）
 * @returns 通知ID
 */
export const showError = (message: string, duration?: number): string => {
  return showNotification(message, 'error', duration);
};

/**
 * 移除指定的通知（带动画）
 * @param id 通知ID
 */
export const removeNotification = (id: string): void => {
  // 先标记为将要移除，触发动画
  useNotificationStore.getState().markNotificationForRemoval(id);
  
  // 等待动画完成后再实际移除
  setTimeout(() => {
    useNotificationStore.getState().removeNotification(id);
  }, 300); // 动画持续时间
};

/**
 * 清除所有通知
 */
export const clearAllNotifications = (): void => {
  useNotificationStore.getState().clearAllNotifications();
}; 