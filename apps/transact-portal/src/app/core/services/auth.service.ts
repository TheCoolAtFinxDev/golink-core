import { Injectable } from '@angular/core';
import { getFirebaseBackend } from '../../authUtils';
import { User } from 'src/app/store/Authentication/auth.models';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { GlobalComponent } from "../../global-component";
import { Store } from '@ngrx/store';
import { RegisterSuccess, loginFailure, loginSuccess, logout, logoutSuccess } from 'src/app/store/Authentication/authentication.actions';
import { environment } from 'src/environments/environment';

const AUTH_API = GlobalComponent.AUTH_API;

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };
  

@Injectable({ providedIn: 'root' })

/**
 * Auth-service Component
 */
export class AuthenticationService {

    user!: User;

    private currentUserSubject: BehaviorSubject<User | null>;
    // public currentUser: Observable<User>;

    constructor(private http: HttpClient, private store: Store) {
        const storedUser = sessionStorage.getItem('currentUser');
        this.currentUserSubject = new BehaviorSubject<User | null>(
            storedUser ? (JSON.parse(storedUser) as User) : null,
        );
        // this.currentUser = this.currentUserSubject.asObservable();
     }

    public get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    /**
     * Performs the register
     * @param email email
     * @param password password
     */
    register(email: string, first_name: string, password: string) {        
        // return getFirebaseBackend()!.registerUser(email, password).then((response: any) => {
        //     const user = response;
        //     return user;
        // });

        if (environment.defaultauth === 'fakebackend') {
            return this.http.post('/users/register', {
                email,
                username: first_name,
                firstName: first_name,
                password,
            }, httpOptions).pipe(
                map(() => ({ status: 'success' })),
                catchError((error: any) => {
                    const errorMessage = error?.error?.message || 'Register failed';
                    this.store.dispatch(loginFailure({ error: errorMessage }));
                    return throwError(() => new Error(errorMessage));
                })
            );
        }

        // Register Api
        return this.http.post(AUTH_API + 'signup', {
            email,
            first_name,
            password,
          }, httpOptions).pipe(
            map((response: any) => {
                const user = response;
                return user;
            }),
            catchError((error: any) => {
                const errorMessage = error?.error?.message || 'Login failed';
                this.store.dispatch(loginFailure({ error: errorMessage }));
                return throwError(() => new Error(errorMessage));
            })
        );
    }

    /**
     * Performs the auth
     * @param email email of user
     * @param password password of user
     */
    login(email: string, password: string) {
        // return getFirebaseBackend()!.loginUser(email, password).then((response: any) => {
        //     const user = response;
        //     return user;
        // });

        const loginUrl = environment.defaultauth === 'fakebackend'
            ? '/users/authenticate'
            : AUTH_API + 'login';

        return this.http.post(loginUrl, {
            email,
            password
          }, httpOptions).pipe(
            map((response: any) => {
                const user = environment.defaultauth === 'fakebackend'
                    ? {
                        status: 'success',
                        data: response,
                        token: response?.token ?? 'fake-jwt-token'
                    }
                    : response;
                return user;
            }),
            catchError((error: any) => {
                const errorMessage = error?.error?.message || 'Login failed';
                return throwError(() => new Error(errorMessage));
            })
        );
    }

    /**
     * Returns the current user
     */
    public currentUser(): any {
        return getFirebaseBackend()!.getAuthenticatedUser();
    }

    /**
     * Logout the user
     */
    logout() {
        this.store.dispatch(logout());
        // logout the user
        // return getFirebaseBackend()!.logout();
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('token');
        this.currentUserSubject.next(null!);

        return of(undefined).pipe(
        
        );

    }

    /**
     * Reset password
     * @param email email
     */
    resetPassword(email: string) {
        return getFirebaseBackend()!.forgetPassword(email).then((response: any) => {
            const message = response.data;
            return message;
        });
    }

}

