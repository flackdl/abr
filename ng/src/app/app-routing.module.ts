import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {EstimateComponent} from "./estimate/estimate.component";
import {CustomerSearchComponent} from "./customer-search/customer-search.component";
import {CustomerCreateComponent} from "./customer-create/customer-create.component";
import {WizardComponent} from "./wizard/wizard.component";
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {MainConcernComponent} from "./main-concern/main-concern.component";
import {QuestionnaireComponent} from "./questionnaire/questionnaire.component";
import {CustomerComponent} from "./customer/customer.component";
import {EstimateWrapUpComponent} from "./estimate-wrap-up/estimate-wrap-up.component";
import {ReviewComponent} from "./review/review.component";
import {WizardGuard} from "./wizard.guard";
import {EstimateNotesComponent} from "./estimate-notes/estimate-notes.component";


const routes: Routes = [
  { path: '', redirectTo: 'wizard', pathMatch: 'full' },
  {
    path: 'wizard',
    component: WizardComponent,
    canActivateChild: [WizardGuard],
    children: [
      { path: '', redirectTo: 'customer', pathMatch: 'full' },
      {
        path: 'customer',
        component: CustomerComponent,
        children: [
          { path: '', redirectTo: 'search', pathMatch: 'full' },
          { path: 'search', component: CustomerSearchComponent },
          { path: 'create', component: CustomerCreateComponent },
        ]},
      { path: 'main-concern', component: MainConcernComponent },
      { path: 'questionnaire', component: QuestionnaireComponent },
      { path: 'estimate', component: EstimateComponent },
      { path: 'wrap-up', component: EstimateWrapUpComponent },
      { path: 'review', component: ReviewComponent },
      { path: 'notes', component: EstimateNotesComponent },
    ],
  },
  { path: '**', component: PageNotFoundComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true, scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
