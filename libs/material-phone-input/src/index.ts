import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MaterialPhoneInputComponent } from './component';
import { SearchPipe } from './search.pipe';

@NgModule({
  declarations: [
    MaterialPhoneInputComponent,
    SearchPipe,
  ],
  imports:[
    CommonModule,
    MatInputModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  exports: [
    MaterialPhoneInputComponent
  ]
})
export class MaterialPhoneInputModule { }
export * from './component';
