import { HttpParameterCodec, HttpParams } from '@angular/common/http';
import { DerivedAbstractApiClient, MetadataKeys, Reflect, AbstractApiClient } from './+';
import { Observable, of, zip } from 'rxjs';
import { defaultIfEmpty, map } from 'rxjs/operators';

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

export const NO_ENCODE = Symbol( 'apiClient:Query.noEncode' );

// export const buildQueryParameterz = ( thisArg, target, targetKey, args ) =>
// {
//   const
//     classWideQueryParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Query, target.constructor ),
//     queryParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Query, target, targetKey );
//   let query = new HttpParams( { encoder: new PassThroughCodec } );


//   if ( classWideQueryParams ) classWideQueryParams.forEach( classWideQueryParam =>
//   {
//     const _q = Object.assign( {}, classWideQueryParam );
//     debugger;
//     for ( const _qk in _q ) if ( _q.hasOwnProperty( _qk ) )
//     {
//       if ( typeof _q[_qk] === 'function' ) _q[_qk] = _q[_qk].call( thisArg );
//       query = query.append( _qk, _q[_qk] );
//     }
//   } );
//   if ( queryParams ) queryParams.filter( param => args[param[0]] !== undefined ).forEach( param =>
//   {
//     let queryKey: string, queryVal: string;
//     // don't uri encode flagged params
//     if ( Object.values( param ).indexOf( NO_ENCODE ) !== -1 ) [ queryKey, queryVal ] = [ param[1], args[param[0]] ];
//     else [ queryKey, queryVal ] = [ standardEncoding( param[1] ), standardEncoding( args[param[0]] ) ];
//     return query = query.append( queryKey, queryVal );
//   } );
//   return query;
// };

export const buildQueryParameters = ( thisArg: AbstractApiClient, target, targetKey, args: any[] ): Observable<any> =>
{
  const
    query: Observable<any[]>[] = [],
    classWideQuery = Reflect.getOwnMetadata( MetadataKeys.Query, target.constructor ) || [],
    methodQuery = Reflect.getOwnMetadata( MetadataKeys.Query, target, targetKey ) || [],
    propertyQuery = ( Reflect.getOwnMetadata( MetadataKeys.Query, target ) || [] )
      .map( ( queryDef: Array<{ [name: string]: any }> ) =>
      (
        Object.entries( queryDef ).forEach( ( [ queryKey, queryProperty ]: [ string, any ] ) => queryDef[queryKey] = thisArg[queryProperty] ),
        queryDef
      ) );

  [ ...propertyQuery, ...classWideQuery, ...methodQuery ].forEach( ( [ paramIndex, queryDef, ...extraOptions ]: [ number, Function & Object & string, ...any[] ] ) =>
  {
    switch ( true )
    {
      case typeof queryDef === 'function':
        const queryForm$ = queryDef.call( undefined, thisArg );
        query.push( ( !( queryForm$ instanceof Observable ) ? of( queryForm$ ) : queryForm$ ).pipe( map( data => [ data, ...extraOptions ] ) ) );
        break;
      case paramIndex !== undefined: // parameter query
        query.push( of( [ { [ queryDef ]: args[ paramIndex ] }, ...extraOptions ] ) );
        break;
      default: // is of Object type, method query
        Object.entries( queryDef ).forEach( ( [ queryKey, queryForm ]: [ string, Function|any ] ) =>
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
    defaultIfEmpty( [] ),
    map( queryResults => new HttpParams( { fromObject: queryResults.reduce( ( queryObject, [ queryResult, ...extraOptions ]: [ any, ...any[] ] ) =>
    (
      Object.entries( queryResult ).forEach( ( [ queryKey, queryValue ]: [ string, string|string[] ] ) =>
      {
        queryValue = Array.isArray( queryValue )
          ? queryValue.map( value => !extraOptions.includes( NO_ENCODE ) ? standardEncoding( value ) : value )
          : [ !extraOptions.includes( NO_ENCODE ) ? standardEncoding( queryValue ) : queryValue ];
        if ( !extraOptions.includes( NO_ENCODE ) ) queryKey = standardEncoding( queryKey );
        queryObject[ queryKey ] = [ ...( queryObject[ queryKey ] || [] ), ...queryValue ];
      } ),
      queryObject
    ), {} ), encoder: new PassThroughCodec } ) ),
  );
};


export const Query = ( keyOrParams: any, ...extraOptions: any[] ) =>
{
  function decorator <TClass extends DerivedAbstractApiClient>( target: TClass ): void;
  function decorator( target: AbstractApiClient, propertyKey: string | symbol, parameterIndex: number ): void;
  function decorator( target: AbstractApiClient, propertyKey?: string | symbol, parameterIndex?: number ): void
  {
    if ( parameterIndex !== undefined ) // on param
    {
      const metadataKey = MetadataKeys.Query;
      const existingParams: [ number, string, ...any[] ][] = Reflect.getOwnMetadata( metadataKey, target, propertyKey ) || [];
      existingParams.push( [ parameterIndex, keyOrParams, ...extraOptions ] );
      Reflect.defineMetadata( metadataKey, existingParams, target, propertyKey );
    }
    else // on class
    {
      const metadataKey = MetadataKeys.Query;
      const existingQuery: Object[] = Reflect.getOwnMetadata( metadataKey, target ) || [];
      existingQuery.push( [ undefined, keyOrParams, ...extraOptions ] );
      Reflect.defineMetadata( metadataKey, existingQuery, target, undefined );
    }
  }
  return decorator;
};
