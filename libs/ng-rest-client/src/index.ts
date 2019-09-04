/// <reference path="typings.d.ts" />

import { Inject, Component, TypeDecorator } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpRequest,  } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { switchMap, catchError, takeLast, shareReplay, share } from 'rxjs/operators';

const Reflect = global['Reflect'];
const cacheMap = new Map;

function isObject( item )
{
  return ( item && typeof item === 'object' && !Array.isArray( item ) && item !== null );
}
function extend<T, U>( target: T, source: U ): T & U
{
  if ( !isObject( target ) || !isObject( source ) ) return target as T & U;
  Object.keys( source ).forEach( key =>
  {
    if ( isObject( source[key] ) )
    {
      if ( !target[key] ) Object.assign( target, { [key]: {} } );
      extend( target[key], source[key] );
    }
    else Object.assign( target, { [key]: source[key] } );
  } );
  return target as T & U;
}

// abstract Api class
export abstract class AbstractApiClient
{
  constructor( @Inject( HttpClient ) protected http: HttpClient ) { }
}

// reflect metadata key symbols
const MetadataKeys =
{
  Query: Symbol( 'apiClient:Query' ),
  Path: Symbol( 'apiClient:Path' ),
  Body: Symbol( 'apiClient:Body' ),
  Header: Symbol( 'apiClient:Header' ),
  Type: Symbol( 'apiClient:ResponseType' ),
  Error: Symbol( 'apiClient:Error' ),
  Cache: Symbol( 'apiClient:Cache' )
};

const paramDecoratorFactory = ( paramDecoName: string ) =>
{
  return function( key?: string, ...extraOptions: any[] )
  {
    return function( target: AbstractApiClient, propertyKey: string | symbol, parameterIndex: number )
    {
      const
        metadataKey = MetadataKeys[paramDecoName],
        existingParams: Object[] = Reflect.getOwnMetadata( metadataKey, target, propertyKey ) || [];

      existingParams.push( { index: parameterIndex, key, ...extraOptions } );
      Reflect.defineMetadata( metadataKey, existingParams, target, propertyKey );
    };
  };
};

const buildQueryParams = ( target, targetKey, args ) =>
{
  const
    defaultQueryParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Query, target.constructor ),
    queryParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Query, target, targetKey ),
    query = new HttpParams();

  // TODO see headers processing and make something common
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

const buildHeaders = ( target, targetKey, args ) =>
{
  const
    headers = {},
    defaultHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target.constructor ),
    methodHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target, targetKey );

  if ( defaultHeaders ) defaultHeaders.forEach( header =>
  {
    const _h = extend( {}, header );
    for ( const _hk in _h.key ) if ( typeof _h.key[_hk] === 'function' ) _h.key[_hk] = _h.key[_hk].call( this );
    extend( headers, _h.key );
  } );
  if ( methodHeaders ) methodHeaders.forEach( h =>
  {
    let k = {};
    // param header from @Header
    if ( typeof h.key === 'string' ) k[h.key] = args[h.index];
    // method header from @Headers, use smth like @Headers(function(){ return { Key: smth.call(this) }; }), hacky, I know
    else if ( typeof h.key === 'function' ) k = h.key.call( this );
    else k = h.key;
    // TODO add to headers rather than overwrite?
    extend( headers, k );
  } );
  return new HttpHeaders( headers );
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
const methodDecoratorFactory = ( method: string ) =>
{
  return ( url: string = '' ) =>
  {
    return ( target: AbstractApiClient, targetKey?: string | symbol, descriptor?: PropertyDescriptor ) =>
    {
      // let oldValue = descriptor.value;
      descriptor.value = function( ...args: any[] ): Observable<any>
      {
        let requestUrl = url;
        if ( this.http === undefined )
          throw new TypeError( `Property 'http' missing in ${this.constructor}. Check constructor dependencies!` );

        // query params
        const params = buildQueryParams.bind( this, target, targetKey, args ).call();

        // path params
        requestUrl = buildPathParams( target, targetKey, args, requestUrl );

        // process headers
        const headers = buildHeaders.bind( this, target, targetKey, args ).call();

        // handle @Body
        const body = buildBody( target, targetKey, args );

        // handle @Type
        // let responseType = Reflect.getOwnMetadata(MetadataKeys.Type, target, targetKey);

        // const makeReq = ( method, baseUrl, requestUrl, headers, body, query, responseType ) =>
        // {
        //   const options = new RequestOptions({ method, url: baseUrl + requestUrl, headers, body, search: query, responseType });
        //   return new Request(options);
        // },
        const getCacheKey = ( cacheUrl: string, cacheHeaders: HttpHeaders, cacheQuery: any, cacheResponseType?: any ) =>
        {
          const headerArr = [];
          cacheHeaders.keys().forEach( ( name ) => headerArr.push( name, headers.getAll( name ).join() ) );
          return [cacheUrl, headerArr.join(), cacheQuery, cacheResponseType].join();
        };
        // get baseUrl from Promise, file or simple string
        // const baseUrlObs = this.getBaseUrl ? this.getBaseUrl( requestUrl ) : of('');
        // let requestObj: Request;

        const errorHandler = Reflect.getOwnMetadata( MetadataKeys.Error, target.constructor );
        let requestObject: HttpRequest<any>;
        return ( this.getBaseUrl ? this.getBaseUrl( requestUrl ) : of( '' ) ).pipe
        (
          switchMap( baseUrl =>
          {
            requestObject = new HttpRequest( method, requestUrl, { body, headers, params } );
            let
              returnRequest: Observable<any>,
              cacheMapKey: string;
            // check if we got a cache meta and entry
            const cacheOptions: ICacheOptions = Reflect.getOwnMetadata( MetadataKeys.Cache, target, targetKey );
            if ( cacheOptions )
            {
              switch ( true )
              {
                case !!cacheOptions.until:
                  cacheMapKey = getCacheKey( baseUrl + requestUrl, headers, params ); // , responseType ),
                  const cacheMapEntry = cacheMap.get( cacheMapKey );
                  if ( cacheMapEntry &&  ( +new Date ) < cacheMapEntry[0] + cacheOptions.until )
                  {
                    returnRequest = cacheMapEntry[1];
                    break;
                  }
                  returnRequest = this.http.request( requestObject ).pipe( shareReplay() );
                  cacheMap.set( cacheMapKey, [ returnRequest, cacheOptions ] );
                  break;
                // case !!cacheOptions.times
              }
            }
            else returnRequest = this.http.request( requestObject ).pipe( share() );
            // const cacheTime = Reflect.getOwnMetadata( MetadataKeys.Cache, target, targetKey );
            // if ( cacheTime )
            // {
            //   const cacheMapKey = getCacheKey( baseUrl + requestUrl, headers, query, responseType ),
            //         cacheMapEntry = cacheMap.get(cacheMapKey);
            //   if ( cacheMapEntry &&  ( +new Date ) < cacheMapEntry[0] + cacheTime ) observable = cacheMapEntry[1];
            //   else
            //   {
            //     requestObj = makeReq(method, baseUrl, requestUrl, headers, body, query, responseType);
            //     observable = <Observable<Response>> this.http.request( requestObj ).shareReplay();
            //     cacheMap.set( cacheMapKey, [ +new Date, observable ] );
            //   }
            // }
            // else
            // {
            //   requestObj = makeReq(method, baseUrl, requestUrl, headers, body, query, responseType);
            //   // observable request
            //   observable = <Observable<Response>> this.http.request( requestObj ).share();
            // }
            // return observable;
            return returnRequest;
          } ),
          takeLast( 1 ),
          catchError( ( error, caught ) => {
            console.log( requestObject );
            debugger;
            return errorHandler
              ? errorHandler.bind( target, error, caught, /*requestObj*/ ).call()
              : throwError( error );
            } ),

          // oldValue.call(this, observable)
        );

      };

      return descriptor;
    };
  };
};

