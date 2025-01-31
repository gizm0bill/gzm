import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AbstractRESTClient, DerivedAbstractRESTClient, MetadataKeys } from './+';

export const buildPathParams = <T extends AbstractRESTClient>( thisArg: T, target: AbstractRESTClient, targetKey: string | symbol, args: any, requestUrl: string ) =>
{
  const pathParams: any[] = ( Reflect.getOwnMetadata( MetadataKeys.Path, target, targetKey ) || [] ).filter( ( param: string ) => args[param[0]] != null );
  const propertyParams = ( (Reflect.getOwnMetadata( MetadataKeys.Path, target ) as { [k: string]: keyof typeof thisArg }[] ) || []).reduce<string[][]>( ( pathValues, pathPropertyByKey ) => {
    const [ pathKey, pathProperty ] = Object.entries( pathPropertyByKey )[0];
    return [ ...pathValues, [ `${thisArg[pathProperty]}`, pathKey ] ];
  }, [] );
  [ ...pathParams, ...propertyParams].forEach( param => requestUrl = requestUrl.replace( `{${param[1]}}`, args[param[0]] ?? param[0] ) );
  return requestUrl;
};

/**
 * property decorator
 *
 * @param key - the name of the url parameter
 * @param extraOptions
 * @returns
 */
export const Path = ( key?: string, ...extraOptions: any[] ) =>
  ( target: AbstractRESTClient, propertyKey: string | symbol, parameterIndex?: number ) =>
  {
    const
      saveToKey = parameterIndex != null ? propertyKey : undefined as unknown as string,
      metadataKey = MetadataKeys.Path,
      existingParams: Object[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

    existingParams.push( parameterIndex != null ? [ parameterIndex, key, ...extraOptions ] : { [ key || propertyKey ]: propertyKey, ...extraOptions } );
    Reflect.defineMetadata( metadataKey, existingParams, target, saveToKey );
  };

export function getBaseUrl( thisArg: AbstractRESTClient, _target: AbstractRESTClient )
{
  /// Object.getPrototypeOf( thisArg ).constructor !== target.constructor - it's inherited
  return  ( Reflect.getOwnMetadata( MetadataKeys.BaseUrl, Object.getPrototypeOf( thisArg ).constructor ) || ( () => of( '' ) ) )( thisArg );
}

/**
 * class decorator
 *
 * @param url - will use this exact string as BaseUrl, unless `configKey` is passed; function will be called with instance and must return Observable
 * @param configKey - will request `url` and get this key from the resulting json
 */
export const BaseUrl = <TClass extends AbstractRESTClient>( url: ( ( thisArg: TClass, ...args: any[] ) => Observable<string> ) | string, configKey?: string ) =>
{
  return <T extends DerivedAbstractRESTClient>( target: T ): void =>
  {
    const metadataKey = MetadataKeys.BaseUrl;
    let cached: Observable<any>;
    if ( typeof url !== 'function' )
      return Reflect.defineMetadata( metadataKey, !!configKey
        ? ( { http }: { http: HttpClient } ) => !cached
          ? ( cached = http.get<any>( url ).pipe( map( response => response[ configKey ] ) ) )
          : cached
        : () => of( url ), target );
    Reflect.defineMetadata( metadataKey, url, target );
  };
}
