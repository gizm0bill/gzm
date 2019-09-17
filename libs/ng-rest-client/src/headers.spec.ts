import { TestBed, inject, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Cache, GET, CacheClear, Headers } from '.';
import { Observable, Subject, of } from 'rxjs';
import { take } from 'rxjs/operators';

fdescribe( 'ng-rest-client', () =>
{
  const
    GET_URL = 'test-get-url',

    someTestData  = [ 'some', 'response' ],
    expectSomeTestData = ( { body }: HttpResponse<any> ) => expect( body ).toBe( someTestData );

  let httpTestingController: HttpTestingController;

  class MockService
  {
    public readonly someSubject = new Subject;
    public readonly someOtherSubject = new Subject;
  }

  @Headers( ( thisArg: ApiClient ) => thisArg.mockService.someSubject.pipe( take( 1 ) ) )
  @Headers
  ( {
    someHeader: () => of( 'some-value' ),
    someOtherHeader: () => 'some-other-value',
    yetAnotherHeader: 'yet-another-value',
  } )
  // ( {
  //   someHeader: ( thisArg: ApiClient ) => thisArg.mockService.someSubject.pipe( take( 1 ) ),
  //   someOtherHeader: ( thisArg: ApiClient ) => thisArg.mockService.someOtherSubject.pipe( take( 1 ) )
  // } )
  class ApiClient extends AbstractApiClient
  {
    constructor
    (
      protected readonly http: HttpClient,
      private readonly mockService: MockService
    ) {
      super( http );
    }
    @GET( GET_URL ) testGet(): Observable<any> { return; }
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

  it( 'should get headers from function', inject( [ ApiClient, MockService ], ( apiClient: ApiClient, mockService: MockService ) =>
  {
    apiClient.testGet();
    mockService.someSubject.next( { someHeader: 'some-other-value' } );
    debugger;
  } ) );

  afterEach( () => httpTestingController.verify() );
} );
