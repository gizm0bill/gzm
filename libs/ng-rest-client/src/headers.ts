import { HttpHeaders } from '@angular/common/http';
import { Observable, of, zip } from 'rxjs';
import { defaultIfEmpty, map } from 'rxjs/operators';
import { AbstractApiClient, DerivedAbstractApiClient, MetadataKeys, Reflect } from './+';

/**
 * class decorator
 * method decorator
 */
export function Headers( headers: {} )
{
  function decorator <TClass extends DerivedAbstractApiClient>( target: TClass ): void;
  function decorator( target: AbstractApiClient, targetKey: string | symbol ): void;
  function decorator( target: AbstractApiClient, targetKey?: string | symbol ): void
  {
    const metadataKey = MetadataKeys.Header;
    if ( targetKey !== undefined ) // method
    {
      const existingHeaders: unknown[] = Reflect.getOwnMetadata( metadataKey, target, targetKey ) || [];
      existingHeaders.push( headers );
      Reflect.defineMetadata( metadataKey, existingHeaders, target, targetKey );
    }
    else // class type
    {
      const existingHeaders: unknown[] = Reflect.getOwnMetadata( metadataKey, target ) || [];
      existingHeaders.push( headers );
      Reflect.defineMetadata( metadataKey, existingHeaders, target, undefined );
    }
  }
  return decorator;
}

/**
 * property decorator
 * parameter decorator
 */
export function Header( key?: string )
{
  function decorator( target: AbstractApiClient, propertyKey: string | symbol ): void;
  function decorator( target: AbstractApiClient, propertyKey: string | symbol, parameterIndex: number ): void;
  function decorator( target: AbstractApiClient, propertyKey: string | symbol, parameterIndex?: number ): void
  {
    // TODO: check constructor: typeof target === 'function'
    const
      saveToKey = parameterIndex !== undefined ? propertyKey : undefined, // if no parameterIndex, it's a property header
      metadataKey = MetadataKeys.Header,
      existingHeaders: unknown[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

    existingHeaders.push( parameterIndex !== undefined ? [ parameterIndex, key ] : { [ key || propertyKey ]: propertyKey } );
    Reflect.defineMetadata( metadataKey, existingHeaders, target, saveToKey );
  }
  return decorator;
}

export const buildHeaders = ( thisArg: AbstractApiClient, target, targetKey, args: unknown[] ): Observable<HttpHeaders> =>
{
  const
    headers: Observable<unknown>[] = [],
    classWideHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target.constructor ) || [],
    methodHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target, targetKey ) || [];
  const propertyHeaders = ( Reflect.getOwnMetadata( MetadataKeys.Header, target ) || [] )
      .map( ( headerDef: Array<{ [name: string]: unknown }> ) =>
      {
        const headerValues = Object.assign( {}, headerDef );
        Object.entries( headerDef ).forEach( ( [ headerKey, headerProperty ]: [ string, any ] ) => {
          headerValues[headerKey] = thisArg[headerProperty];
        } );
        return headerValues;
      } );

  // TODO: defer
  [ ...propertyHeaders, ...classWideHeaders, ...methodHeaders ].forEach( ( headerDef: Function & Object & any[] ) =>
  {
    switch ( true )
    {
      case typeof headerDef === 'function' :
        const headerForm$ = headerDef.call( undefined, thisArg );
        if ( !( headerForm$ instanceof Observable ) ) headers.push( of( headerForm$ ) );
        else headers.push( headerForm$ );
        break;
      case Array.isArray( headerDef ): // parameter header
        headers.push( of( { [ headerDef[1] ]: args[ headerDef[0] ] } ) );
        break;
      default: // is of Object type, method headers
        Object.entries( headerDef ).forEach( ( [ headerKey, headerForm ]: [ string, Function|Observable<unknown> ] ) =>
        {
          switch ( true )
          {
            case headerForm instanceof Observable: // is from property decorator
              headers.push( ( headerForm as Observable<unknown> ).pipe( map( headerValue => ( { [ headerKey ]: headerValue } ) ) ) );
              break;
            case typeof headerForm === 'function':
              const headerValue$ = ( headerForm as Function ).call( undefined, thisArg );
              if ( !( headerValue$ instanceof Observable ) ) headers.push( of( { [ headerKey ]: headerValue$ } ) );
              else headers.push( headerValue$.pipe( map( headerValue => ( { [ headerKey ]: headerValue } ) ) ) );
              break;
            default:
              headers.push( of( { [ headerKey ]: headerForm } ) );
          }
        } );
        break;
    }
  } );
  return zip( ...headers ).pipe
  (
    defaultIfEmpty( [] ),
    map( headerResults => new HttpHeaders( headerResults.reduce( ( headersObject, currentHeaderResults ) =>
    {
      Object.entries( currentHeaderResults ).forEach( ( [ headerKey, headerValue ] ) =>
        headersObject[ headerKey ] = [ ...( headersObject[ headerKey ] || [] ), ...( Array.isArray( headerValue ) ? headerValue : [ headerValue ] ) ] );
      return headersObject;
    }, {} ) ) ),
  );
};
