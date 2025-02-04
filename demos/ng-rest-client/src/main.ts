import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';

/**
 * TODO:
 */
platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
