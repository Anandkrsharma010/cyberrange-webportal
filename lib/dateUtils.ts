// Date utility functions for Indian Standard Time (IST)

export const formatDateIST = (date: string | Date | undefined | null): string => {
  if (!date) {
    return 'N/A';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  // Format date in Indian timezone
  return dateObj.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const formatDateTimeIST = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Format date and time in Indian timezone
  return dateObj.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatTimeIST = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Format time in Indian timezone
  return dateObj.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const getCurrentIST = (): Date => {
  // Get current time in IST
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};
