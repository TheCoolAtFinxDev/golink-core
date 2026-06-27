import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { PayPageComponent } from './pay-page.component';
import { PaySuccessComponent } from './pay-success.component';
import { PayFailedComponent } from './pay-failed.component';

const routes: Routes = [
  { path: 'success', component: PaySuccessComponent },
  { path: 'failed', component: PayFailedComponent },
  { path: ':shortCode', component: PayPageComponent },
];

@NgModule({
  declarations: [PayPageComponent, PaySuccessComponent, PayFailedComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(routes),
  ],
})
export class PayModule {}
