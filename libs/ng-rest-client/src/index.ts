/// <reference path="typings.d.ts" />

import { HttpClient, HttpRequest } from '@angular/common/http';
import { Observable, of, throwError, from, zip } from 'rxjs';
import { switchMap, catchError, takeLast, share } from 'rxjs/operators';
import { Reflect, AbstractApiClient, DerivedAbstractApiClient, MetadataKeys } from './+';
import { handleCache } from './cache';
import { buildHeaders } from './headers';
import { buildQueryParameters } from './query';
import { buildBody } from './body';


const parameterOrPropertyDecoratorFactory = ( decoratorName: string ) =>
  ( key?: string, ...extraOptions: any[] ) =>
  {
    function decorator( target: AbstractApiClient, propertyKey: string | symbol, parameterIndex?: number )
    {
      const
        saveToKey = parameterIndex !== undefined ? propertyKey : undefined,
        metadataKey = MetadataKeys[ decoratorName ],
        existingParams: Object[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

      existingParams.push( parameterIndex !== undefined ? [ parameterIndex, key, ...extraOptions ] : { propertyKey, ...extraOptions } );
      Reflect.defineMetadata( metadataKey, existingParams, target, saveToKey );
    }
    return decorator;
  };


const buildPathParams = ( target, targetKey, args, requestUrl ) =>
{
  const pathParams: any[] = ( Reflect.getOwnMetadata( MetadataKeys.Path, target, targetKey ) || [] ).filter( ( param: string ) => args[param[0]] !== undefined );
  if ( pathParams.length ) pathParams.forEach( param => requestUrl = requestUrl.replace( `{${param[1]}}`, args[param[0]] ) );
  return requestUrl;
};

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

        errorHandler = Reflect.getOwnMetadata( MetadataKeys.Error, target.constructor );

      return zip( ( this.getBaseUrl ? this.getBaseUrl( requestUrl ) : of( '' ) ), headers$, params$ ).pipe
      (
        switchMap( ( [ baseUrl, headers, params ] ) =>
        {
          const requestObject = new HttpRequest( method, baseUrl + requestUrl, body, { headers, params, responseType } );
          return handleCache( target, targetKey, this.http, requestObject )
            || ( this.http as HttpClient ).request( requestObject ).pipe( share() );
        } ),
        takeLast( 1 ), // TODO: take only request end result for now...
        catchError( ( error, caught ) => {
          // console.log( requestObject );
          // debugger;
          return errorHandler
            ? errorHandler.bind( target, error, caught, /*requestObj*/ ).call()
            : throwError( error );
          } ),
        // oldValue.call(this, observable)
      );

    },
    descriptor
  );


/**
 * class decorator
 *
 * @param url - will use this exact string as BaseUrl, unless `configKey` is passed; function - will get assigned to protorype.getBaseUrl
 * @param configKey - will request `url` and get this key from the resulting json
 */
export function BaseUrl( url: ( ( ...args: any[] ) => Observable<string> ) | string, configKey?: string )
{
  return function <TClass extends DerivedAbstractApiClient>
  ( Target: TClass ): TClass
  {
    if ( url instanceof Function ) Target.prototype.getBaseUrl = url;
    // request from external
    else if ( configKey )
    {
      let cached;
      Target.prototype.getBaseUrl = function()
      {
        const x = !cached ? ( cached = this.http.get( url ).map( r => r.json()[configKey] ).share() ) : cached;
        return x;
      };
    }
    else Target.prototype.getBaseUrl = () => from( Promise.resolve( url ) );
    return Target;
  };
}

export const Error = ( handler: ( ...args: any[] ) => any ) =>
  <TClass extends DerivedAbstractApiClient>( target: TClass ): TClass =>
    Reflect.defineMetadata( MetadataKeys.Error, handler, target );

export const Type = ( arg: 'arraybuffer' | 'blob' | 'json' | 'text' ): MethodDecorator =>
  ( target: Object, targetKey?: string | symbol ): void =>
    Reflect.defineMetadata( MetadataKeys.Type, arg, target, targetKey );

// define param decorators
export const Path = parameterOrPropertyDecoratorFactory( 'Path' );

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
