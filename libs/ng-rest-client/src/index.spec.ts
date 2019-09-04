import { TestBed, inject } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Cache, GET } from '.';
import { Observable } from 'rxjs';

describe( 'ng-rest-client', () =>
{
  const
    GET_CACHE_URL = 'test-get-cache-url'

    ;
  let httpTestingController: HttpTestingController;

  class ApiClient extends AbstractApiClient
  {
    @GET( GET_CACHE_URL ) @Cache(121)
    testCache(): Observable<any> { return; }
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

  it( 'should cache', inject( [ApiClient], ( apiClient: ApiClient ) =>
  {
    apiClient.testCache().subscribe();

    const req = httpTestingController.expectOne( GET_CACHE_URL );

    req.flush( { wtf: 'ever' }, { status: 404, statusText: '' } );
    httpTestingController.verify();
    debugger;
  } ) );

  afterEach( () => httpTestingController.verify() );
} );
