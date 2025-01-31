import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { AbstractApiClient, Error, Error as ApiError, GET, BaseUrl, Type } from '@gzm/ng-rest-client';

export const errorHandler = <T extends AbstractApiClient>( _a: T, error: HttpErrorResponse, _: any, caught: Observable<any> ): Observable<string> => throwError( () => error );

@Error( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
@ApiError( ( _apiService: ApiService, error: HttpErrorResponse ) => throwError( () => error ) )
export class ApiService extends AbstractApiClient {}

export const factory = (): any =>
{
  class A extends AbstractApiClient
  {
    @GET( '…' )
    smth(): Observable<HttpResponse<any>> { return; }

    @POST( '…' ) @Type( 'blob' )
    smth2(): Observable<HttpResponse<any>> { return; }
  }
  Error( errorHandler )( A );
  ApiError( errorHandler )( A );
  BaseUrl( () => of( '…' ) )( A );
  return new A();
};
