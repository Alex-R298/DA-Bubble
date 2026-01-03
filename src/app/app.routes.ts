import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SignupComponent } from './components/signup/signup.component';
import { IntroComponent } from './components/intro/intro.component';
import { ImprintComponent } from './components/imprint/imprint.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ChatWindowComponent } from './components/chat-window/chat-window.component';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'intro', component: IntroComponent },
  { path: 'imprint', component: ImprintComponent },
  {
    path: 'dashboard',
    component: DashboardComponent,
    children: [
      { path: '', component: ChatWindowComponent },
      { path: 'chat/channel/:id', component: ChatWindowComponent },
      { path: 'chat/user/:id', component: ChatWindowComponent }
    ]
  },
  { path: '**', redirectTo: 'login' }
];

