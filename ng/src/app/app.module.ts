import { HttpClientModule, HttpClientXsrfModule } from '@angular/common/http';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { FormsModule, ReactiveFormsModule  } from '@angular/forms';
import { MomentModule } from 'ngx-moment';
import { NgxLoadingModule } from 'ngx-loading';


import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { EstimatorComponent } from './estimator/estimator.component';
import { CustomerSearchComponent } from './customer-search/customer-search.component';
import { WizardComponent } from './wizard/wizard.component';
import { CustomerCreateComponent } from './customer-create/customer-create.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';

@NgModule({
  declarations: [
    AppComponent,
    EstimatorComponent,
    CustomerSearchComponent,
    WizardComponent,
    CustomerCreateComponent,
    PageNotFoundComponent,
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MomentModule,
    HttpClientXsrfModule.withOptions({
      // specify django's csrf settings
      cookieName: 'csrftoken',
      headerName: 'X-CSRFToken',
    }),
    AppRoutingModule,
    NgSelectModule,
    NgxLoadingModule.forRoot({})
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
