import { create } from 'zustand';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number; // 毫秒，如果不设置则需要手动关闭
  createdAt: number;
}

interface NotificationStore {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  // 新增函数，用于标记通知将要关闭（触发动画）
  markNotificationForRemoval: (id: string) => void;
  // 新增属性，存储将要关闭的通知ID
  notificationsToRemove: string[];
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  notificationsToRemove: [],
  
  addNotification: (notification) => {
    const id = crypto.randomUUID();
    const newNotification = {
      ...notification,
      id,
      createdAt: Date.now(),
    };
    
    set((state) => ({
      notifications: [...state.notifications, newNotification]
    }));
    
    // 如果设置了持续时间，自动关闭通知
    if (notification.duration) {
      setTimeout(() => {
        // 先标记为将要移除，触发动画
        useNotificationStore.getState().markNotificationForRemoval(id);
        
        // 等待动画完成后再实际移除
        setTimeout(() => {
          useNotificationStore.getState().removeNotification(id);
        }, 300); // 动画持续时间
      }, notification.duration);
    }
    
    return id;
  },
  
  markNotificationForRemoval: (id) => {
    set((state) => ({
      notificationsToRemove: [...state.notificationsToRemove, id]
    }));
  },
  
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((notification) => notification.id !== id),
      notificationsToRemove: state.notificationsToRemove.filter(notifId => notifId !== id)
    }));
  },
  
  clearAllNotifications: () => {
    set({ notifications: [], notificationsToRemove: [] });
  }
})); 