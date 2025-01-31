import { HttpClient, HttpEvent, HttpHeaders, HttpParams, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { AbstractRESTClient, extend, isObject, MetadataKeys, MethodNames } from './+';

export const cacheMap = new Map<string, [Observable<HttpEvent<any>>, ICacheOptions]>();

export interface ICacheOptions
{
  until?: number;
  times?: number;
  function?: ( thisArg: AbstractRESTClient ) => boolean;
  forever?: boolean; // TODO: implement
  clearMethodPrefix: string; // TODO: remove
}

export const Cache = ( options?: number | string | ( ( thisArg: any ) => boolean ) | Partial<ICacheOptions> ): MethodDecorator =>
{
  const cacheOptions: ICacheOptions = { clearMethodPrefix: 'clearCache' };
  switch ( true )
  {
    case typeof options === 'number':
      cacheOptions.until = options as number;
      break;
    case typeof options === 'string' && ( options.lastIndexOf( 'times' ) > 0 || options.lastIndexOf( 'x' ) > 0 ):
      cacheOptions.times = parseInt( options as string, 10 );
      break;
    case typeof options === 'string': // just try to parse some timestamp
      cacheOptions.until = parseInt( options as string, 10 );
      break;
    case typeof options === 'function':
      cacheOptions.function = options as () => boolean;
      break;
    case isObject( cacheOptions ) && !!options:
      cacheOptions.until = ( options as ICacheOptions ).until || undefined;
      cacheOptions.times = ( options as ICacheOptions ).times || undefined;
      if ( typeof ( options as ICacheOptions ).clearMethodPrefix === 'string' )
        cacheOptions.clearMethodPrefix = ( options as ICacheOptions ).clearMethodPrefix;
      break;
  }
  return ( target, targetKey?: string | symbol ) =>
  {
    const targetKeyString = targetKey?.toString();
    // TODO: remove
    Object.defineProperty( target,
      `${cacheOptions.clearMethodPrefix}${targetKeyString?.[0].toUpperCase()}${targetKeyString?.slice( 1 )}`,
      {
        writable: false,
        value()
        {
          Reflect.defineMetadata( MetadataKeys.ClearCache, true, target, targetKey || undefined as unknown as string );
          return this;
        }
    } );
    Reflect.defineMetadata( MetadataKeys.Cache, cacheOptions, target, targetKey || undefined as unknown as string );
  };
};

export const CacheClear = <TClass extends AbstractRESTClient>( targetKey: MethodNames<TClass> ) =>
  ( target: TClass, name: MethodNames<TClass>, descriptor: TypedPropertyDescriptor<( ...args: any[] ) => any> ) =>
  {
    const originalValue = descriptor.value;
    descriptor.value = function()
    {
      Reflect.defineMetadata( MetadataKeys.ClearCache, true, target, targetKey as any );
      return originalValue?.call( this );
    };
  };

const getCacheKey =
(
  cacheUrl: string,
  cacheHeaders: HttpHeaders,
  cacheQuery: HttpParams,
  cacheResponseType?: string
) =>
{
  const headerArr: string[] = [];
  cacheHeaders.keys().forEach( ( name ) => headerArr.push( name, ( cacheHeaders?.getAll( name ) || [] ).join() ) );
  return [ cacheUrl, headerArr.join(), cacheQuery.toString(), cacheResponseType ].join();
};

export const handleCache = <T extends AbstractRESTClient>
(
  target: T,
  targetKey: string | symbol,
  thisArg: T,
  thisArgHttpClient: HttpClient,
  requestObject: HttpRequest<any>,
): Observable<HttpEvent<any>> | undefined =>
{
  const cacheOptions: ICacheOptions = Reflect.getOwnMetadata( MetadataKeys.Cache, target, targetKey );
  if ( !cacheOptions ) return undefined;
  let returnRequest: Observable<HttpEvent<any>> | undefined = undefined;
  const
    { url, headers, params, responseType } = requestObject,
    cacheMapKey = getCacheKey( url, headers, params, responseType ),
    shouldClearCache = Reflect.getOwnMetadata( MetadataKeys.ClearCache, target, targetKey );
  if ( shouldClearCache )
  {
    cacheMap.delete( cacheMapKey );
    Reflect.defineMetadata( MetadataKeys.ClearCache, false, target, targetKey );
  }
  const cacheMapEntry = cacheMap.get( cacheMapKey );
  if ( cacheMapEntry ) switch ( true )
  {
    case !!cacheOptions.function && cacheOptions.function( thisArg ):
      [ returnRequest ] = cacheMapEntry;
      break;
    case !!cacheOptions.until && ( +new Date ) < cacheMapEntry?.[1]?.until!:
      [ returnRequest ] = cacheMapEntry;
      break;
    case !!cacheOptions.times && cacheMapEntry[1].times! > 0:
      cacheMapEntry[1].times!--; // decrease called times
      [ returnRequest ] = cacheMapEntry;
      cacheMap.set( cacheMapKey, [ returnRequest, cacheMapEntry[1] ] );
      break;
  }
  if ( !returnRequest ) // first cache request
  {
    returnRequest = thisArgHttpClient.request( requestObject ).pipe( shareReplay() );
    const saveCacheOptions = extend( {}, cacheOptions );
    saveCacheOptions.until = cacheOptions.until && ( +new Date ) + cacheOptions.until;
    cacheMap.set( cacheMapKey, [ returnRequest, saveCacheOptions ] );
  }
  return returnRequest;
};
