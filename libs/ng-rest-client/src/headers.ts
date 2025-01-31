import { HttpHeaders } from '@angular/common/http';
import { Observable, of, zip } from 'rxjs';
import { defaultIfEmpty, map } from 'rxjs/operators';
import { AbstractRESTClient, DerivedAbstractRESTClient, MetadataKeys } from './+';

/**
 * class decorator
 * method decorator
 */
export const Headers = ( headers: {} ): ClassDecorator & MethodDecorator =>
{
  function decorator <TClass extends DerivedAbstractRESTClient>( target: TClass ): void;
  function decorator( target: AbstractRESTClient, targetKey: string | symbol ): void;
  function decorator( target: AbstractRESTClient, targetKey?: string | symbol ): void
  {
    const metadataKey = MetadataKeys.Header;
    if ( targetKey != null ) // method
    {
      const existingHeaders: unknown[] = Reflect.getOwnMetadata( metadataKey, target, targetKey ) || [];
      existingHeaders.push( headers );
      return Reflect.defineMetadata( metadataKey, existingHeaders, target, targetKey );
    }
    // class type
    const existingHeaders: unknown[] = Reflect.getOwnMetadata( metadataKey, target ) || [];
    existingHeaders.push( headers );
    return Reflect.defineMetadata( metadataKey, existingHeaders, target );
  }
  return decorator;
}

/**
 * property decorator
 * parameter decorator
 */
export const Header = ( key?: string ) =>
{
  function decorator( target: AbstractRESTClient, propertyKey: string | symbol ): void;
  function decorator( target: AbstractRESTClient, propertyKey: string | symbol, parameterIndex: number ): void;
  function decorator( target: AbstractRESTClient, propertyKey: string | symbol, parameterIndex?: number ): void
  {
    const
      saveToKey = parameterIndex != null ? propertyKey : undefined as unknown as string, // if no parameterIndex, it's a property header
      metadataKey = MetadataKeys.Header,
      existingHeaders: unknown[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

    existingHeaders.push( parameterIndex != null ? [ parameterIndex, key ] : { [ key || propertyKey ]: propertyKey } );
    Reflect.defineMetadata( metadataKey, existingHeaders, target, saveToKey );
  }
  return decorator;
}

export const buildHeaders = ( thisArg: AbstractRESTClient, target: any, targetKey: string | symbol, args: unknown[] ): Observable<HttpHeaders> =>
{
  const
    headers: Observable<unknown>[] = [],
    classWideHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target.constructor ) || [],
    methodHeaders = Reflect.getOwnMetadata( MetadataKeys.Header, target, targetKey ) || [];
  const propertyHeaders = ( Reflect.getOwnMetadata( MetadataKeys.Header, target ) || [] )
      .map( ( headerDef: { [name: string]: keyof DerivedAbstractRESTClient } ) =>
      {
        const headerValues = Object.assign( {}, headerDef );
        Object.entries( headerDef ).forEach( ( [ headerKey, headerProperty ] ) => ( headerValues[headerKey] = thisArg[headerProperty] ) );
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
        Object.entries( headerDef ).forEach( ( [ headerKey, headerForm ] ) =>
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
    defaultIfEmpty( [] as any[] ),
    map( headerResults => new HttpHeaders( headerResults.reduce( ( headersObject, currentHeaderResults ) =>
    {
      Object.entries( currentHeaderResults ).forEach( ( [ headerKey, headerValue ] ) =>
        headersObject[ headerKey ] = [
          ...( headersObject[ headerKey ] || [] ),
          ...( Array.isArray( headerValue ) ? headerValue : [ headerValue ] )
        ].filter( headerValue => headerValue != null )
      );
      return headersObject;
    }, {} ) ) ),
  );
};
