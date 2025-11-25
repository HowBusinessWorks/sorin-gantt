import { months, totalMonths, weeksPerMonth, totalWeeks } from './data.js';

// Helper function to get progress color based on percentage
export const getProgressColor = (progress) => {
  if (progress === 0) return 'bg-gray-400';
  if (progress >= 1 && progress <= 49) return 'bg-yellow-500';
  if (progress >= 50 && progress <= 99) return 'bg-blue-500';
  if (progress === 100) return 'bg-green-500';
  return 'bg-gray-400';
};

// Helper function to get total months in year
export const getTotalMonths = () => {
  return totalMonths;
};

// Helper function to get month name
export const getMonthName = (monthIndex) => {
  return months[monthIndex] || '';
};

// Week-based helper functions
export const getTotalWeeks = () => {
  return totalWeeks;
};

// Convert month position to week position
export const monthToWeekStart = (startMonth) => {
  return startMonth * weeksPerMonth;
};

// Convert month duration to weeks
export const monthDurationToWeeks = (duration) => {
  return duration * weeksPerMonth;
};

// Get week number within a month (1-4)
export const getWeekOfMonth = (weekIndex) => {
  return (weekIndex % weeksPerMonth) + 1;
};

// Helper function to darken a hex color
export const darkenColor = (hexColor, percent = 0.4) => {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse hex to RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Darken by reducing RGB values
  const darkR = Math.max(0, Math.floor(r * (1 - percent)));
  const darkG = Math.max(0, Math.floor(g * (1 - percent)));
  const darkB = Math.max(0, Math.floor(b * (1 - percent)));

  // Convert back to hex
  return '#' + [darkR, darkG, darkB].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};