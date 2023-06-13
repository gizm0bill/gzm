import { HttpErrorResponse } from '@angular/common/http';
import { AbstractRESTClient, RESTClientError, RESTClientError as ApiError } from '@gzm/ng-rest-client';
import { throwError } from 'rxjs';
@RESTClientError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
@ApiError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
export class ApiService extends AbstractRESTClient {}
RESTClientError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )( ApiService );
ApiError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )( ApiService );
