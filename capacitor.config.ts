import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.nexodigital.closetsync',
  appName: 'ClosetSync',
  webDir: 'dist',
  plugins: {
    CapacitorSQLite: {
      // Android: use a shared SQLite database stored in the app's data folder
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: "Biometric login",
        biometricSubTitle: "Log in using your biometric",
      },
    },
  },
};

export default config;