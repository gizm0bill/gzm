import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ApiService } from './api.service';
import { AppComponent } from './app.component';
import { AuthService } from './auth.service';
@NgModule( {
  declarations: [AppComponent],
  imports: [BrowserModule],
  providers: [ApiService, AuthService],
  bootstrap: [AppComponent]
} )
export class AppModule {}
