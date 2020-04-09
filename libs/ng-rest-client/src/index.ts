
import { HttpClient, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, zip } from 'rxjs';
import { switchMap, catchError, takeLast, share } from 'rxjs/operators';
import { Reflect, AbstractApiClient, DerivedAbstractApiClient, MetadataKeys } from './+';
import { handleCache } from './cache';
import { buildHeaders } from './headers';
import { buildQueryParameters } from './query';
import { buildBody } from './body';
import { buildPathParams, getBaseUrl } from './path';

// builds request method decorators
const requestMethodDecoratorFactory = ( method: string ) => ( url: string = '' ) =>
  ( target: AbstractApiClient, targetKey?: string | symbol, descriptor?: TypedPropertyDescriptor<( ...args: any[] ) => Observable<any>> ) =>
  (
    // let oldValue = descriptor.value;
    descriptor.value = function( ...args: any[] ): Observable<any>
    {
      if ( this.http === undefined )
        throw new TypeError( `Property 'http' missing in ${this.constructor}. Check constructor dependencies!` );

      const
        // hanle @Path
        requestUrl = buildPathParams( target, targetKey, args, url ),
        // hanle @Query
        params$ = buildQueryParameters( this, target, targetKey, args ),
        // handle @Headers
        headers$ = buildHeaders( this, target, targetKey, args ),
        // handle @Body
        body = buildBody( target, targetKey, args ),
        // handle @Type
        responseType = Reflect.getOwnMetadata( MetadataKeys.Type, target, targetKey ),
        // handle @Error
        errorHandler = Reflect.getOwnMetadata( MetadataKeys.Error, target.constructor ),
        // handle @BaseUrl
        baseUrl$ = getBaseUrl( this, target );

      let requestObject: HttpRequest<any>;
      return zip( baseUrl$, headers$, params$ ).pipe
      (
        switchMap( ( [ baseUrl, headers, params ] ) =>
        {
          requestObject = new HttpRequest( method, baseUrl + requestUrl, body, { headers, params, responseType } );
          return handleCache( target, targetKey, this.http, requestObject )
            || ( this.http as HttpClient ).request( requestObject ).pipe( share() );
        } ),
        takeLast( 1 ), // TODO: take only request end result for now...
        catchError( ( error: HttpErrorResponse, caught: Observable<any> ) => errorHandler
          ? errorHandler( this, error, requestObject, caught )
          : throwError( error ) ),
        // TODO: do something with method body...
        // oldValue.call(this, observable)
      );
    },
    descriptor
  );

export function Error( handler: ( ...args: any[] ) => any )
{
  return <TClass extends DerivedAbstractApiClient>( target: TClass ): TClass => Reflect.defineMetadata( MetadataKeys.Error, handler, target );
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

export { AbstractApiClient } from './+';
export { Cache, CacheClear } from './cache';
export { Headers, Header } from './headers';
export { Query, NO_ENCODE } from './query';
export { Body } from './body';
export { Path, BaseUrl } from './path';
