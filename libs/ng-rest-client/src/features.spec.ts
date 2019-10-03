import { TestBed, inject } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Body, POST, HEAD, Path, Query, NO_ENCODE } from '.';
import { Observable, zip, BehaviorSubject } from 'rxjs';
import { map, take } from 'rxjs/operators';

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
    PATH_PARAM_URL = `some/{${NAME_PATH_PARAM_1}}/url/{${NAME_PATH_PARAM_2}}`,
    NAME_CLASS_WIDE_QUERY_PARAM_1 = 'someClassWideQueryParam',
    VALUE_CLASS_WIDE_QUERY_PARAM_1 = 'some-class-wide-query[param]',
    NAME_CLASS_WIDE_QUERY_PARAM_2 = 'abc',
    VALUE_CLASS_WIDE_QUERY_PARAM_2 = 'def',
    NAME_QUERY_PARAM_1 = 'someQueryParam',
    VALUE_QUERY_PARAM_1 = 'some-query[param]',
    NAME_QUERY_PARAM_2 = 'someOtherQueryParam',
    VALUE_QUERY_PARAM_2 = 'some[other]{query+param}',
    NAME_QUERY_PARAM_3 = 'yetAnotherQueryParam',
    VALUE_QUERY_PARAM_31 = 'yet-another-query-param',
    VALUE_QUERY_PARAM_32 = 'and-yet-another-query-param';
  let httpTestingController: HttpTestingController;

  class MockService
  {
    public readonly someSubject = new BehaviorSubject( {} );
  }

  @Query
  ( {
    [ NAME_CLASS_WIDE_QUERY_PARAM_1 ]: VALUE_CLASS_WIDE_QUERY_PARAM_1,
    [ NAME_CLASS_WIDE_QUERY_PARAM_2 ]: VALUE_CLASS_WIDE_QUERY_PARAM_2
  } )
  // class-wide Query value from function at runtime for current method
  @Query( ( thisArg: ApiClient ) => thisArg.mockService.someSubject.pipe( take( 1 ) ) )
  class ApiClient extends AbstractApiClient
  {
    constructor
    (
      protected readonly http: HttpClient,
      public readonly mockService: MockService
    ) { super( http ); }

    @POST( SOME_URL )
    testBody
    (
      @Body( NAME_BODY_PARAM_1 ) body1: string,
      @Body( NAME_BODY_PARAM_2 ) body2: string
    ): Observable<any> { return; }

    @POST( SOME_URL )
    testFileBody
    (
      @Body( NAME_BODY_PARAM_1 ) body1: File,
      @Body( NAME_BODY_PARAM_2 ) body2: File,
      @Body( NAME_BODY_PARAM_3 ) body3: string
    ): Observable<any> { return; }

    @HEAD( PATH_PARAM_URL )
    testPathParam
    (
      @Path( NAME_PATH_PARAM_1 ) path1: string,
      @Path( NAME_PATH_PARAM_2 ) path2: string
    ): Observable<any> { return; }

    @HEAD( SOME_URL )
    testQuery
    (
      @Query( NAME_QUERY_PARAM_1 ) query1: string,
      @Query( NAME_QUERY_PARAM_2, NO_ENCODE ) query2: string,
      @Query( NAME_QUERY_PARAM_3 ) query31: string,
      @Query( NAME_QUERY_PARAM_3 ) query32: string,
    ): Observable<any> { return; }
  }

  beforeEach( () =>
  {
    TestBed.configureTestingModule
    ( {
      imports: [ HttpClientTestingModule ],
      providers:
      [
        MockService,
        { provide: ApiClient, useFactory: () => new ApiClient( TestBed.get( HttpClient ), TestBed.get( MockService ) ) },
      ]
    } );
    httpTestingController = TestBed.get( HttpTestingController );
  } );

  fit( 'should add query parameters', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testQuery( VALUE_QUERY_PARAM_1, VALUE_QUERY_PARAM_2, VALUE_QUERY_PARAM_31, VALUE_QUERY_PARAM_32 ).subscribe();
    httpTestingController.expectOne( ( { params } ) =>
    {
      const paramsParts = params.toString().split( '&' );
      debugger;
      return paramsParts.includes( `${NAME_QUERY_PARAM_1}=${encodeURIComponent( VALUE_QUERY_PARAM_1 )}` )
        && paramsParts.includes( `${NAME_QUERY_PARAM_2}=${VALUE_QUERY_PARAM_2}` )
        && paramsParts.includes( `${NAME_QUERY_PARAM_3}=${VALUE_QUERY_PARAM_31}` )
        && paramsParts.includes( `${NAME_QUERY_PARAM_3}=${VALUE_QUERY_PARAM_32}` );
    } );
  } ) );

  it( 'should add path parameters', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testPathParam( VALUE_PATH_PARAM_1, VALUE_PATH_PARAM_2 ).subscribe();
    httpTestingController.expectOne( ( { url } ) => url === `some/${VALUE_PATH_PARAM_1}/url/${VALUE_PATH_PARAM_2}` ).flush( null );
    apiClient.testPathParam( VALUE_PATH_PARAM_2, VALUE_PATH_PARAM_1 ).subscribe();
    httpTestingController.expectOne( ( { url } ) => url === `some/${VALUE_PATH_PARAM_2}/url/${VALUE_PATH_PARAM_1}` ).flush( null );
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
