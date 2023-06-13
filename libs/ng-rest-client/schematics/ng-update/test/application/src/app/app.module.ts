import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ApiService } from './api.service';
import { AppComponent } from './app.component';
  @NgModule( {
    declarations: [AppComponent],
    imports: [BrowserModule],
    providers: [ApiService],
    bootstrap: [AppComponent]
  } )
  export class AppModule {}
