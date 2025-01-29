import { HttpErrorResponse } from '@angular/common/http';
import { AbstractRESTClient, BaseUrl, RESTClientError } from '@gzm/ng-rest-client';
import { of, throwError } from 'rxjs';
@RESTClientError(( apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ))
@BaseUrl( ( thisArg: ApiService ) => of( thisArg.a ) )
export class ApiService extends AbstractRESTClient {
  constructor( private a: string, private b: number ) {
    super();
  }
}
RESTClientError(( apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ))( class extends AbstractRESTClient {} );
