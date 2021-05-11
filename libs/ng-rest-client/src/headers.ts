import { HttpHeaders } from '@angular/common/http';
import { Observable, of, zip } from 'rxjs';
import { map, defaultIfEmpty } from 'rxjs/operators';
import { DerivedAbstractApiClient, Reflect, MetadataKeys, AbstractApiClient } from './+';

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
      const existingHeaders: any[] = Reflect.getOwnMetadata( metadataKey, target, targetKey ) || [];
      existingHeaders.push( headers );
      Reflect.defineMetadata( metadataKey, existingHeaders, target, targetKey );
    }
    else // class type
    {
      const existingHeaders: any[] = Reflect.getOwnMetadata( metadataKey, target ) || [];
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
    const
      saveToKey = parameterIndex !== undefined ? propertyKey : undefined, // if no parameterIndex, it's a property header
      metadataKey = MetadataKeys.Header,
      existingHeaders: any[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

    existingHeaders.push( parameterIndex !== undefined ? [ parameterIndex, key ] : { [ key || propertyKey ]: propertyKey } );
    Reflect.defineMetadata( metadataKey, existingHeaders, target, saveToKey );
  }
  return decorator;
}

export const buildHeaders = ( thisArg: AbstractApiClient, target, targetKey, args: any[] ): Observable<any> =>
{
  const
    headers: Observable<any>[] = [],
    classWideHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target.constructor ) || [],
    methodHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target, targetKey ) || [],
    x = ( Reflect.getOwnMetadata( MetadataKeys.Header, target ) || [] );
  const propertyHeaders = ( Reflect.getOwnMetadata( MetadataKeys.Header, target ) || [] )
      .map( ( headerDef: Array<{ [name: string]: any }> ) =>
      {
        const headerValues = Object.assign( {}, headerDef );
        Object.entries( headerDef ).forEach( ( [ headerKey, headerProperty ]: [ string, any ] ) => {
          headerValues[headerKey] = thisArg[headerProperty];
        } );
        return headerValues;
      } );

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
        Object.entries( headerDef ).forEach( ( [ headerKey, headerForm ]: [ string, Function|any ] ) =>
        {
          switch ( true )
          {
            case headerForm instanceof Observable: // is from property decorator
              headers.push( headerForm.pipe( map( headerValue => ( { [ headerKey ]: headerValue } ) ) ) );
              break;
            case typeof headerForm === 'function':
              const headerValue$ = headerForm.call( undefined, thisArg );
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
    (
      Object.entries( currentHeaderResults ).forEach( ( [ headerKey, headerValue ] ) =>
        headersObject[ headerKey ] = [ ...( headersObject[ headerKey ] || [] ), ...( Array.isArray( headerValue ) ? headerValue : [ headerValue ] ) ] ),
      headersObject
    ), {} ) ) ),
  );
};
