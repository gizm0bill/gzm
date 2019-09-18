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

    NAME_CLASS_WIDE_1 = 'someHeaderClassWide',
    VALUE_CLASS_WIDE_1 = 'some-value-class-wide',
    NAME_CLASS_WIDE_2 = 'someOtherHeaderClassWide',
    VALUE_CLASS_WIDE_2 = 'some-other-value-class-wide',
    NAME_CLASS_WIDE_3 = 'yetAnotherHeaderClassWide',
    VALUE_CLASS_WIDE_3 = 'yet-another-value-class-wide',
    NAME_FOR_METHOD_1 = 'someHeaderForMethod',
    VALUE_FOR_METHOD_1 = 'some-header-for-method',
    NAME_FOR_METHOD_3 = 'someOtherHeaderForMethod',
    VALUE_FOR_METHOD_2 = 'some-other-header-for-method',
    NAME_FOR_METHOD_2 = 'yetAnotherHeaderForMethod',
    VALUE_FOR_METHOD_3 = 'yet-another-header-for-method'
    ;

  let httpTestingController: HttpTestingController;

  class MockService
  {
    public readonly someSubject = new Subject;
    public readonly someOtherSubject = new Subject;
  }

  @Headers( ( thisArg: ApiClient ) => thisArg.mockService.someSubject.pipe( take( 1 ) ) )
  @Headers
  ( {
    [ NAME_CLASS_WIDE_1 ]: () => of( VALUE_CLASS_WIDE_1 ),
    [ NAME_CLASS_WIDE_2 ]: () => VALUE_CLASS_WIDE_2,
    [ NAME_CLASS_WIDE_3 ]: VALUE_CLASS_WIDE_3,
  } )
  class ApiClient extends AbstractApiClient
  {
    constructor
    (
      protected readonly http: HttpClient,
      private readonly mockService: MockService
    ) {
      super( http );
    }
    @GET( GET_URL )
    @Headers
    ( {
      [ NAME_FOR_METHOD_1 ]: () => of( VALUE_FOR_METHOD_1 ),
      [ NAME_FOR_METHOD_2 ]: () => VALUE_FOR_METHOD_2,
      [ NAME_FOR_METHOD_3 ]: VALUE_FOR_METHOD_3,
    } )
    testGet(): Observable<any> { return; }
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
    apiClient.testGet().subscribe( _ => { debugger; } );
    mockService.someSubject.next
    ( {
      [ NAME_CLASS_WIDE_1 ]: VALUE_CLASS_WIDE_2,
      [ NAME_CLASS_WIDE_2 ]: VALUE_CLASS_WIDE_3
    } );
    httpTestingController.expectOne( req =>
    {
      const
        expectHasHeaders = req.headers.has( NAME_CLASS_WIDE_1 )
          && req.headers.has( NAME_CLASS_WIDE_2 )
          && req.headers.has( NAME_CLASS_WIDE_3 ),
        allHeaders1 = req.headers.getAll( NAME_CLASS_WIDE_1 ),
        allHeaders2 = req.headers.getAll( NAME_CLASS_WIDE_2 ),
        allHeaders3 = req.headers.getAll( NAME_CLASS_WIDE_3 ),
        expectHeaders1 = allHeaders1.includes( VALUE_CLASS_WIDE_1 ) && allHeaders1.includes( VALUE_CLASS_WIDE_2 ),
        expectHeaders2 = allHeaders2.includes( VALUE_CLASS_WIDE_2 ) && allHeaders2.includes( VALUE_CLASS_WIDE_3 ),
        expectHeaders3 = allHeaders3.includes( VALUE_CLASS_WIDE_3 );
      return expectHasHeaders && expectHeaders1 && expectHeaders2 && expectHeaders3;
    } );
  } ) );

  afterEach( () => httpTestingController.verify() );
} );
