import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AbstractRESTClient, RESTClientError, RESTClientError as ApiError, POST, BaseUrl } from '@gzm/ng-rest-client';
import { errorHandler } from 'some/where';
import { Observable, throwError, of, NEVER } from 'rxjs';

@RESTClientError( ( _apiService: AuthService, error: HttpErrorResponse ) => throwError( () => error ) )
@ApiError( ( _apiService: AuthService, error: HttpErrorResponse ) => throwError( () => error ) )
export class AuthService extends AbstractRESTClient {}

export const factory = (): any =>
{
  class A extends AbstractRESTClient
  {
    @POST( '…' )
    smth(): Observable<HttpResponse<any>> { return NEVER; }
  }
  RESTClientError( errorHandler )( A );
  ApiError( errorHandler )( A );
  BaseUrl( () => of( '…' ) )( A );
  return new A();
};
