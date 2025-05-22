import React, { useEffect, useRef } from 'react';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react';
import { gsap } from 'gsap';
import { useNotificationStore, NotificationType, Notification } from '../stores/notificationStore';

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
  isMarkedForRemoval: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose, isMarkedForRemoval }) => {
  const notificationRef = useRef<HTMLDivElement>(null);
  
  // 根据通知类型获取对应的图标和颜色
  const getNotificationStyles = (type: NotificationType) => {
    switch (type) {
      case 'info':
        return {
          icon: <Info size={20} />,
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-400',
          textColor: 'text-blue-700',
          iconColor: 'text-blue-400'
        };
      case 'success':
        return {
          icon: <CheckCircle size={20} />,
          bgColor: 'bg-green-50',
          borderColor: 'border-green-400',
          textColor: 'text-green-700',
          iconColor: 'text-green-400'
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={20} />,
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-400',
          textColor: 'text-yellow-700',
          iconColor: 'text-yellow-400'
        };
      case 'error':
        return {
          icon: <AlertCircle size={20} />,
          bgColor: 'bg-red-50',
          borderColor: 'border-red-400',
          textColor: 'text-red-700',
          iconColor: 'text-red-400'
        };
      default:
        return {
          icon: <Info size={20} />,
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-400',
          textColor: 'text-gray-700',
          iconColor: 'text-gray-400'
        };
    }
  };

  const styles = getNotificationStyles(notification.type);

  // 入场动画
  useEffect(() => {
    if (notificationRef.current) {
      gsap.fromTo(
        notificationRef.current,
        { 
          x: 100, 
          opacity: 0,
          scale: 0.95
        },
        { 
          x: 0, 
          opacity: 1, 
          scale: 1,
          duration: 0.4,
          ease: "power2.out"
        }
      );
    }
  }, []);

  // 监听是否标记为删除，如果是则播放退出动画
  useEffect(() => {
    if (isMarkedForRemoval && notificationRef.current) {
      gsap.to(notificationRef.current, {
        x: 100,
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: "power2.in",
        onComplete: onClose
      });
    }
  }, [isMarkedForRemoval, onClose]);

  // 点击关闭按钮的动画
  const handleClose = () => {
    // 标记为将要移除，触发动画
    useNotificationStore.getState().markNotificationForRemoval(notification.id);
  };

  return (
    <div
      ref={notificationRef}
      className={`flex items-center justify-between p-4 mb-3 rounded-lg shadow-md border-l-4 ${styles.bgColor} ${styles.borderColor}`}
      style={{ width: '400px' }}
    >
      <div className="flex items-center">
        <div className={`mr-3 ${styles.iconColor}`}>
          {styles.icon}
        </div>
        <div className={`${styles.textColor}`}>
          {notification.message}
        </div>
      </div>
      <button
        onClick={handleClose}
        className="ml-4 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <X size={18} />
      </button>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification, notificationsToRemove } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
          isMarkedForRemoval={notificationsToRemove.includes(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationContainer; 