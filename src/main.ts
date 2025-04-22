import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { initializeApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { provideFirebaseApp } from '@angular/fire/app';

const firebaseConfig = {
  apiKey: "AIzaSyAFv8BX3yr5-m2qiInTjbq26mqnBFrhw_c",
  authDomain: "donezo10094.firebaseapp.com",
  projectId: "donezo10094",
  storageBucket: "donezo10094.appspot.com",
  messagingSenderId: "1001244353000",
  appId: "1:1001244353000:web:5ef2ea5770ca71a35c045d",
  measurementId: "G-Z37ECZSCKQ"
};

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth())
  ]
}).catch(err => console.error(err));
