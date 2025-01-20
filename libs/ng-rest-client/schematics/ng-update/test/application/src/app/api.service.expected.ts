import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AbstractRESTClient, RESTClientError, RESTClientError as ApiError, GET, BaseUrl } from '@gzm/ng-rest-client';
import { errorHandler } from 'some/where';
import { Observable, throwError, of } from 'rxjs';

@RESTClientError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
@ApiError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
export class ApiService extends AbstractRESTClient {}

export const factory = (): any =>
{
  class A extends class {}
  {
    @GET( '…' )
    smth(): Observable<HttpResponse<any>> { return; }
  }
  RESTClientError( errorHandler )( A );
  ApiError( errorHandler )( A );
  BaseUrl( () => of( '…' ) )( A );
  return new A();
};
