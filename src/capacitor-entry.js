// src/capacitor-entry.js — the only file in this project that uses imports.
//
// The app itself is plain scripts sharing one global scope, with no
// bundler. Capacitor's own JavaScript is published as ES modules, so it
// gets bundled here, once, into vendor/capacitor.js and loaded like any
// other vendored library.
//
// @capacitor-firebase/authentication is deliberately not in here: its web
// implementation imports the Firebase JS SDK at module level, and we only
// ever sign in natively. On a device it is reached through the bridge, at
// Capacitor.Plugins.FirebaseAuthentication.

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

window.Cap = {
  Capacitor, App, Camera, CameraResultType, CameraSource,
  Haptics, ImpactStyle, NotificationType, SplashScreen, StatusBar, Style,
};
