const theme = {
  colors: {
    primary: '#3366FF',
    accent: '#FF6B00',
    background: '#F7F9FC',
    card: '#FFFFFF',
    text: '#222B45',
    textSecondary: '#8F9BB3',
    border: '#E4E9F2',
    notification: '#FF3D71',
    error: '#FF3D71',
    errorLight: '#FFE9EC',
    success: '#00E096',
    successLight: '#E5FFF7',
    warning: '#FFAA00',
    warningLight: '#FFF7E5',
    info: '#0095FF',
    infoLight: '#E9F5FF',
    grey: '#8F9BB3',
    lightGrey: '#EDF1F7',
  },
  radius: {
    small: 4,
    medium: 8,
    large: 12,
    extraLarge: 24,
    circle: 100
  },
  shadow: {
    tiny: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 1,
    },
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 8,
    }
  },
  spacing: {
    xs: 4,
    small: 8,
    medium: 16,
    large: 24,
    xl: 32,
    xxl: 40
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    size: {
      xs: 10,
      small: 12,
      medium: 14,
      large: 16,
      xl: 20,
      xxl: 24,
      xxxl: 32
    }
  },
  animation: {
    scale: 1.03,
    duration: 200
  }
};

export default theme; 