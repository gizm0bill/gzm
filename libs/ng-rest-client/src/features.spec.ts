import { TestBed, inject } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Observable, zip, BehaviorSubject, throwError } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AbstractRESTClient, Body, POST, HEAD, Path, Query, NO_ENCODE, BaseUrl, RESTClientError as ApiError } from '.';
import { standardEncoding } from './query';

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
    NAME_CLASS_WIDE_QUERY_PARAM_2 = 'anotherClassWideQueryParam',
    VALUE_CLASS_WIDE_QUERY_PARAM_2 = 'another-class-wide-query{param}',
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
    readonly someSubject = new BehaviorSubject( {} );
  }

  @Query
  ( {
    [ NAME_CLASS_WIDE_QUERY_PARAM_1 ]: VALUE_CLASS_WIDE_QUERY_PARAM_1,
    [ NAME_CLASS_WIDE_QUERY_PARAM_2 ]: VALUE_CLASS_WIDE_QUERY_PARAM_2
  } )
  // class-wide Query value from function at runtime for current method
  @Query( ( thisArg: ApiClient ) => thisArg.mockService.someSubject.pipe( take( 1 ) ), NO_ENCODE )
  @ApiError( ( { uniqueTestKey }: ApiClient, { status, statusText }: HttpErrorResponse, { url }: HttpRequest<any> ): Observable<string> =>
    throwError( new Error( [ status, statusText, url, uniqueTestKey ].join() ) ) )
  class ApiClient extends AbstractRESTClient
  {
    uniqueTestKey = Math.random();
    constructor
    (
      protected readonly http: HttpClient,
      readonly mockService: MockService
    ) { super(); }

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

    @HEAD( SOME_URL ) testError(): Observable<any> { return; }
  }

  const
    CONFIG_JSON = 'test-config-location.json',
    CONFIG_JSON_KEY = 'base-url',
    CONFIG_JSON_VALUE = 'some/base/url/';

  // static base url value
  @BaseUrl( CONFIG_JSON_VALUE )
  class ApiClientA extends AbstractRESTClient
  {
    @HEAD( SOME_URL ) testBaseUrlA(): Observable<Response> { return; }
  }

  // get base url from some json path and extract value by provided key
  @BaseUrl( CONFIG_JSON, CONFIG_JSON_KEY )
  class ApiClientB extends AbstractRESTClient
  {
    @HEAD( SOME_URL ) testBaseUrlB(): Observable<Response> { return; }
  }

  // get base url from Observable
  @BaseUrl( ( thisArg: ApiClientC ) => thisArg.http.get( CONFIG_JSON ).pipe( map( response => response[ CONFIG_JSON_KEY ] ) ) )
  class ApiClientC extends AbstractRESTClient
  {
    @HEAD( SOME_URL ) testBaseUrlC(): Observable<Response> { return; }
  }

  beforeEach( () =>
  {
    TestBed.configureTestingModule
    ( {
      imports: [ HttpClientTestingModule ],
      providers:
      [
        MockService,
        { provide: ApiClient, useFactory: () => new ApiClient( TestBed.inject( HttpClient ), TestBed.inject( MockService ) ) },
        { provide: ApiClientA, useFactory: () => new ApiClientA() },
        { provide: ApiClientB, useFactory: () => new ApiClientB() },
        { provide: ApiClientC, useFactory: () => new ApiClientC() },
      ]
    } );
    httpTestingController = TestBed.inject( HttpTestingController );
  } );

  it( 'should handle errors', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    const
      STATUS_NUMBER = 500,
      STATUS_MESSAGE = 'Internal Server Error';
    apiClient.testError().subscribe
    (
      data => fail( `should have failed with 500, instead got data: ${data}` ),
      ( { message } ) => expect( message ).toEqual( [ STATUS_NUMBER, STATUS_MESSAGE, SOME_URL, apiClient.uniqueTestKey ].join() )
    );
    httpTestingController.expectOne( () => true ).flush( '', { status: STATUS_NUMBER, statusText: STATUS_MESSAGE } );
  } ) );

  it( 'should add base url', inject( [ ApiClientA, ApiClientB, ApiClientC ], ( apiClientA: ApiClientA, apiClientB: ApiClientB, apiClientC: ApiClientC ) =>
  {
    apiClientA.testBaseUrlA().subscribe();
    httpTestingController.expectOne( CONFIG_JSON_VALUE + SOME_URL ).flush( null );

    apiClientB.testBaseUrlB().subscribe();
    const [ baseUrlRequestB ] = httpTestingController.match( CONFIG_JSON );
    baseUrlRequestB.flush( { [ CONFIG_JSON_KEY ]: CONFIG_JSON_VALUE } );
    httpTestingController.expectOne( CONFIG_JSON_VALUE + SOME_URL ).flush( null );

    apiClientC.testBaseUrlC().subscribe();
    const [ baseUrlRequestC ] = httpTestingController.match( CONFIG_JSON );
    baseUrlRequestC.flush( { [ CONFIG_JSON_KEY ]: CONFIG_JSON_VALUE } );
    httpTestingController.expectOne( CONFIG_JSON_VALUE + SOME_URL ).flush( null );

  } ) );

  it( 'should add query parameters', inject( [ ApiClient, MockService ], ( apiClient: ApiClient, mockService: MockService ) =>
  {
    mockService.someSubject.next
    ( {
      [ NAME_CLASS_WIDE_QUERY_PARAM_1 ]: VALUE_CLASS_WIDE_QUERY_PARAM_1,
      [ NAME_CLASS_WIDE_QUERY_PARAM_2 ]: VALUE_CLASS_WIDE_QUERY_PARAM_2
    } );
    apiClient.testQuery( VALUE_QUERY_PARAM_1, VALUE_QUERY_PARAM_2, VALUE_QUERY_PARAM_31, VALUE_QUERY_PARAM_32 ).subscribe();
    httpTestingController.expectOne( ( { params } ) =>
    {
      const paramsParts = params.toString().split( '&' );
      return paramsParts.includes( `${NAME_QUERY_PARAM_1}=${standardEncoding( VALUE_QUERY_PARAM_1 )}` )
        && paramsParts.includes( `${NAME_QUERY_PARAM_2}=${VALUE_QUERY_PARAM_2}` )
        && paramsParts.includes( `${NAME_QUERY_PARAM_3}=${VALUE_QUERY_PARAM_31}` )
        && paramsParts.includes( `${NAME_QUERY_PARAM_3}=${VALUE_QUERY_PARAM_32}` )
        && paramsParts.includes( `${NAME_CLASS_WIDE_QUERY_PARAM_1}=${standardEncoding( VALUE_CLASS_WIDE_QUERY_PARAM_1 )}` )
        && paramsParts.includes( `${NAME_CLASS_WIDE_QUERY_PARAM_1}=${VALUE_CLASS_WIDE_QUERY_PARAM_1}` )
        && paramsParts.includes( `${NAME_CLASS_WIDE_QUERY_PARAM_2}=${standardEncoding( VALUE_CLASS_WIDE_QUERY_PARAM_2 )}` )
        && paramsParts.includes( `${NAME_CLASS_WIDE_QUERY_PARAM_2}=${VALUE_CLASS_WIDE_QUERY_PARAM_2}` );
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
