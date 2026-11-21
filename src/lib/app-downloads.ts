export const APP_DOWNLOAD_CONFIG = {
  appName: 'MovFlix',
  packageName: 'com.easyplexdocines',
  version: '2.4',

  // Enlace oficial de Google Play Store (Móviles y Tablets Android)
  googlePlayUrl:
    process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL ||
    'https://play.google.com/store/apps/details?id=com.easyplexdocines',

  // Enlace directo de descarga APK para Android TV / Google TV / Fire TV
  androidTvUrl:
    process.env.NEXT_PUBLIC_ANDROID_TV_URL ||
    'https://key.movflix.live/app-streamnexus.apk',

  // Código oficial para la app "Downloader by AFTVnews" en Android TV / Fire TV
  androidTvDownloaderCode: process.env.NEXT_PUBLIC_ANDROID_TV_CODE || '3035482',
};
