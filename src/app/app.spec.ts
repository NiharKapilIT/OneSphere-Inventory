import { TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [MessageService],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  // app.html only ever rendered <p-toast> + <router-outlet> -- there has
  // never been an <h1>/title element for this app to display, so the
  // default CLI-scaffolded "should render title" assertion tested markup
  // that doesn't exist in this app and always failed once DI was fixed.
  it('should render the toast host and router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p-toast')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
