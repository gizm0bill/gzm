import { TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Cache, GET, CacheClear } from '.';
import { Observable } from 'rxjs';

describe( 'Cache', () =>
{
  const
    CACHE_URL_UNTIL = 'test-get-cache-url-until',
    CACHE_URL_TIMES = 'test-get-cache-url-times',
    CACHE_UNTIL = 100,
    CACHE_TIMES = 3,

    someTestData  = [ 'some', 'response' ],
    expectSomeTestData = ( { body }: HttpResponse<any> ) => expect( body ).toBe( someTestData );

  let httpTestingController: HttpTestingController;

  class ApiClient extends AbstractApiClient
  {
    @GET( CACHE_URL_UNTIL ) @Cache( CACHE_UNTIL )
    testCacheUntil(): Observable<any> { return; }

    @CacheClear<ApiClient>( 'testCacheUntil' )
    clearCacheTestCacheUntil() { return this; }

    @GET( CACHE_URL_TIMES ) @Cache( `${CACHE_TIMES}times` )
    testCacheTimes(): Observable<any> { return; }

    @CacheClear<ApiClient>( 'testCacheTimes' )
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
    const requests1 = httpTestingController.match( CACHE_URL_UNTIL );
    expect( requests1.length ).toEqual( 1 );
    requests1[0].flush( someTestData );
    // should reset cache
    tick( 1 );
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    tick( CACHE_UNTIL );
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    const requests2 = httpTestingController.match( CACHE_URL_UNTIL );
    expect( requests2.length ).toEqual( 2 );
    requests2[0].flush( someTestData );
    tick( CACHE_UNTIL );
  } ) ) );

  it( 'should cache for the specified number of times', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    // test 3 requests to be cached
    for ( const i of [ , , ] ) apiClient.testCacheTimes().subscribe( expectSomeTestData );
    const requests1 = httpTestingController.match( CACHE_URL_TIMES );
    expect( requests1.length ).toEqual( 1 );
    requests1[0].flush( someTestData );
    // test that the next one to be a new request
    apiClient.testCacheTimes().subscribe( expectSomeTestData );
    const requests2 = httpTestingController.match( CACHE_URL_TIMES );
    expect( requests2.length ).toEqual( 1 );
    requests2[0].flush( someTestData );
  } ) );

  it( 'should clear cache imperatively', fakeAsync( inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    tick( CACHE_UNTIL * 1000 ); // pass some time because of the previous tests messing with the clock
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    const request = httpTestingController.expectOne( CACHE_URL_UNTIL );
    request.flush( someTestData );
    tick( CACHE_UNTIL / 2 );
    // trigger a cache clear
    apiClient.clearCacheTestCacheUntil().testCacheUntil().subscribe( expectSomeTestData );
    const request2 = httpTestingController.expectOne( CACHE_URL_UNTIL );
    request2.flush( someTestData );
    // and start caching again
    tick( CACHE_UNTIL / 2 );
    apiClient.testCacheUntil().subscribe( expectSomeTestData );
    const requests3 = httpTestingController.match( CACHE_URL_UNTIL );
    expect( requests3.length ).toEqual( 0 );
  } ) ) );


  afterEach( () => httpTestingController.verify() );
} );
