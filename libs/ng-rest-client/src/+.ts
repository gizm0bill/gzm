import 'reflect-metadata';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export const isObject = ( item: any ) => ( item && typeof item === 'object' && !Array.isArray( item ) && item !== null );

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
