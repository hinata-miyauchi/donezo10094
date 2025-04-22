import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { initializeApp } from '@angular/fire/app';
import { Firestore, getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeJa from '@angular/common/locales/ja';
import { provideFirebaseApp } from '@angular/fire/app';

registerLocaleData(localeJa);

const firebaseConfig = {
  apiKey: "AIzaSyAFv8BX3yr5-m2qiInTjbq26mqnBFrhw_c",
  authDomain: "donezo10094.firebaseapp.com",
  projectId: "donezo10094",
  storageBucket: "donezo10094.appspot.com",
  messagingSenderId: "1001244353000",
  appId: "1:1001244353000:web:5ef2ea5770ca71a35c045d",
  measurementId: "G-Z37ECZSCKQ"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => {
      const app = initializeApp(firebaseConfig);
      return getFirestore(app);
    }),
    provideAuth(() => {
      const app = initializeApp(firebaseConfig);
      return getAuth(app);
    }),
    { provide: LOCALE_ID, useValue: 'ja-JP' }
  ]
};
