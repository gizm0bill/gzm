import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AbstractApiClient, Error, Error as ApiError, POST, BaseUrl } from '@gzm/ng-rest-client';
import { errorHandler } from 'some/where';
import { Observable, throwError, of } from 'rxjs';

@Error( ( _apiService: AuthService, error: HttpErrorResponse ) => throwError( () => error ) )
@ApiError( ( _apiService: AuthService, error: HttpErrorResponse ) => throwError( () => error ) )
export class AuthService extends AbstractApiClient {}

export const factory = (): any =>
{
  class A extends AbstractApiClient
  {
    @POST( '…' )
    smth(): Observable<HttpResponse<any>> { return; }
  }
  Error( errorHandler )( A );
  ApiError( errorHandler )( A );
  BaseUrl( () => of( '…' ) )( A );
  return new A();
};
