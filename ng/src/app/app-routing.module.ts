import {Component, NgModule} from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {EstimateComponent} from "./estimate/estimate.component";
import {CustomerSearchComponent} from "./customer-search/customer-search.component";
import {CustomerCreateComponent} from "./customer-create/customer-create.component";
import {WizardComponent} from "./wizard/wizard.component";
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {MainConcernComponent} from "./main-concern/main-concern.component";
import {QuestionnaireComponent} from "./questionnaire/questionnaire.component";


const routes: Routes = [
  { path: '', redirectTo: 'wizard', pathMatch: 'full' },
  {
    path: 'wizard',
    component: WizardComponent,
    children: [
      { path: '', redirectTo: 'customer/search', pathMatch: 'full' },
      { path: 'customer/search', component: CustomerSearchComponent },
      { path: 'customer/create', component: CustomerCreateComponent },
      { path: 'main-concern', component: MainConcernComponent },
      { path: 'questionnaire', component: QuestionnaireComponent },
      { path: 'estimate', component: EstimateComponent },
    ],
  },
  { path: '**', component: PageNotFoundComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
