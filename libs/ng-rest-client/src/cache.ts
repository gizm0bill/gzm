import { HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { isObject, Reflect, MetadataKeys, MethodNames, AbstractApiClient } from './+';

export const cacheMap = new Map<string, [Observable<HttpEvent<any>>, ICacheOptions]>();

export interface ICacheOptions
{
  until?: number;
  times?: number;
  clearMethodPrefix: string;
}
// TODO: add until date
// TODO: add each times
export const Cache = ( options?: number | string | ICacheOptions ): MethodDecorator =>
{
  const cacheOptions: ICacheOptions = { clearMethodPrefix: 'clearCache' };
  switch ( true )
  {
    case typeof options === 'number':
        cacheOptions.until = options as number;
        break;
    case typeof options === 'string' && options.lastIndexOf( 'times' ) > 0:
        cacheOptions.times = parseInt( options as string, 10 );
        break;
    case typeof options === 'string': // just try to parse some timestamp
        cacheOptions.until = parseInt( options as string, 10 );
        break;
    case isObject( cacheOptions ) && !!options:
        cacheOptions.until = ( options as ICacheOptions ).until || undefined;
        cacheOptions.times = ( options as ICacheOptions ).times || undefined;
        if ( typeof ( options as ICacheOptions ).clearMethodPrefix === 'string' )
          cacheOptions.clearMethodPrefix = ( options as ICacheOptions ).clearMethodPrefix;
        break;
  }
  return ( target: Object, targetKey?: string | symbol ): void =>
  {
    const targetKeyString = targetKey.toString();
    Object.defineProperty( target,
      `${cacheOptions.clearMethodPrefix}${targetKeyString[0].toUpperCase()}${targetKeyString.slice( 1 )}`,
      {
        writable: false,
        value: function()
        {
          Reflect.defineMetadata( MetadataKeys.ClearCache, true, target, targetKey );
          return this;
        }
    } );
    // Reflect.defineMetadata( MetadataKeys.ClearCache, false, target, targetKey );
    Reflect.defineMetadata( MetadataKeys.Cache, cacheOptions, target, targetKey );
  };
};

export const CacheClear = <TClass extends AbstractApiClient>( targetKey: MethodNames<TClass> ) =>
  ( target: TClass, name: MethodNames<TClass>, descriptor: TypedPropertyDescriptor<( ...args: any[] ) => any> ) =>
  {
    const originalValue = descriptor.value;
    descriptor.value = function()
    {
      Reflect.defineMetadata( MetadataKeys.ClearCache, true, target, targetKey );
      return originalValue.call( this );
    };
  };
