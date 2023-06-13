import { HttpErrorResponse } from '@angular/common/http';
import { AbstractApiClient, Error, Error as ApiError } from '@gzm/ng-rest-client';
import { throwError } from 'rxjs';
@Error( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
@ApiError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
export class ApiService extends AbstractApiClient {}
Error( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )( ApiService );
ApiError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )( ApiService );
