# gzm
![tests](https://github.com/gizm0bill/gzm/actions/workflows/test.yml/badge.svg)

## Error example

```ts
@Error( ( apiService: ApiService, error: HttpErrorResponse, _, caught: Observable<any> ) => 
{
  if ( error.status === 401 ) // clear login, re-login and replay
    return apiSrv.clearToken().token().pipe( switchMap( () => caught ) );
  return throwError( () => error );
} )
export class ApiService extends AbstractApiClient
{
  @Cache( Infinity )
  @POST( 'http://some.location/authenticate' )
  token( @Body( 'username') username: string, @Body( 'password') password: string ): Observable<HttpResponse<any>> { return NEVER; }
  
  @CacheClear<ApiService>( 'token' )
  clearToken() { return this; }

  @Headers( ( apiService: ApiService ) => apiService.token() )
  @POST( 'http://some.location/list' )
  list(): Observable<any[]> {
  …
}
```
