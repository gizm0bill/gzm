import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { MatDividerModule } from '@angular/material/divider';

import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MaterialPhoneInputComponent } from './component';
import { SearchPipe } from './search.pipe';

describe( 'MaterialPhoneInputComponent', () => {
  let component: MaterialPhoneInputComponent;
  let fixture: ComponentFixture<MaterialPhoneInputComponent>;

  beforeEach( waitForAsync( () => {
    TestBed.configureTestingModule( {
      declarations: [ MaterialPhoneInputComponent, SearchPipe ],
      imports: [
        CommonModule,
        FormsModule,
        MatInputModule,
        MatMenuModule,
        MatButtonModule,
        MatDividerModule,
        ReactiveFormsModule,
      ],
    } ).compileComponents();
  } ) );

  beforeEach( () => {
    fixture = TestBed.createComponent( MaterialPhoneInputComponent );
    component = fixture.componentInstance;
    fixture.detectChanges();
  } );

  it( 'should create', () => {
    expect( component ).toBeTruthy();
  } );
} );
