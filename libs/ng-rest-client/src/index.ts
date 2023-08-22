
import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Observable, throwError, zip } from 'rxjs';
import { catchError, share, switchMap, takeLast } from 'rxjs/operators';
import { AbstractRESTClient, DerivedAbstractRESTClient, MetadataKeys } from './+';
import { buildBody } from './body';
import { handleCache } from './cache';
import { buildHeaders } from './headers';
import { buildPathParams, getBaseUrl } from './path';
import { buildQueryParameters } from './query';

// TODO: https://github.com/Microsoft/TypeScript/issues/4881
// builds request method decorators
const requestMethodDecoratorFactory = ( method: string ) => ( url: string = '' ) =>
  ( target: AbstractRESTClient, targetKey?: string | symbol, descriptor?: TypedPropertyDescriptor<( ...args: any[] ) => Observable<any>> ) =>
  (
    // let oldValue = descriptor.value;
    descriptor.value = function( ...args: any[] ): Observable<any>
    {
      if ( this.http === undefined )
        throw new TypeError( `Property 'http' missing in ${this.constructor}. Check constructor dependencies!` );

      const
        // path params
        requestUrl = buildPathParams( target, targetKey, args, url ),

        // query params
        params$ = buildQueryParameters( this, target, targetKey, args ),

        // process headers
        headers$ = buildHeaders( this, target, targetKey, args ),

        // handle @Body
        body = buildBody( target, targetKey, args ),

        // handle @Type
        responseType = Reflect.getOwnMetadata( MetadataKeys.Type, target, targetKey ),

        errorHandler = Reflect.getOwnMetadata( MetadataKeys.Error, target.constructor ),

        baseUrl$ = getBaseUrl( this, target );

      let requestObject: HttpRequest<unknown>;
      return zip( baseUrl$, headers$, params$ ).pipe
      (
        switchMap( ( [ baseUrl, headers, params ] ) =>
        {
          requestObject = new HttpRequest( method, baseUrl + requestUrl, body, { headers, params, responseType } );
          return handleCache( target, targetKey, this, this.http, requestObject )
            || ( this.http as HttpClient ).request( requestObject ).pipe( share() );
        } ),
        takeLast( 1 ), // TODO: take only request end result for now...
        catchError( ( error: HttpErrorResponse, caught: Observable<unknown> ) => errorHandler
          ? errorHandler( this, error, requestObject, caught )
          : throwError( error ) ),

        // TODO: do something with method body...
        // oldValue.call(this, observable)
      );

    },
    descriptor
  );
// TODO: type
export function RESTClientError( handler: ( ...args: any[] ) => any )
{
  return <TClass extends DerivedAbstractRESTClient>( target: TClass ): TClass =>
    Reflect.defineMetadata( MetadataKeys.Error, handler, target ) as any;
}


export const Type = ( arg: 'arraybuffer' | 'blob' | 'json' | 'text' ): MethodDecorator =>
  ( target: object, targetKey?: string | symbol ): void => Reflect.defineMetadata( MetadataKeys.Type, arg, target, targetKey );

// define method decorators
export const POST = requestMethodDecoratorFactory( 'POST' );
export const PUT = requestMethodDecoratorFactory( 'PUT' );
export const PATCH = requestMethodDecoratorFactory( 'PATCH' );
export const GET = requestMethodDecoratorFactory( 'GET' );
export const DELETE = requestMethodDecoratorFactory( 'DELETE' );
export const HEAD = requestMethodDecoratorFactory( 'HEAD' );
export const OPTIONS = requestMethodDecoratorFactory( 'OPTIONS' );
export const JSONP = requestMethodDecoratorFactory( 'JSONP' );

export { AbstractRESTClient as AbstractApiClient } from './+';
export { Body } from './body';
export { Cache, CacheClear } from './cache';
export { Header, Headers } from './headers';
export { BaseUrl, Path } from './path';
export { NO_ENCODE, Query } from './query';

