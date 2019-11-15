import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {EstimatorComponent} from "./estimator/estimator.component";


const routes: Routes = [
  { path: '', redirectTo: '/estimate', pathMatch: 'full' },
  { path: 'estimate', component: EstimatorComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
