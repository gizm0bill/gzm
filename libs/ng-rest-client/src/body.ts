import { Reflect, MetadataKeys, DerivedAbstractApiClient, AbstractApiClient } from './+';

export const buildBody = ( target: AbstractApiClient, targetKey: string | symbol, args: any[] ) =>
{
  let bodyParams: any[] = Reflect.getOwnMetadata( MetadataKeys.Body, target, targetKey ),
      body: any = {};
  if ( bodyParams )
  {
    bodyParams = bodyParams.filter( paramTuple => args[ paramTuple[0] ] !== undefined );
    // see if we got some Files inside
    if ( bodyParams.some( param => args[param[0]] instanceof File || args[param[0]] instanceof FileList ) )
    {
      body = new FormData;
      bodyParams.forEach( param =>
      {
        const bodyArg: File|File[] = args[param[0]];
        if ( bodyArg instanceof FileList ) for ( const f of bodyArg as File[] )
          body.append( param[1] || 'files[]', f, f.name );
        else if ( bodyArg instanceof File )
          body.append( param[1] || 'files[]', bodyArg, bodyArg.name );
        else
          body.append( param[1] || 'params[]', bodyArg );
      } );
    }
    // single unnamed body param, add value as is, usually string
    else if ( bodyParams.length === 1 && bodyParams[0][1] === undefined ) body = args[bodyParams[0][0]];
    // plain object
    else bodyParams.map( param => ( { [param[1]]: args[param[0]] } ) ).forEach( param => Object.assign( body, param ) );
  }
  return body;
};

export const Body = ( key?: string, ...extraOptions: any[] ) =>
  ( target: DerivedAbstractApiClient, propertyKey: string | symbol, parameterIndex?: number ) =>
  {
    const
      saveToKey = parameterIndex !== undefined ? propertyKey : undefined,
      metadataKey = MetadataKeys.Body,
      existingParams: any[] = Reflect.getOwnMetadata( metadataKey, target, saveToKey ) || [];

    existingParams.push( parameterIndex !== undefined ? [ parameterIndex, key, ...extraOptions ] : { propertyKey, ...extraOptions } );
    Reflect.defineMetadata( metadataKey, existingParams, target, saveToKey );
  };
