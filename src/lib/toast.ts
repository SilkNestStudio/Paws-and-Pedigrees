import toast from 'react-hot-toast';

// Enhanced toast utility with better styling and animations
const baseStyle = {
  padding: '16px 20px',
  borderRadius: '12px',
  fontWeight: '500',
  fontSize: '14px',
  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
  maxWidth: '420px',
};

export const showToast = {
  success: (message: string, duration = 3000) => {
    toast.success(message, {
      duration,
      position: 'top-center',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: '#fff',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10b981',
      },
    });
  },

  error: (message: string, duration = 4000) => {
    toast.error(message, {
      duration,
      position: 'top-center',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        color: '#fff',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#ef4444',
      },
    });
  },

  info: (message: string, duration = 3000) => {
    toast(message, {
      duration,
      position: 'top-center',
      icon: 'ℹ️',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        color: '#fff',
      },
    });
  },

  warning: (message: string, duration = 3500) => {
    toast(message, {
      duration,
      position: 'top-center',
      icon: '⚠️',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        color: '#fff',
      },
    });
  },

  // New variants for better UX
  achievement: (message: string, duration = 4000) => {
    toast(message, {
      duration,
      position: 'top-center',
      icon: '🏆',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        color: '#fff',
        fontWeight: '600',
      },
    });
  },

  reward: (message: string, duration = 3500) => {
    toast(message, {
      duration,
      position: 'top-center',
      icon: '✨',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
        color: '#fff',
      },
    });
  },

  levelUp: (message: string, duration = 4000) => {
    toast(message, {
      duration,
      position: 'top-center',
      icon: '⬆️',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        color: '#fff',
        fontWeight: '600',
      },
    });
  },

  bondIncrease: (message: string, duration = 3000) => {
    toast(message, {
      duration,
      position: 'top-center',
      icon: '💖',
      style: {
        ...baseStyle,
        background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
        color: '#fff',
      },
    });
  },

  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-center',
      style: {
        ...baseStyle,
        background: '#fff',
        color: '#374151',
      },
    });
  },

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  custom: (message: string, options?: any) => {
    toast(message, {
      duration: 3000,
      position: 'top-center',
      style: baseStyle,
      ...options,
    });
  },
};
