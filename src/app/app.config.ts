import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';
import { LOCALE_ID } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeJa from '@angular/common/locales/ja';
import { environment } from '../environments/environment';
import { provideAnimations } from '@angular/platform-browser/animations';

// Firebase imports
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';

registerLocaleData(localeJa);

export const appConfig: ApplicationConfig = {
  providers: [
    // Firebase Configuration
    importProvidersFrom(
      AngularFireModule.initializeApp(environment.firebase),
      AngularFirestoreModule,
      AngularFireAuthModule
    ),

    // Application Configuration
    provideRouter(routes),
    provideClientHydration(),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'ja-JP' }
  ]
};
