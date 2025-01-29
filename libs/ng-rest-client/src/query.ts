import { HttpParameterCodec, HttpParams } from '@angular/common/http';
import { Observable, of, zip } from 'rxjs';
import { defaultIfEmpty, map } from 'rxjs/operators';
import { AbstractRESTClient, DerivedAbstractRESTClient, MetadataKeys } from './+';

export const standardEncoding = ( value: string ): string =>
  encodeURIComponent( value )
    .replace( /%40/gi, '@' )
    .replace( /%3A/gi, ':' )
    .replace( /%24/gi, '$' )
    .replace( /%2C/gi, ',' )
    .replace( /%3B/gi, ';' )
    .replace( /%2B/gi, '+' )
    .replace( /%3D/gi, '=' )
    .replace( /%3F/gi, '?' )
    .replace( /%2F/gi, '/' );

class PassThroughCodec implements HttpParameterCodec
{
  encodeKey( key: string ): string { return key; }
  decodeKey( key: string ): string { return key; }
  encodeValue( value: string ): string { return value; }
  decodeValue( value: string ): string { return value; }
}

export const NO_ENCODE = Symbol( 'RESTClient:Query.noEncode' );

export const buildQueryParameters = <T extends AbstractRESTClient>( thisArg: T, target: T, targetKey: string | symbol, args: any[] ): Observable<any> =>
{
  const
    query: Observable<any>[] = [],
    classWideQuery = Reflect.getOwnMetadata( MetadataKeys.Query, target.constructor ) || [],
    methodQuery = Reflect.getOwnMetadata( MetadataKeys.Query, target, targetKey ) || [],
    propertyQuery = ( Reflect.getOwnMetadata( MetadataKeys.Query, target ) || [] )
      .map( ( queryDef: { [name: string]: any } ) =>
      (
        Object.entries( queryDef ).forEach( ( [ queryKey, queryProperty ]: [string, keyof T] ) => queryDef[queryKey] = thisArg[queryProperty] ),
        queryDef
      ) );

  [ ...propertyQuery, ...classWideQuery, ...methodQuery ].forEach( ( [ paramIndex, queryDef, ...extraOptions ]: [ number, any, ...any[] ] ) =>
  {
    switch ( true )
    {
      case typeof queryDef === 'function':
        const queryForm$ = queryDef.call( undefined, thisArg );
        query.push( ( !( queryForm$ instanceof Observable ) ? of( queryForm$ ) : queryForm$ ).pipe( map( data => [ data, ...extraOptions ] ) ) );
        break;
      case paramIndex !== undefined: // parameter query
        // eslint-disable-next-line no-unused-expressions
        args[ paramIndex ] && query.push( of( [ { [ queryDef ]: args[ paramIndex ] }, ...extraOptions ] ) );
        break;
      default: // is of Object type, method query
        Object.entries( queryDef ).forEach( ( [ queryKey, queryForm ]: [ string, ( () => void ) | any ] ) =>
        {
          switch ( true )
          {
            case queryForm instanceof Observable: // is from property decorator
              query.push( queryForm.pipe( map( queryValue => ( { [ queryKey ]: queryValue } ) ) ) );
              break;
            case typeof queryForm === 'function':
              const queryValue$ = queryForm.call( undefined, thisArg );
              if ( !( queryValue$ instanceof Observable ) ) query.push( of( [ { [ queryKey ]: queryValue$ }, ...extraOptions ] ) );
              else query.push( queryValue$.pipe( map( queryValue => ( [ { [ queryKey ]: queryValue }, ...extraOptions ] ) ) ) );
              break;
            default:
              query.push( of( [ { [ queryKey ]: queryForm }, ...extraOptions ] ) );
          }
        } );
    }
  } );
  return zip( ...query ).pipe
  (
    defaultIfEmpty( [] as any[] ),
    map( queryResults => new HttpParams( { fromObject: queryResults.reduce( ( queryObject, [ queryResult, ...extraOptions ]: [ Record<string, string|string[]>, ...any[] ] ) =>
    (
      Object.entries( queryResult ).forEach( ( [ queryKey, queryValue ] ) =>
      {
        queryValue = Array.isArray( queryValue )
          ? queryValue.map( value => !extraOptions.includes( NO_ENCODE ) ? standardEncoding( value ) : value )
          : [ !extraOptions.includes( NO_ENCODE ) ? standardEncoding( queryValue) : queryValue ];
        if ( !extraOptions.includes( NO_ENCODE ) ) queryKey = standardEncoding( queryKey );
        queryObject[ queryKey ] = [ ...( queryObject[ queryKey ] || [] ), ...queryValue ];
      } ),
      queryObject
    ), {} as any ), encoder: new PassThroughCodec } ) ),
  );
};


export const Query = ( keyOrParams: any, ...extraOptions: any[] ): ClassDecorator & ParameterDecorator =>
{
  function decorator <TClass extends DerivedAbstractRESTClient>( target: TClass ): void;
  function decorator( target: AbstractRESTClient, propertyKey: string | symbol, parameterIndex: number ): void;
  function decorator( target: AbstractRESTClient, propertyKey?: string | symbol, parameterIndex?: number ): void
  {
    if ( parameterIndex !== undefined ) // on param
    {
      const metadataKey = MetadataKeys.Query;
      const existingParams: [ number, string, ...any[] ][] = Reflect.getOwnMetadata( metadataKey, target, propertyKey ?? '' ) || [];
      existingParams.push( [ parameterIndex, keyOrParams, ...extraOptions ] );
      return Reflect.defineMetadata( metadataKey, existingParams, target, propertyKey ?? undefined as unknown as string );
    }
    // on class
    const metadataKey = MetadataKeys.Query;
    const existingQuery: any[] = Reflect.getOwnMetadata( metadataKey, target ) || [];
    existingQuery.push( [ undefined, keyOrParams, ...extraOptions ] );
    Reflect.defineMetadata( metadataKey, existingQuery, target );
  }
  return decorator;
};
