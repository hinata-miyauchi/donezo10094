import { ApplicationConfig } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideFirebaseApp, initializeApp, FirebaseApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, Firestore, enableIndexedDbPersistence } from '@angular/fire/firestore';
import { provideAuth, getAuth, Auth } from '@angular/fire/auth';

// TODO: 以下のconfigを実際のFirebaseプロジェクトの設定値に置き換えてください
const firebaseConfig = {
  apiKey: "AIzaSyAFv8BX3yr5-m2qiInTjbq26mqnBFrhw_c",
  authDomain: "donezo10094.firebaseapp.com",
  projectId: "donezo10094",
  storageBucket: "donezo10094.firebasestorage.app",
  messagingSenderId: "1001244353000",
  appId: "1:1001244353000:web:5ef2ea5770ca71a35c045d",
  measurementId: "G-Z37ECZSCKQ"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withRouterConfig({
      onSameUrlNavigation: 'reload',
      paramsInheritanceStrategy: 'always',
      urlUpdateStrategy: 'eager'
    })),
    provideClientHydration(),
    provideAnimations(),
    provideFirebaseApp(() => {
      const app = initializeApp(firebaseConfig);
      return app;
    }),
    provideFirestore(() => {
      const firestore = getFirestore();
      enableIndexedDbPersistence(firestore).catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
        } else if (err.code == 'unimplemented') {
          console.warn('The current browser does not support persistence.');
        }
      });
      return firestore;
    }),
    provideAuth(() => getAuth())
  ]
};
