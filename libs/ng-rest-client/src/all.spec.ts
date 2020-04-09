import { AbstractApiClient, Headers, Header, Cache, CacheClear, BaseUrl, Body, Path, Error as ApiError, Type, POST } from '.';
import { of, Observable } from 'rxjs';

@ApiError( ( ...args: any[] ) => {} )
@BaseUrl( ( ...args: any[] ) => of( 'wtv' ) )
@Headers( () => of( 'wtv' ) )
class ApiClient extends AbstractApiClient
{
    @POST( 'something' )
    @Headers( {} )
    testPost(): Observable<any> { return; }
}
