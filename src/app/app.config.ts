import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { provideFirebaseApp } from '@angular/fire/app';
import { provideFirestore } from '@angular/fire/firestore';
import { provideAuth } from '@angular/fire/auth';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAFv8BX3yr5-m2qiInTjbq26mqnBFrhw_c",
  authDomain: "donezo10094.firebaseapp.com",
  projectId: "donezo10094",
  storageBucket: "donezo10094.firebasestorage.app",
  messagingSenderId: "1001244353000",
  appId: "1:1001244353000:web:5ef2ea5770ca71a35c045d",
  measurementId: "G-Z37ECZSCKQ"
};

// Firebase アプリケーションを初期化
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideFirebaseApp(() => app),
    provideFirestore(() => firestore),
    provideAuth(() => getAuth(app))
  ]
};
