
import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
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
  <T>( target: AbstractRESTClient, targetKey: string | symbol, descriptor: TypedPropertyDescriptor<( ...args: any[] ) => any> ) =>
  (
    // let oldValue = descriptor.value;
    descriptor.value = function<TT extends AbstractRESTClient>( this: TT, ...args: any[] )
    {
      if ( this.http === undefined )
        throw new TypeError( `Property 'http' missing in ${this.constructor}. Check constructor dependencies!` );

      const
        // path params
        requestUrl = buildPathParams( this, target, targetKey, args, url ),

        // query params
        params$ = buildQueryParameters( this, target, targetKey, args ),

        // process headers
        headers$ = buildHeaders( this, target, targetKey, args ),

        // handle @Body
        body = buildBody( target, targetKey, args ),

        // handle @ResponseType
        responseType = Reflect.getOwnMetadata( MetadataKeys.Type, target, targetKey ),

        errorHandler = Reflect.getOwnMetadata( MetadataKeys.Error, target.constructor ),

        baseUrl$ = getBaseUrl( this, target );

      let requestObject: HttpRequest<unknown>;
      const x = zip( baseUrl$, headers$, params$ ).pipe
      (
        switchMap( ( [ baseUrl, headers, params ] ) =>
        {
          requestObject = new HttpRequest( method, baseUrl + requestUrl, body, { headers, params, responseType } );
          return handleCache( target, targetKey, this, this.http, requestObject ) || this.http.request( requestObject ).pipe( share() );
        } ),
        takeLast( 1 ), // TODO: take only request end result for now...
        catchError( ( error: HttpErrorResponse, caught: Observable<unknown> ) => errorHandler
          ? errorHandler( this, error, requestObject, caught )
          : throwError( error ) ),

        // TODO: do something with method body...
        // oldValue.call(this, observable)
      );
      return x as Observable<HttpResponse<T>>;
    },
    descriptor
  );

export const RESTClientError = <TClass extends AbstractRESTClient>( handler: ( thisArg: TClass, error: HttpErrorResponse, request: HttpRequest<any>, caught: Observable<unknown> ) => unknown ) =>
  <T extends DerivedAbstractRESTClient>( target: T ) => Reflect.defineMetadata( MetadataKeys.Error, handler, target );

export const ResponseType = ( arg: 'arraybuffer' | 'blob' | 'json' | 'text' ): MethodDecorator =>
  ( target: object, targetKey?: string | symbol ): void => Reflect.defineMetadata( MetadataKeys.Type, arg, target, targetKey! );

// define method decorators
export const GET = requestMethodDecoratorFactory( 'GET' );
export const POST = requestMethodDecoratorFactory( 'POST' );
export const PUT = requestMethodDecoratorFactory( 'PUT' );
export const PATCH = requestMethodDecoratorFactory( 'PATCH' );
export const DELETE = requestMethodDecoratorFactory( 'DELETE' );
export const HEAD = requestMethodDecoratorFactory( 'HEAD' );
export const OPTIONS = requestMethodDecoratorFactory( 'OPTIONS' );
export const JSONP = requestMethodDecoratorFactory( 'JSONP' );

export { AbstractRESTClient } from './+';
export { Body } from './body';
export { Cache, CacheClear } from './cache';
export { Header, Headers } from './headers';
export { BaseUrl, Path } from './path';
export { NO_ENCODE, Query } from './query';
