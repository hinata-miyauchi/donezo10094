import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IssueFormComponent } from './components/issue-form/issue-form.component';
import { IssueDetailComponent } from './components/issue-detail/issue-detail.component';
import { IssueCalendarComponent } from './components/issue-calendar/issue-calendar.component';
import { HomeComponent } from './components/home/home.component';
import { FullCalendarModule } from '@fullcalendar/angular';
import { AppComponent } from './app/app.component';

const firebaseConfig = {
  apiKey: "AIzaSyAFv8BX3yr5-m2qiInTjbq26mqnBFrhw_c",
  authDomain: "donezo10094.firebaseapp.com",
  projectId: "donezo10094",
  storageBucket: "donezo10094.appspot.com",
  messagingSenderId: "1001244353000",
  appId: "1:1001244353000:web:5ef2ea5770ca71a35c045d",
  measurementId: "G-Z37ECZSCKQ"
};

@NgModule({
  declarations: [
    IssueFormComponent,
    IssueDetailComponent,
    IssueCalendarComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    RouterModule.forRoot(routes),
    ReactiveFormsModule,
    FormsModule,
    FullCalendarModule,
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth())
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 