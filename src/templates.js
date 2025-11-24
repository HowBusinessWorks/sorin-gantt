// Template system for different app themes
export const templates = {
  professional: {
    name: 'Professional',
    colors: {
      headerGradient: 'from-slate-700 via-slate-800 to-slate-900',
      monthHeaderGradient: 'from-slate-100 to-slate-200',
      monthHeaderHover: 'from-slate-200 to-slate-300',
      taskBarDefault: '#475569',
      borderColor: 'border-slate-400',
      gridLine: 'border-gray-400',
      gridLineLight: 'border-gray-300',
    },
    styles: {
      borderRadius: 'rounded-md', // Slightly rounded
      fontSize: 'text-xs',
      fontFamily: 'font-serif',
      shadow: 'shadow-lg',
    }
  },
  neumorphism: {
    name: 'Neumorphism',
    colors: {
      headerGradient: 'from-gray-100 via-gray-200 to-gray-300',
      monthHeaderGradient: 'from-gray-50 to-gray-100',
      monthHeaderHover: 'from-gray-100 to-gray-150',
      taskBarDefault: '#E5E7EB',
      borderColor: 'border-gray-300',
      gridLine: 'border-gray-200',
      gridLineLight: 'border-gray-100',
    },
    styles: {
      borderRadius: 'rounded-2xl',
      fontSize: 'text-xs',
      fontFamily: 'font-sans',
      shadow: 'shadow-lg',
    }
  },
  glassmorphism: {
    name: 'Glassmorphism',
    colors: {
      headerGradient: 'from-blue-400 via-blue-500 to-blue-600',
      monthHeaderGradient: 'from-blue-50 to-blue-100',
      monthHeaderHover: 'from-blue-100 to-blue-200',
      taskBarDefault: '#3B82F6',
      borderColor: 'border-blue-300',
      gridLine: 'border-blue-200',
      gridLineLight: 'border-blue-100',
    },
    styles: {
      borderRadius: 'rounded-2xl',
      fontSize: 'text-xs',
      fontFamily: 'font-sans',
      shadow: 'shadow-xl',
    }
  },
  brutalist: {
    name: 'Brutalist',
    colors: {
      headerGradient: 'from-black via-gray-900 to-black',
      monthHeaderGradient: 'from-gray-900 to-black',
      monthHeaderHover: 'from-gray-800 to-gray-900',
      taskBarDefault: '#1F2937',
      borderColor: 'border-white',
      gridLine: 'border-gray-600',
      gridLineLight: 'border-gray-700',
    },
    styles: {
      borderRadius: 'rounded-none',
      fontSize: 'text-xs',
      fontFamily: 'font-mono',
      shadow: 'shadow-none',
    }
  },
  monochrome: {
    name: 'Monochrome',
    colors: {
      headerGradient: 'from-gray-600 via-gray-700 to-gray-800',
      monthHeaderGradient: 'from-gray-200 to-gray-300',
      monthHeaderHover: 'from-gray-300 to-gray-400',
      taskBarDefault: '#6B7280',
      borderColor: 'border-gray-500',
      gridLine: 'border-gray-400',
      gridLineLight: 'border-gray-300',
    },
    styles: {
      borderRadius: 'rounded-lg',
      fontSize: 'text-xs',
      fontFamily: 'font-sans',
      shadow: 'shadow-md',
    }
  }
};

export const defaultTemplate = 'professional';
