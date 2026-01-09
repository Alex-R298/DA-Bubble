import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { IntroComponent } from './components/intro/intro.component';
import { ImprintComponent } from './components/imprint/imprint.component';
import { PrivacyPolicyComponent } from './components/privacy-policy/privacy-policy.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';
import { ChooseAvatarComponent } from './components/choose-avatar/choose-avatar.component';
import { SplashScreenComponent } from './components/splash-screen/splash-screen.component';
import { SettingsComponent } from './components/settings/settings.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: SplashScreenComponent, data: { hideHeaderFooter: true } },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'choose-avatar', component: ChooseAvatarComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'intro', component: IntroComponent },
  { path: 'imprint', component: ImprintComponent },
  { path: 'privacy-policy', component: PrivacyPolicyComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', component: ChatWindowComponent },
      { path: 'chat/channel/:id', component: ChatWindowComponent },
      { path: 'chat/user/:userId', component: ChatWindowComponent }
    ]
  },
  { path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
  { path: '**', component: PageNotFoundComponent, data: { hideHeaderFooter: true } }
];

