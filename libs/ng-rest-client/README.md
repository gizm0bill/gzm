# Angular REST Client

[![npm version](https://badge.fury.io/js/@gzm%2Fng-rest-client.svg)](https://badge.fury.io/js/@gzm%2Fng-rest-client)
[![tests](https://github.com/gizm0bill/gzm/actions/workflows/ng-rest-client-test.yml/badge.svg)](https://github.com/gizm0bill/gzm/actions/workflows/ng-rest-client-test.yml/badge.svg)

## Overview
The library provides a set of decorators for simplifying HTTP requests in Angular applications. It enables developers to define RESTful API clients using decorators for common HTTP methods.

## Installation

```sh
ng add @gz/ng-rest-client
```

## Usage

### Creating an API Client
Extend the `AbstractRESTClient` class (considered a limitation and will be removed in future releases) and use decorators to define API endpoints. The available HTTP methods are exemplified below:

```typescript
@Injectable()
export class ApiClient extends AbstractRESTClient 
{
  @GET('https://example.com/api')
  someGetCall() { return NEVER; }

  @POST('https://example.com/api')
  somePostCall() { return NEVER; }

  @PUT('https://example.com/api/{id}')
  somePutCall( @Path('id') id: number ) { return NEVER; }

  @DELETE('https://example.com/api/{id}')
  someDeleteCall( @Path('id') id: number ) { return NEVER; }

  @PATCH('https://example.com/api/{id}}')
  somePatchCall( @Path('id') id: number ) { return NEVER; }

  @OPTIONS('https://example.com/api')
  someOptionsCall() { return NEVER; }

  @HEAD('https://example.com/api')
  someHeadCall() { return NEVER; }

  @JSONP('https://example.com/api')
  someJsonpCall() { return NEVER; }

  @TRACE('https://example.com/api')
  someTraceCall() { return NEVER; }

  @CONNECT('https://example.com/api')
  someConnectCall() { return NEVER; }
}
```

### Injecting and Using the API Client
In your Angular components or services, inject `ApiClient` and call its methods:

```typescript
@Component({
  template: ''
})
export class SomeComponent implements OnInit {

  constructor(private apiClient: ApiClient) {}

  ngOnInit() {
    this.apiClient.getUsers().subscribe(users => {
      // do something with users
    });
  }
}
```

## Features

### Base URL Configuration

Static value:
```typescript
@BaseUrl( 'https://example.com' )
class ApiClient extends AbstractRESTClient {}
```

Dynamic value:
```typescript
@BaseUrl( ( thisArg: ApiClient ) => thisArg.http.get( 'some/url' ).pipe( map( response => /* get value from response */ ) ) )
class ApiClient extends AbstractRESTClient {}
```

or directly from a JSON response by a certain key:
```typescript
// take `apiUrl` key from `config.json` 
@BaseUrl( 'https://example.com/config.json', 'apiUrl' )
class ApiClient extends AbstractRESTClient {}
```

### Error Handling

Custom error handling function:
```typescript
@RESTClientError( ( thisArg: ApiClient, error: HttpErrorResponse, { url }: HttpRequest<any> ) => 
{
  const authenticationSrv = thisArg.injector.get( AuthenticationService );
  if ( error.status === 401 ) return authenticationSrv.refreshToken().pipe
  (
    switchMap( () => caught ),
    catchError( refreshTokenError => authenticationSrv.logout( true ).pipe
    (
      switchMap( () => throwError( () => refreshTokenError ) )
    ) )
  );
  return throwError( () => error );
} ) )
class ApiClient extends AbstractRESTClient {}
```

### Response type

Define a response type for the call as `blob`, `arraybuffer`, `json` or `text`
```typescript
class ApiClient extends AbstractRESTClient 
{
  @GET( 'some-url' ) @ResponseType( 'blob' )
  download( @Path( 'id' ) id: number ) { return NEVER; }
}
```

### Headers

Class-wide headers
```typescript
// key-value pairs
@Headers
( {
  'some-header': 'headerValue' // simple
  'another-header': () => 'header-value', // a function that returns some value
  'some-other-header': () => of( 'header-value' ), // or a function that returns an Observable value
} )
// or a function that returns a key-value pair, automatically called with the class instance
@Headers( ( thisArg: ApiClient ) => thisArg.service.someSubject.pipe( take( 1 ) ) )
class ApiClient extends AbstractRESTClient {}
```
From class properties
```typescript
class ApiClient extends AbstractRESTClient 
{
  @Header() // from a simple value
  [ 'content-type' ] = 'application/json';

  @Header() // from an Observable
  authorization = this.authenticationService.token.pipe( take( 1 ) );
}
```

For a specific method
```typescript
class ApiClient extends AbstractRESTClient
{
  headerValue = { 'some-header': 'some-value' };

  @HEAD( 'https://example.com/api' )
  // from a plain object
  @Headers
  ( {
    'some-header': 'headerValue' // simple
    'another-header': () => 'header-value', // a function that returns some value
    'some-other-header': () => of( 'header-value' ), // or a function that returns an Observable value
  } )
  // from a function at runtime
  @Headers( ( thisArg: ApiClient ) => thisArg.headerValue )
  // from a function that returns an Observable
  @Headers( ( thisArg: ApiClient ) => thisArg.someService.someSubject.pipe( take( 1 ) ) )
  // or from a method parameter
  someApiCall( @Header( 'some-header' ) header?: string ) { return NEVER; }
}
```

### Class-wide Query Parameters

Class-wide query parameters:
```typescript
// plain object
@Query({ 
  apiKey: 'your-api-key',
  anotherParam: 'another-param',
})
// function evaluated ar runtime with class instance as argument
@Query( ( thisArg: ApiClient ) => thisArg.someService.someSubject.pipe( take( 1 ) ) )
export class ApiClient extends AbstractRESTClient {}
```

Method arguments query
```typescript
export class ApiClient extends AbstractRESTClient 
{
  @HEAD( SOME_URL )
  someApiCall
  (
    @Query( 'some-parameter' ) query1: string,
    // second argument can be `NO_ENCODE` to avoid standard encoding
    @Query( 'another-parameter', NO_ENCODE ) query2: string,
  ) { return NEVER; }
}
```
You can also pass `NO_ENCODE` symbol as second argument to omit standard encoding


### Path Parameters

Define dynamic URL segments, with names between curly braces:
```typescript
class ApiClient extends AbstractRESTClient
{
  @GET( 'api/{some-resource}/child/{some-child}' )
  someApiCall
  ( 
    @Path('some-resource') id: string, 
    @Path('some-child') child: string,
  ) { return NEVER; }
}
```

### Body

Define body parameters for the request:
```typescript
class ApiClient extends AbstractRESTClient
{
  @POST( SOME_URL )
  someApiCall
  ( 
    @Body( 'file-parameter' ) file: File, 
    @Body( 'some-parameter' ) someParam: string, 
    @Body( 'another-parameter' ) anotherParam: string,
  ) { return NEVER; }
}
```

### Cache

You can cache calls until a certain amount of time
```typescript
class ApiClient extends AbstractRESTClient
{
  @GET( 'some/url' ) @Cache( 60_000 )
  someApiCall() { return NEVER; }
}
```

Or a certain amount of times by providing a string formed by a number and 'times' string in the argument of the decorator
```typescript
class ApiClient extends AbstractRESTClient
{
  @GET( 'some/url' ) @Cache( `3times` )
  someApiCall() { return NEVER; }
}
```

Or a combination of both in a configuration object to cache until which ever rule comes first
```typescript
class ApiClient extends AbstractRESTClient
{ 
  @GET( 'some/url' ) @Cache( { 'times': 3, 'until': 60_000 } )
  someApiCall() { return NEVER; }
}
```

Or you can simply define a function that returns a boolean to check if it should be cached or not
```typescript
class ApiClient extends AbstractRESTClient
{
  @GET( 'some/url' ) @Cache( ( thisArg: ApiClient ) => thisArg.shouldClearCache() )
  someApiCall() { return NEVER; }
}
```

You can also define a method to clear the cache for a certain call using the `CacheClear<T>` decorator, where the argument represents the name of the targeted method
```typescript
class ApiClient extends AbstractRESTClient
{
  @CacheClear<ApiClient>( 'someApiCall' )
  clearCacheSomeApiCall() { return this; }

  @GET( 'some/url' ) @Cache( 60_000 )
  someApiCall() { return NEVER; }
}
```

## License
This library is open-source and available under the MIT license.

---

For any issues or contributions, please visit our [GitHub repository](https://github.com/gizm0bill/gzm).


