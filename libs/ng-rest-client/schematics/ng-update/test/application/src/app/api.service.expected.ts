import { NEVER } from 'rxjs';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AbstractRESTClient, RESTClientError, RESTClientError as ApiError, GET, BaseUrl } from '@gzm/ng-rest-client';

export const errorHandler = <T extends AbstractRESTClient>( _a: T, error: HttpErrorResponse, _: any, caught: Observable<any> ): Observable<string> => throwError( () => error );

@RESTClientError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
@ApiError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
export class ApiService extends AbstractRESTClient {}

export const factory = (): any =>
{
  class A extends AbstractRESTClient
  {
    @GET( '…' )
    smth(): Observable<HttpResponse<any>> { return NEVER; }
  }
  RESTClientError( errorHandler )( A );
  ApiError( errorHandler )( A );
  BaseUrl( () => of( '…' ) )( A );
  return new A();
};
