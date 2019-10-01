/// <reference path="typings.d.ts" />

import { HttpClient, HttpParams, HttpHeaders, HttpRequest, } from '@angular/common/http';
import { Observable, of, throwError, from, zip, merge } from 'rxjs';
import { switchMap, catchError, takeLast, share, map } from 'rxjs/operators';
import { extend, Reflect, AbstractApiClient, DerivedAbstractApiClient, MethodNames, MetadataKeys } from './+';
import { handleCache } from './cache';
import { buildHeaders } from './headers';

const parameterOrPropertyDecoratorFactory = ( decoratorName: string ) =>
  ( key?: string, ...extraOptions: any[] ) =>
  {
    function decorator( target: AbstractApiClient, propertyKey: string | symbol, parameterIndex?: number )
    {
      const
        saveToKey = parameterIndex !== undefined ? propertyKey : undefined,
        metadataKey = MetadataKeys[ decoratorName ],
        existingParams: Object[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

      existingParams.push( parameterIndex !== undefined ? { index: parameterIndex, key, ...extraOptions } : { propertyKey, ...extraOptions } );
      Reflect.defineMetadata( metadataKey, existingParams, target, saveToKey );
    }
    return decorator;
  };


const buildQueryParams = ( target, targetKey, args ) =>
{
  const
    defaultQueryParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Query, target.constructor ),
    queryParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Query, target, targetKey ),
    query = new HttpParams();

  // TODO: see headers processing and make something common
  if ( defaultQueryParams ) defaultQueryParams.forEach( defaQuery =>
  {
    const _q = extend( {}, defaQuery );
    for ( const _qk in _q.key ) if ( _q.key.hasOwnProperty( _qk ) )
    {
      if ( typeof _q.key[_qk] === 'function' ) _q.key[_qk] = _q.key[_qk].call( this );
      query.append( _qk, _q.key[_qk] );
    }
  } );
  if ( queryParams ) queryParams.filter( p => args[p.index] !== undefined ).forEach( p =>
  {
    let queryKey, queryVal;
    // don't uri encode flagged params
    // if ( Object.values(p).indexOf(NO_ENCODE) !== -1 ) [ queryKey, queryVal ] = [ p.key, args[p.index] ];
    // else [ queryKey, queryVal ] = [ standardEncoding(p.key), standardEncoding(args[p.index]) ];
    return query.set( queryKey, queryVal );
  } );
  return query;
};

const buildPathParams = ( target, targetKey, args, requestUrl ) =>
{
  const pathParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Path, target, targetKey );
  if ( pathParams ) pathParams.filter( p => args[p.index] !== undefined ).forEach( p =>
      requestUrl = requestUrl.replace( `{${p.key}}`, args[p.index] ) );
  return requestUrl;
};

const buildBody = ( target, targetKey, args ) =>
{
  let bodyParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Body, target, targetKey ),
      body: any = {};
  if ( bodyParams )
  {
    bodyParams = bodyParams.filter( p => args[p.index] !== undefined );
    // see if we got some Files inside
    if ( bodyParams.some( p => args[p.index] instanceof File || args[p.index] instanceof FileList ) )
    {
      body = new FormData;
      bodyParams.forEach( p =>
      {
        const bodyArg: File|File[] = args[p.index];
        if ( bodyArg instanceof FileList ) for ( const f of <File[]>bodyArg )
          body.append( p.key || 'files[]', f, f.name );
        else if ( bodyArg instanceof File )
          body.append( p.key || 'files[]', bodyArg, bodyArg.name );
        else
          body.append( p.key || 'params[]', bodyArg );
      } );
    }
    // single unnamed body param, add value as is, usually string
    else if ( bodyParams.length === 1 && bodyParams[0].key === undefined )
      body = args[bodyParams[0].index];
    // plain object
    else
    {
      bodyParams.map( p => ( { [p.key]: args[p.index] } ) ).forEach( p => Object.assign( body, p ) );
      body = JSON.stringify( body );
    }
  }
  return body;
};

