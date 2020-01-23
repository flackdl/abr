import {NgModule} from '@angular/core';
import {Routes, RouterModule} from '@angular/router';
import {EstimateComponent} from "./estimate/estimate.component";
import {CustomerSearchComponent} from "./customer-search/customer-search.component";
import {CustomerCreateComponent} from "./customer-create/customer-create.component";
import {WizardComponent} from "./wizard/wizard.component";
import {PageNotFoundComponent} from "./page-not-found/page-not-found.component";
import {MainConcernComponent} from "./main-concern/main-concern.component";
import {CustomerComponent} from "./customer/customer.component";
import {EstimateWrapUpComponent} from "./estimate-wrap-up/estimate-wrap-up.component";
import {WizardGuard} from "./wizard.guard";
import {EstimateNotesComponent} from "./estimate-notes/estimate-notes.component";
import {StatementNotesComponent} from "./statement-notes/statement-notes.component";
import {CustomerEditComponent} from "./customer-edit/customer-edit.component";


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
          { path: 'edit', component: CustomerEditComponent },
        ]},
      { path: 'main-concern', component: MainConcernComponent },
      { path: 'estimate', component: EstimateComponent },
      { path: 'wrap-up', component: EstimateWrapUpComponent },
      { path: 'estimate-notes', component: EstimateNotesComponent },
      { path: 'statement-notes', component: StatementNotesComponent },
    ],
  },
  { path: '**', component: PageNotFoundComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true, scrollPositionRestoration: 'enabled' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
