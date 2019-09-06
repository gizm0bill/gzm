import { TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Cache, GET } from '.';
import { Observable } from 'rxjs';

describe( 'ng-rest-client', () =>
{
  const
    GET_CACHE_URL = 'test-get-cache-url',
    CACHE_UNTIL = 100,
    CACHE_TIMES = 3,

    someTestData  = [ 'some', 'response' ],
    expectSomeTestData = ( { body }: HttpResponse<any> ) => expect( body ).toBe( someTestData );
    ;
  let httpTestingController: HttpTestingController;

  class ApiClient extends AbstractApiClient
  {
    @GET( GET_CACHE_URL ) @Cache( CACHE_UNTIL )
    testCacheUntil(): Observable<any> { return; }
    clearCacheTestCacheUntil() { return this; }

    @GET( GET_CACHE_URL ) @Cache( `${CACHE_TIMES}times` )
    testCacheTimes(): Observable<any> { return; }
    clearCacheTestCacheTimes() { return this; }
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

  it( 'should cache for the specified amount of time', fakeAsync( inject( [ApiClient], ( apiClient: ApiClient ) =>
  {
    // should use cache
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    tick( CACHE_UNTIL - 1 );
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    const requests1 = httpTestingController.match( GET_CACHE_URL );
    expect( requests1.length ).toEqual( 1 );
    requests1[0].flush( someTestData );
    // should reset cache
    tick( 1 );
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    tick( CACHE_UNTIL );
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    const requests2 = httpTestingController.match( GET_CACHE_URL );
    expect( requests2.length ).toEqual( 2 );
    requests2[0].flush( someTestData );
  } ) ) );

  it( 'should cache for the specified number of times', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    // test 3 requests to be cached
    for ( const i of [ , , ] ) apiClient.testCacheTimes().subscribe( expectSomeTestData );
    const requests1 = httpTestingController.match( GET_CACHE_URL );
    expect( requests1.length ).toEqual( 1 );
    requests1[0].flush( someTestData );
    // test that the next one to be a new request
    apiClient.testCacheTimes().subscribe( expectSomeTestData );
    const requests2 = httpTestingController.match( GET_CACHE_URL );
    expect( requests2.length ).toEqual( 1 );
    requests2[0].flush( someTestData );
  } ) );

  it( 'should clear cache imperatively', fakeAsync( inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    tick( CACHE_UNTIL / 2 );
    // trigger a cache clear
    apiClient.clearCacheTestCacheUntil().testCacheUntil().subscribe( expectSomeTestData );
    const requests = httpTestingController.match( GET_CACHE_URL );
    expect( requests.length ).toEqual( 2 );
    requests.forEach( request => request.flush( someTestData ) );
    // and start caching again
    tick( CACHE_UNTIL / 2 );
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    const requests2 = httpTestingController.match( GET_CACHE_URL );
    expect( requests2.length ).toEqual( 0 );
  } ) ) );

  afterEach( () => httpTestingController.verify() );
} );
