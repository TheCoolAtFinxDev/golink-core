// $localize polyfill — required by ng-bootstrap pagination aria labels
(globalThis as unknown as Record<string, unknown>)['$localize'] = (
  messageParts: TemplateStringsArray,
  ...expressions: unknown[]
): string => {
  let result = messageParts[0];
  expressions.forEach((expr, i) => { result += String(expr) + messageParts[i + 1]; });
  return result;
};

import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  enableProdMode();
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('[unhandledrejection]', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[window.error]', event.error ?? event.message);
});

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
