import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import 'reflect-metadata';

export const isObject = ( item: unknown ) => ( item && typeof item === 'object' && !Array.isArray( item ) && item !== null );

export const extend = <T extends Record<string|number|symbol, any>, U extends Record<string|number|symbol, any>>( target: T, source: U ): T & U =>
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
};

// abstract Api class
@Injectable()
export abstract class AbstractRESTClient
{
  protected http: HttpClient;
  constructor() { this.http = inject( HttpClient ); }
}
export type DerivedAbstractRESTClient = new ( ...args: any[] ) => AbstractRESTClient;
export type MethodNames<T> = { [K in keyof T]: T[K] extends Function ? K : never }[ keyof T ];

// reflect metadata key symbols
export const MetadataKeys =
{
  BaseUrl: Symbol( 'RESTClient:BaseUrl' ),
  Query: Symbol( 'RESTClient:Query' ),
  Path: Symbol( 'RESTClient:Path' ),
  Body: Symbol( 'RESTClient:Body' ),
  Header: Symbol( 'RESTClient:Header' ),
  Type: Symbol( 'RESTClient:ResponseType' ),
  Error: Symbol( 'RESTClient:Error' ),
  Cache: Symbol( 'RESTClient:Cache' ),
  ClearCache: Symbol( 'RESTClient:ClearCache' ),
} as const;
