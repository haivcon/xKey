import { useEffect, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

/* global __XKEY_APP_VERSION__ */
export const PACKAGE_VERSION = typeof __XKEY_APP_VERSION__ !== 'undefined' ? __XKEY_APP_VERSION__ : '0.0.0';

export default function useAppVersion() {
  const [version, setVersion] = useState(PACKAGE_VERSION);
  const [build, setBuild] = useState('');

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    CapacitorApp.getInfo()
      .then((info) => {
        if (cancelled) return;
        if (info.version) setVersion(info.version);
        if (info.build) setBuild(info.build);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    version,
    build,
    label: `v${version}`,
    fullLabel: build ? `v${version} (${build})` : `v${version}`,
  };
}
