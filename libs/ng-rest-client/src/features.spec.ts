import { TestBed, inject } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Body, POST, GET } from '.';
import { Observable, zip, of, throwError } from 'rxjs';
import { Headers } from './headers';
import { map } from 'rxjs/operators';

fdescribe( 'Common features', () =>
{
  const
    SOME_URL = 'some-url',
    NAME_BODY_PARAM_1  = 'someBodyParam',
    VALUE_BODY_PARAM_1  = 'some-body-param',
    NAME_BODY_PARAM_2  = 'someOtherBodyParam',
    VALUE_BODY_PARAM_2  = 'some-other-body-param'
    ;
  let httpTestingController: HttpTestingController;

  class ApiClient extends AbstractApiClient
  {
    @POST( SOME_URL )
    testBody( @Body( NAME_BODY_PARAM_1 ) b1: string, @Body( NAME_BODY_PARAM_2 ) b2: string ): Observable<any> { return; }

    @POST( SOME_URL )
    testFileBody( @Body( NAME_BODY_PARAM_1 ) b1: File, @Body( NAME_BODY_PARAM_2 ) b2: File ): Observable<any> { return; }
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

  it( 'should add simple JSON body params', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testBody( VALUE_BODY_PARAM_1, VALUE_BODY_PARAM_2 ).subscribe();
    const
      expectedObject = { [ NAME_BODY_PARAM_2 ]: VALUE_BODY_PARAM_2, [ NAME_BODY_PARAM_1 ]: VALUE_BODY_PARAM_1 },
      request = httpTestingController.expectOne( ( { body } ) => JSON.stringify( body ) === JSON.stringify( expectedObject ) );
    request.flush( null );
  } ) );

  it( 'should add Files to body', ( done: DoneFn ) => inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    const
      mockData1 = ['mock', '-', 'data'],
      mockData2 = ['another', '-', 'mock', '-', 'data'],
      mockFilename = 'mock-filename',
      file1 = new File( mockData1, mockFilename, {type: 'text/plain'} ),
      file2 = new File( mockData2, mockFilename, {type: 'text/plain'} );
    apiClient.testFileBody( file1, file2 ).subscribe();
    const
      request = httpTestingController.expectOne( ( { body } ) =>
      {
        const
          expectedKeys = [ NAME_BODY_PARAM_1, NAME_BODY_PARAM_2 ],
          expectedValues = [ file1, file2 ];
        let files = [];
        Array.from( body.entries() ).forEach( ( [ key, value ] ) =>
        {
          expectedKeys.splice( expectedKeys.findIndex( k => k === key ), 1 );
          files = [ ...expectedValues.splice( expectedValues.findIndex( v => v === value ), 1 ), ...files ];
        } );
        return !!zip( ...files.map( file => new Observable<any>( observer =>
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
            if ( !( fileResults.includes( mockData1.join( '' ) ) && fileResults.includes( mockData2.join( '' ) )
              && expectedValues.length === 0 && expectedKeys.length === 0 ) ) throw( new Error( 'invalid file data sent to request' ) );
            return true;
          } )
        )
        .subscribe( _ => done() );
      } );
      request.flush( {} );
  } )() );

  afterEach( () => httpTestingController.verify() );
} );
