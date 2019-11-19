import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {EstimatorComponent} from "./estimator/estimator.component";
import {CustomerComponent} from "./customer/customer.component";
import {WizardComponent} from "./wizard/wizard.component";


const routes: Routes = [
  { path: '', redirectTo: 'wizard', pathMatch: 'full' },
  {
    path: 'wizard',
    component: WizardComponent,
    children: [
      { path: '', redirectTo: 'customer', pathMatch: 'full' },
      { path: 'customer', component: CustomerComponent },
      { path: 'estimate', component: EstimatorComponent },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
