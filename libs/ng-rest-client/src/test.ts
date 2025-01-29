import 'core-js/es/reflect';
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
( window as any ).global = window;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;

getTestBed().initTestEnvironment( BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
  teardown: { destroyAfterEach: false },
} );
const context = require.context( './', true, /\.spec\.ts$/ );
context.keys().map( context );
