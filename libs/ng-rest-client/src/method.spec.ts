import { HttpResponse, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { inject, TestBed } from '@angular/core/testing';
import { NEVER } from 'rxjs';
import { AbstractRESTClient, CONNECT, DELETE, GET, HEAD, JSONP, OPTIONS, PATCH, POST, PUT, TRACE } from '.';

describe( 'Methods', () =>
{
  const
    GET_URL = 'test-get-url',
    POST_URL = 'test-post-url',
    PUT_URL = 'test-put-url',
    PATCH_URL = 'test-patch-url',
    DELETE_URL = 'test-delete-url',
    HEAD_URL = 'test-head-url',
    OPTIONS_URL = 'test-options-url',
    JSONP_URL = 'test-jsonp-url',
    TRACE_URL = 'test-trace-url',
    CONNECT_URL = 'test-connect-url',

    someTestData  = [ 'some', 'response' ],
    expectSomeTestData = ( { body }: HttpResponse<any> ) => expect( body ).toBe( someTestData );

  let httpTestingController: HttpTestingController;

  class X {
    a?: number;
  }

  class ApiClient extends AbstractRESTClient
  {
    @GET( GET_URL ) testGet() { return NEVER; }

    @POST( POST_URL ) testPost() { return NEVER; }

    @PUT( PUT_URL ) testPut() { return NEVER; }

    @PATCH( PATCH_URL ) testPatch() { return NEVER; }

    @JSONP( JSONP_URL ) testJsonp() { return NEVER; }

    @DELETE( DELETE_URL ) testDelete() { return NEVER; }

    @HEAD( HEAD_URL ) testHead() { return NEVER; }

    @OPTIONS( OPTIONS_URL ) testOptions() { return NEVER; }

    @TRACE( TRACE_URL ) testTrace() { return NEVER; }

    @CONNECT( CONNECT_URL ) testConnect() { return NEVER; }

    @HEAD() testBlank() { return NEVER; }
  }

  beforeEach( () =>
  {
    TestBed.configureTestingModule
    ( {
    imports: [],
    providers: [
        { provide: ApiClient, useFactory: () => new ApiClient() },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
    ]
} );
    httpTestingController = TestBed.inject( HttpTestingController );
  } );

  it( 'should perform GET request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testGet().subscribe( expectSomeTestData );
    const req = httpTestingController.expectOne( GET_URL );
    expect( req.request.method ).toEqual( 'GET' );
    req.flush( someTestData );
  } ) );

  it( 'should perform POST request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testPost().subscribe( expectSomeTestData );
    const req = httpTestingController.expectOne( POST_URL );
    expect( req.request.method ).toEqual( 'POST' );
    req.flush( someTestData );
  } ) );

  it( 'should perform PUT request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testPut().subscribe( expectSomeTestData );
    const req = httpTestingController.expectOne( PUT_URL );
    expect( req.request.method ).toEqual( 'PUT' );
    req.flush( someTestData );
  } ) );

  it( 'should perform PATCH request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testPatch().subscribe( expectSomeTestData );
    const req = httpTestingController.expectOne( PATCH_URL );
    expect( req.request.method ).toEqual( 'PATCH' );
    req.flush( someTestData );
  } ) );

  it( 'should perform JSONP request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testJsonp().subscribe( expectSomeTestData );
    const req = httpTestingController.expectOne( JSONP_URL );
    expect( req.request.method ).toEqual( 'JSONP' );
    req.flush( someTestData );
  } ) );

  it( 'should perform HEAD request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testHead().subscribe();
    const req = httpTestingController.expectOne( HEAD_URL );
    expect( req.request.method ).toEqual( 'HEAD' );
    req.flush( null );
  } ) );

  it( 'should perform DELETE request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testDelete().subscribe();
    const req = httpTestingController.expectOne( DELETE_URL );
    expect( req.request.method ).toEqual( 'DELETE' );
    req.flush( null );
  } ) );

  it( 'should perform OPTIONS request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testOptions().subscribe();
    const req = httpTestingController.expectOne( OPTIONS_URL );
    expect( req.request.method ).toEqual( 'OPTIONS' );
    req.flush( null );
  } ) );

  it( 'should perform TRACE request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testTrace().subscribe();
    const req = httpTestingController.expectOne( TRACE_URL );
    expect( req.request.method ).toEqual( 'TRACE' );
    req.flush( null );
  } ) );

  it( 'should perform CONNECT request', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testConnect().subscribe();
    const req = httpTestingController.expectOne( CONNECT_URL );
    expect( req.request.method ).toEqual( 'CONNECT' );
    req.flush( null );
  } ) );

  it( 'should perform request with no url', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testBlank().subscribe();
    const req = httpTestingController.expectOne( '' );
    expect( req.request.method ).toEqual( 'HEAD' );
    req.flush( null );
  } ) );

  afterEach( () => httpTestingController.verify() );
} );
