import 'reflect-metadata';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export const isObject = ( item: any ) => ( item && typeof item === 'object' && !Array.isArray( item ) && item !== null );

export const extend = <T, U>( target: T, source: U ): T & U =>
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
export abstract class AbstractApiClient
{
  protected http: HttpClient;
  constructor() { this.http = inject( HttpClient ); }
}
export type DerivedAbstractApiClient = new ( ...args: any[] ) => AbstractApiClient;
export type MethodNames<T> = { [K in keyof T]: T[K] extends () => void ? K : never }[ keyof T ];

// reflect metadata key symbols
export const MetadataKeys =
{
  BaseUrl: Symbol( 'apiClient:BaseUrl' ),
  Query: Symbol( 'apiClient:Query' ),
  Path: Symbol( 'apiClient:Path' ),
  Body: Symbol( 'apiClient:Body' ),
  Header: Symbol( 'apiClient:Header' ),
  Type: Symbol( 'apiClient:ResponseType' ),
  Error: Symbol( 'apiClient:Error' ),
  Cache: Symbol( 'apiClient:Cache' ),
  ClearCache: Symbol( 'apiClient:ClearCache' ),
};

export const Reflect = global['Reflect'];
