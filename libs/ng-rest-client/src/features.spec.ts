import { TestBed, inject } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Body, POST, GET, HEAD, Path } from '.';
import { Observable, zip, of, throwError } from 'rxjs';
import { map } from 'rxjs/operators';

describe( 'Common features', () =>
{
  const
    SOME_URL = 'some-url',
    NAME_BODY_PARAM_1  = 'someBodyParam',
    VALUE_BODY_PARAM_1  = 'some-body-param',
    NAME_BODY_PARAM_2  = 'someOtherBodyParam',
    VALUE_BODY_PARAM_2  = 'some-other-body-param',
    NAME_BODY_PARAM_3  = 'yetAnotherBodyParam',
    VALUE_BODY_PARAM_3  = 'yet-another-body-param',
    NAME_PATH_PARAM_1 = 'somePathParam',
    VALUE_PATH_PARAM_1 = 'some-path-param',
    NAME_PATH_PARAM_2 = 'someOtherPathParam',
    VALUE_PATH_PARAM_2 = 'some-other-path-param',
    PATH_PARAM_URL = `some/{${NAME_PATH_PARAM_1}}/url/{${NAME_PATH_PARAM_2}}`
    ;
  let httpTestingController: HttpTestingController;

  class ApiClient extends AbstractApiClient
  {
    @POST( SOME_URL )
    testBody( @Body( NAME_BODY_PARAM_1 ) b1: string, @Body( NAME_BODY_PARAM_2 ) b2: string ): Observable<any> { return; }

    @POST( SOME_URL )
    testFileBody( @Body( NAME_BODY_PARAM_1 ) b1: File, @Body( NAME_BODY_PARAM_2 ) b2: File, @Body( NAME_BODY_PARAM_3 ) b3: string ): Observable<any> { return; }

    @HEAD( PATH_PARAM_URL )
    testPathParam( @Path( NAME_PATH_PARAM_1 ) p1: string, @Path( NAME_PATH_PARAM_2 ) p2: string ): Observable<any> { return; }
  }

  beforeEach( () =>
  {
    TestBed.configureTestingModule
    ( {
      imports: [ HttpClientTestingModule ],
      providers:
      [
        { provide: ApiClient, useFactory: () => new ApiClient( TestBed.get( HttpClient ) ) },
      ]
    } );
    httpTestingController = TestBed.get( HttpTestingController );
  } );

  it( 'should add path parameters', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testPathParam( VALUE_PATH_PARAM_1, VALUE_PATH_PARAM_2 ).subscribe();
    httpTestingController.expectOne( `some/${VALUE_PATH_PARAM_1}/url/${VALUE_PATH_PARAM_2}` ).flush( null );
    apiClient.testPathParam( VALUE_PATH_PARAM_2, VALUE_PATH_PARAM_1 ).subscribe();
    httpTestingController.expectOne( `some/${VALUE_PATH_PARAM_2}/url/${VALUE_PATH_PARAM_1}` ).flush( null );
  } ) );

  it( 'should add simple JSON body params', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testBody( VALUE_BODY_PARAM_1, VALUE_BODY_PARAM_2 ).subscribe();
    const expectedObject = { [ NAME_BODY_PARAM_2 ]: VALUE_BODY_PARAM_2, [ NAME_BODY_PARAM_1 ]: VALUE_BODY_PARAM_1 };
    httpTestingController.expectOne( ( { body } ) => JSON.stringify( body ) === JSON.stringify( expectedObject ) ).flush( null );
  } ) );

  it( 'should add Files to body', ( done: DoneFn ) => inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    const
      mockData1 = VALUE_BODY_PARAM_1.split( '-' ),
      mockData2 = VALUE_BODY_PARAM_2.split( '-' ),
      file1 = new File( mockData1, VALUE_BODY_PARAM_1, { type: 'text/plain' } ),
      file2 = new File( mockData2, VALUE_BODY_PARAM_2, { type: 'text/plain' } );
    apiClient.testFileBody( file1, file2, VALUE_BODY_PARAM_3 ).subscribe();
    httpTestingController.expectOne( ( { body } ) =>
    {
      const
        expectedKeys = [ NAME_BODY_PARAM_1, NAME_BODY_PARAM_2, NAME_BODY_PARAM_3 ],
        expectedValues = [ file1, file2, VALUE_BODY_PARAM_3 ];
      let files = [];
      Array.from( body.entries() ).forEach( ( [ key, value ] ) =>
      {
        expectedKeys.splice( expectedKeys.findIndex( k => k === key ), 1 );
        files = [ ...expectedValues.splice( expectedValues.findIndex( v => v === value ), 1 ), ...files ];
      } );
      return !!zip( ...files.filter( file => file instanceof File ).map( file => new Observable<any>( observer =>
      {
        const reader = new FileReader();
        reader.onload = event => observer.next( event );
        reader.onerror = error => observer.error( error );
        reader.onabort = error => observer.error( error );
        reader.onloadend = () => observer.complete();
        reader.readAsText( file );
      } ) ) ).pipe
      (
        map( ( fileEvents: ProgressEvent[] ) =>
        {
          const fileResults = fileEvents.map( fileEvent => ( fileEvent.target as any ).result );
          if ( !( fileResults.includes( VALUE_BODY_PARAM_1.split( '-' ).join( '' ) ) && fileResults.includes( VALUE_BODY_PARAM_2.split( '-' ).join( '' ) )
            && expectedValues.length === 0 && expectedKeys.length === 0 ) ) throw( new Error( 'invalid file data sent to request' ) );
          return true;
        } )
      )
      .subscribe( _ => done() );
    } ).flush( null );
  } )() );

  afterEach( () => httpTestingController.verify() );
} );
