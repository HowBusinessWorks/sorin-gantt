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
  }
};

export const defaultTemplate = 'professional';
