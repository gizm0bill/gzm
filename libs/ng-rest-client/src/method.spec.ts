import { TestBed, inject } from '@angular/core/testing';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, GET, POST, PUT, DELETE, HEAD, PATCH, JSONP, OPTIONS } from '.';
import { Observable } from 'rxjs';

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
    JSONP_URL = 'test-options-url',

    someTestData  = [ 'some', 'response' ],
    expectSomeTestData = ( { body }: HttpResponse<any> ) => expect( body ).toBe( someTestData );

  let httpTestingController: HttpTestingController;

  class ApiClient extends AbstractApiClient
  {
    @GET( GET_URL ) testGet(): Observable<any> { return; }

    @POST( POST_URL ) testPost(): Observable<any> { return; }

    @PUT( PUT_URL ) testPut(): Observable<any> { return; }

    @PATCH( PATCH_URL ) testPatch(): Observable<any> { return; }

    @JSONP( JSONP_URL ) testJsonp(): Observable<any> { return; }

    @DELETE( DELETE_URL ) testDelete(): Observable<any> { return; }

    @HEAD( HEAD_URL ) testHead(): Observable<any> { return; }

    @OPTIONS( OPTIONS_URL ) testOptions(): Observable<any> { return; }
  }

  beforeEach( () =>
  {
    TestBed.configureTestingModule
    ( {
      imports: [ HttpClientTestingModule ],
      providers:
      [
        { provide: ApiClient, useFactory: () => new ApiClient() },
      ]
    } );
    httpTestingController = TestBed.get( HttpTestingController );
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

  afterEach( () => httpTestingController.verify() );
} );
