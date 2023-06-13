import { HttpErrorResponse } from '@angular/common/http';
import { AbstractApiClient, Error } from '@gzm/ng-rest-client';
import { throwError } from 'rxjs';
@Error(( apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ))
export class ApiService extends AbstractApiClient {}
Error(( apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ))( ApiService );
