import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { login, loginSuccess, loginFailure, logout, logoutSuccess } from './authentication.actions';

@Injectable()
export class AuthenticationEffects {
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login),
      switchMap(({ email, password }) =>
        this.authService.login(email, password).pipe(
          map((response: any) => {
            const user = response?.data
              ? {
                  ...response.data,
                  token: response.token,
                }
              : response;
            if (user?.token) {
              sessionStorage.setItem('currentUser', JSON.stringify(user));
              sessionStorage.setItem('token', user.token);
            }
            return loginSuccess({ user });
          }),
          catchError((error: any) => of(loginFailure({ error: error?.message ?? 'Login failed' })))
        )
      )
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(loginSuccess),
        map(() => this.router.navigate(['/']))
      ),
    { dispatch: false }
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logout),
      map(() => {
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('token');
        this.router.navigate(['/auth/login']);
        return logoutSuccess();
      })
    )
  );

  constructor(
    private actions$: Actions,
    private authService: AuthenticationService,
    private router: Router
  ) {}
}
