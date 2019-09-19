import { TestBed, inject } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, GET, Headers, Header, Wtv } from '.';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { take, skip } from 'rxjs/operators';

fdescribe( 'ng-rest-client', () =>
{
  const
    GET_URL = 'test-get-url'
    ;

  let httpTestingController: HttpTestingController;

  class MockService
  {
    public readonly someSubject = new BehaviorSubject( {} );
    public readonly someOtherSubject = new BehaviorSubject( {} );
  }

  @Wtv( 'class decorator' )
  class ApiClient extends AbstractApiClient
  {
    constructor
    (
      protected readonly http: HttpClient,
    ) { super( http ); }

    @Wtv( 'property decorator' )
    testHeader = 1;

    @GET( GET_URL )
    @Wtv( 'method decorator' )
    testGet( @Wtv( 'param decorator' ) wtv?: string ): Observable<any> { return; }
  }

  beforeEach( () =>
  {
    TestBed.configureTestingModule
    ( {
      imports: [ HttpClientTestingModule ],
      providers:
      [
        MockService,
        { provide: ApiClient, useFactory: () => new ApiClient( TestBed.get( HttpClient ) ) },
      ]
    } );
    httpTestingController = TestBed.get( HttpTestingController );
  } );

  it( 'wtv', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {

  } ) );

  afterEach( () => httpTestingController.verify() );
} );
