import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

setupZoneTestEnv();

// Some component specs declare components that inject NgRx Store (and other
// routed services) but never configure them in the TestBed. To let these
// legacy specs compile and run without modifying dozens of individual spec
// files, we globally ensure a MockStore provider is available in every
// TestBed module.
const originalConfigureTestingModule = TestBed.configureTestingModule.bind(TestBed);
TestBed.configureTestingModule = (config: Parameters<typeof TestBed.configureTestingModule>[0]): typeof TestBed => {
  const providers = config.providers ?? [];
  const wrapped = {
    ...config,
    providers: [
      ...providers,
      provideMockStore(),
    ],
  };
  return originalConfigureTestingModule(wrapped) as typeof TestBed;
};
