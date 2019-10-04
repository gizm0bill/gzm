import { HttpClient } from '@angular/common/http';
import { of, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DerivedAbstractApiClient, Reflect, MetadataKeys, AbstractApiClient } from './+';

export const buildPathParams = ( target: AbstractApiClient, targetKey: string | symbol, args: any, requestUrl: string ) =>
{
  const pathParams: any[] = ( Reflect.getOwnMetadata( MetadataKeys.Path, target, targetKey ) || [] ).filter( ( param: string ) => args[param[0]] !== undefined );
  if ( pathParams.length ) pathParams.forEach( param => requestUrl = requestUrl.replace( `{${param[1]}}`, args[param[0]] ) );
  return requestUrl;
};

export const Path = ( key?: string, ...extraOptions: any[] ) =>
  ( target: DerivedAbstractApiClient, propertyKey: string | symbol, parameterIndex?: number ) =>
  {
    const
      saveToKey = parameterIndex !== undefined ? propertyKey : undefined,
      metadataKey = MetadataKeys.Path,
      existingParams: Object[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

    existingParams.push( parameterIndex !== undefined ? [ parameterIndex, key, ...extraOptions ] : { propertyKey, ...extraOptions } );
    Reflect.defineMetadata( metadataKey, existingParams, target, saveToKey );
  };

export const getBaseUrl = ( thisArg: AbstractApiClient, target: AbstractApiClient ) =>
  ( Reflect.getOwnMetadata( MetadataKeys.BaseUrl, target.constructor ) || ( () => of( '' ) ) )( thisArg );

/**
 * class decorator
 *
 * @param url - will use this exact string as BaseUrl, unless `configKey` is passed; function will be called with instance and must return Observable
 * @param configKey - will request `url` and get this key from the resulting json
 */
export const BaseUrl = ( url: ( ( ...args: any[] ) => Observable<string> ) | string, configKey?: string ) =>
<TClass extends DerivedAbstractApiClient>( Target: TClass ): void =>
{
  let cached: Observable<any>;
  if ( typeof url !== 'function' )
    Reflect.defineMetadata( MetadataKeys.BaseUrl, !!configKey
      ? ( { http }: { http: HttpClient } ) => !cached ? ( cached = http.get( url ).pipe( map( response => response[ configKey ] ) ) ) : cached
      : () => of( url ), Target );
  else Reflect.defineMetadata( MetadataKeys.BaseUrl, url, Target );
};
