import { TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { AbstractRESTClient, Cache, GET, CacheClear } from '.';
import { Observable } from 'rxjs';
import { Query } from './query';
import { tap } from 'rxjs/operators';

describe( 'Cache', () =>
{
  const
    CACHE_URL_UNTIL = 'test-get-cache-url-until',
    CACHE_URL_TIMES = 'test-get-cache-url-times',
    CACHE_URL_FUNCTION = 'test-get-cache-url-function',
    CACHE_UNTIL = 100,
    CACHE_TIMES = 2,
    CACHE_FUNCTION_TIMES = 3,

    someTestData  = [ 'some', 'response' ],
    expectSomeTestData = ( { body }: HttpResponse<any> ) => expect( body ).toBe( someTestData );

  let httpTestingController: HttpTestingController;

  class ApiClient extends AbstractRESTClient
  {
    @GET( CACHE_URL_UNTIL ) @Cache( CACHE_UNTIL )
    testCacheUntil( @Query( 'some-arg' ) someArg: any ): Observable<any> { return; }

    @CacheClear<ApiClient>( 'testCacheUntil' )
    clearCacheTestCacheUntil() { return this; }

    @GET( CACHE_URL_TIMES ) @Cache( `${CACHE_TIMES}times` )
    testCacheTimes(): Observable<any> { return; }

    @CacheClear<ApiClient>( 'testCacheTimes' )
    clearCacheTestCacheTimes() { return this; }

    #testCacheFunctionCounter = 0;
    shouldClearCacheTestCacheFunction() { return !( this.#testCacheFunctionCounter % CACHE_FUNCTION_TIMES ); }

    @GET( CACHE_URL_FUNCTION ) @Cache( ( thisArg: ApiClient ) => thisArg.shouldClearCacheTestCacheFunction() )
    _testCacheFunction(): Observable<any> { return; }
    testCacheFunction(): Observable<any> {
      return this._testCacheFunction().pipe( tap( () => this.#testCacheFunctionCounter++ ) );
    }
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
    httpTestingController = TestBed.inject( HttpTestingController );
  } );

  it( 'should cache for the specified amount of time', fakeAsync( inject( [ApiClient], ( apiClient: ApiClient ) =>
  {
    // should use cache
    apiClient.testCacheUntil( 1 ).subscribe( expectSomeTestData );
    tick( CACHE_UNTIL - 1 );
    apiClient.testCacheUntil( 1 ).subscribe( expectSomeTestData );
    const requests1 = httpTestingController.match( `${CACHE_URL_UNTIL}?some-arg=1` );
    expect( requests1.length ).toEqual( 1 );
    requests1[0].flush( someTestData );
    // should reset cache
    tick( 1 );
    apiClient.testCacheUntil( 1 ).subscribe( expectSomeTestData );
    tick( CACHE_UNTIL );
    apiClient.testCacheUntil( 1 ).subscribe( expectSomeTestData );
    const requests2 = httpTestingController.match( `${CACHE_URL_UNTIL}?some-arg=1` );
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

    let subsequentRequest: TestRequest[];
    for ( let i = 0; i < CACHE_TIMES - 1; i++ ) {
      apiClient.testCacheTimes().subscribe( expectSomeTestData );
      subsequentRequest = httpTestingController.match( CACHE_URL_TIMES );
      expect( subsequentRequest.length ).toBe( 0 );
    }
    // test that the next one to be a new request

    apiClient.testCacheTimes().subscribe( expectSomeTestData );
    const requests3 = httpTestingController.match( CACHE_URL_TIMES );
    expect( requests3.length ).toEqual( 1 );
    requests3[0].flush( someTestData );
  } ) );

  it( 'should cache by function', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    // test more requests to be cached because tap function is called after the request is completed
    for ( let i = 0; i < CACHE_FUNCTION_TIMES + 1; i++ ) apiClient.testCacheFunction().subscribe( expectSomeTestData );
    const requests1 = httpTestingController.match( CACHE_URL_FUNCTION );
    expect( requests1.length ).toEqual( 1 );
    requests1[0].flush( someTestData );

    // now test next requests not to be cached because cache test should be false
    apiClient.testCacheFunction().subscribe( expectSomeTestData );
    const request2 = httpTestingController.match( CACHE_URL_FUNCTION );
    expect( request2.length ).toBe( 1 );
    request2[0].flush( someTestData );

    apiClient.testCacheFunction().subscribe( expectSomeTestData );
    const request3 = httpTestingController.match( CACHE_URL_FUNCTION );
    expect( request3.length ).toBe( 1 );
    request3[0].flush( someTestData );

    // finally cached
    apiClient.testCacheFunction().subscribe( expectSomeTestData );
    const request4 = httpTestingController.match( CACHE_URL_FUNCTION );
    expect( request4.length ).toBe( 0 );

  } ) );

  it( 'should clear cache imperatively', fakeAsync( inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    tick( CACHE_UNTIL * 1000 ); // pass some time because of the previous tests messing with the clock
    apiClient.testCacheUntil( 1 ).subscribe( expectSomeTestData );
    const request = httpTestingController.expectOne( `${CACHE_URL_UNTIL}?some-arg=1` );
    request.flush( someTestData );
    tick( CACHE_UNTIL / 2 );
    // trigger a cache clear
    apiClient.clearCacheTestCacheUntil().testCacheUntil( 1 ).subscribe( expectSomeTestData );
    const request2 = httpTestingController.expectOne( `${CACHE_URL_UNTIL}?some-arg=1` );
    request2.flush( someTestData );
    // and start caching again
    tick( CACHE_UNTIL / 2 );
    apiClient.testCacheUntil( 1 ).subscribe( expectSomeTestData );
    const requests3 = httpTestingController.match( `${CACHE_URL_UNTIL}?some-arg=1` );
    expect( requests3.length ).toEqual( 0 );
  } ) ) );


  afterEach( () => httpTestingController.verify() );
} );