type MethodDecorator = ( target: Object, targetKey?: string | symbol ) => void;
export interface ICacheOptions {
  until?: number;
  times?: number;
  clearMethodPrefix: string;
}
// method decorator
export function Cache( options?: number | string | ICacheOptions ): MethodDecorator
{
  const cacheOptions: ICacheOptions = { clearMethodPrefix: 'clearCache' };
  switch ( true )
  {
    case typeof options === 'number':
        cacheOptions.until = options as number;
        break;
    case typeof options === 'string' && options.lastIndexOf( 'times' ) > 0:
        cacheOptions.times = options as number;
        break;
    case typeof options === 'string': // just try to parse some timestamp
        cacheOptions.until = parseInt( options as string, 10 );
        break;
    case isObject( cacheOptions ) && !!options:
        cacheOptions.until = ( options as ICacheOptions ).until || undefined;
        cacheOptions.times = ( options as ICacheOptions ).times || undefined;
        if ( typeof ( options as ICacheOptions ).clearMethodPrefix === 'string' )
          cacheOptions.clearMethodPrefix = ( options as ICacheOptions ).clearMethodPrefix;
        break;
  }
  return function decorator( target: Object, targetKey?: string | symbol ): void
  {
    const targetKeyString = targetKey.toString();
    Object.defineProperty( target,
      `${cacheOptions.clearMethodPrefix}${targetKeyString[0].toUpperCase()}${targetKeyString.slice( 1 )}`,
      {
        writable: false,
        value: () => { /* TODO: implement clear cache */ return; }
    } );
    Reflect.defineMetadata( MetadataKeys.Cache, cacheOptions, target, targetKey );
  };
}

// define param decorators
export const Path = paramDecoratorFactory( 'Path' );
export const Body = paramDecoratorFactory( 'Body' );
export const Header = paramDecoratorFactory( 'Header' );

// define method decorators
export const POST = methodDecoratorFactory( 'POST' );
export const PUT = methodDecoratorFactory( 'PUT' );
export const PATCH = methodDecoratorFactory( 'PATCH' );
export const GET = methodDecoratorFactory( 'GET' );
export const DELETE = methodDecoratorFactory( 'DELETE' );
export const HEAD = methodDecoratorFactory( 'HEAD' );
export const OPTIONS = methodDecoratorFactory( 'OPTIONS' );
export const JSONP = methodDecoratorFactory( 'JSONP' );
