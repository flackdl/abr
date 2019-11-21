import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import {APP_INITIALIZER, NgModule} from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule  } from '@angular/forms';
import { MomentModule } from 'ngx-moment';
import { NgxLoadingModule } from 'ngx-loading';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {NgxWebstorageModule} from 'ngx-webstorage';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EstimatorComponent } from './estimator/estimator.component';
import { CustomerSearchComponent } from './customer-search/customer-search.component';
import { WizardComponent } from './wizard/wizard.component';
import { CustomerCreateComponent } from './customer-create/customer-create.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import {ApiService} from "./api.service";
import {ToastrModule} from "ngx-toastr";
import { MainConcernComponent } from './main-concern/main-concern.component';
import { QuestionComponent } from './question/question.component';


export function init(api: ApiService) {
  return () => api.init().toPromise().then(
    (data) => {
      console.log('app init success');
    }, (error) => {
    console.error('app init failed');
  }
  );
}


@NgModule({
  declarations: [
    AppComponent,
    EstimatorComponent,
    CustomerSearchComponent,
    WizardComponent,
    CustomerCreateComponent,
    PageNotFoundComponent,
    MainConcernComponent,
    QuestionComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MomentModule,
    HttpClientXsrfModule.withOptions({
      // django's csrf settings
      cookieName: 'csrftoken',
      headerName: 'X-CSRFToken',
    }),
    BrowserAnimationsModule,
    ToastrModule.forRoot(),
    AppRoutingModule,
    NgSelectModule,
    NgxLoadingModule.forRoot({}),
    NgxWebstorageModule.forRoot(),
  ],
  providers: [
    { provide: APP_INITIALIZER, useFactory: init, deps: [ApiService], multi: true },

  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