// build method decorators
const methodDecoratorFactory = ( method: string ) => ( url: string = '' ) =>
  ( target: AbstractApiClient, targetKey?: string | symbol, descriptor?: TypedPropertyDescriptor<() => Observable<any>> ) =>
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
        params = buildQueryParams.bind( this, target, targetKey, args ).call(),

        // process headers
        headers$ = buildHeaders( this, target, targetKey, args ),

        // handle @Body
        body = buildBody( target, targetKey, args ),

        // handle @Type
        responseType = Reflect.getOwnMetadata( MetadataKeys.Type, target, targetKey ),

        errorHandler = Reflect.getOwnMetadata( MetadataKeys.Error, target.constructor );

      return zip( ( this.getBaseUrl ? this.getBaseUrl( requestUrl ) : of( '' ) ), headers$ ).pipe
      (
        switchMap( ( [ baseUrl, headers ] ) =>
        {
          const requestObject = new HttpRequest( method, baseUrl + requestUrl, { body, headers, params, responseType } );
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

/**
 * class decorator
 * method decorator
 */
// export function Headers( headers: {} )
// {
//   function decorator <TClass extends DerivedAbstractApiClient>( target: TClass ): void;
//   function decorator( target: Object, targetKey: string | symbol ): void;
//   function decorator( target: Object, targetKey?: string | symbol ): void
//   {
//     const metadataKey = MetadataKeys.Header;
//     if ( targetKey !== undefined )
//     {
//       const existingHeaders: Object[] = Reflect.getOwnMetadata( metadataKey, target, targetKey ) || [];
//       existingHeaders.push( headers );
//       Reflect.defineMetadata( metadataKey, existingHeaders, target, targetKey );
//     }
//     else // class type
//     {
//       const existingHeaders: Object[] = Reflect.getOwnMetadata( metadataKey, target ) || [];
//       existingHeaders.push( headers );
//       Reflect.defineMetadata( metadataKey, existingHeaders, target, undefined );
//     }
//   }
//   return decorator;
// }

export function Query( keyOrParams: any, ...extraOptions: any[] )
{
  function decorator <TClass extends DerivedAbstractApiClient>( target: TClass ): void;
  function decorator( target: Object, propertyKey?: string | symbol, parameterIndex?: number ): void;
  function decorator( target: Object, propertyKey?: string | symbol, parameterIndex?: number ): void
  {
    if ( parameterIndex !== undefined ) // on param
    {
      const metadataKey = MetadataKeys.Query;
      const existingParams: Object[] = Reflect.getOwnMetadata( metadataKey, target, propertyKey ) || [];
      existingParams.push( { index: parameterIndex, key: keyOrParams, ...extraOptions } );
      Reflect.defineMetadata( metadataKey, existingParams, target, propertyKey );
    }
    else // on class
    {
      const metadataKey = MetadataKeys.Query;
      const existingQuery: Object[] = Reflect.getOwnMetadata( metadataKey, target ) || [];
      existingQuery.push( { index: undefined, key: keyOrParams } );
      Reflect.defineMetadata( metadataKey, existingQuery, target, undefined );
    }
  }
  return decorator;
}

export const Error = ( handler: ( ...args: any[] ) => any ) =>
  <TClass extends DerivedAbstractApiClient>( target: TClass ): TClass =>
    Reflect.defineMetadata( MetadataKeys.Error, handler, target );

export const Type = ( arg: 'arraybuffer' | 'blob' | 'json' | 'text' ): MethodDecorator =>
  ( target: Object, targetKey?: string | symbol ): void =>
    Reflect.defineMetadata( MetadataKeys.Type, arg, target, targetKey );

// define param decorators
export const Path = parameterOrPropertyDecoratorFactory( 'Path' );
export const Body = parameterOrPropertyDecoratorFactory( 'Body' );
// export const Header = parameterOrPropertyDecoratorFactory( 'Header' );

// define method decorators
export const POST = methodDecoratorFactory( 'POST' );
export const PUT = methodDecoratorFactory( 'PUT' );
export const PATCH = methodDecoratorFactory( 'PATCH' );
export const GET = methodDecoratorFactory( 'GET' );
export const DELETE = methodDecoratorFactory( 'DELETE' );
export const HEAD = methodDecoratorFactory( 'HEAD' );
export const OPTIONS = methodDecoratorFactory( 'OPTIONS' );
export const JSONP = methodDecoratorFactory( 'JSONP' );

export { AbstractApiClient } from './+';
export { Cache, CacheClear } from './cache';
export { Headers, Header } from './headers';
