declare const __XKEY_APP_VERSION__: string;
declare const __XKEY_INTEGRITY_PUBLIC_KEY__: string;

interface Window {
  webkitAudioContext?: typeof AudioContext;
}

interface DeviceMotionEventConstructor {
  requestPermission?: () => Promise<PermissionState>;
}
