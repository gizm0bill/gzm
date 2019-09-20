import { TestBed, inject } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, GET, Headers, Header } from '.';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { take, skip } from 'rxjs/operators';

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
    NAME_FOR_METHOD_2 = 'someOtherHeaderForMethod',
    VALUE_FOR_METHOD_2 = 'some-other-header-for-method',
    NAME_FOR_METHOD_3 = 'yetAnotherHeaderForMethod',
    VALUE_FOR_METHOD_3 = 'yet-another-header-for-method';

  let httpTestingController: HttpTestingController;

  class MockService
  {
    public readonly someSubject = new BehaviorSubject( {} );
    public readonly someOtherSubject = new BehaviorSubject( {} );
    public readonly singleValueSubject = new BehaviorSubject( {} );
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
    testProp = Math.random();
    constructor
    (
      protected readonly http: HttpClient,
      public readonly mockService: MockService
    ) { super( http ); }

    @Header()
    propertyHeader = this.mockService.singleValueSubject.pipe( take( 1 ) );
    @Header()
    anotherPropertyHeader = '1';

    @GET( GET_URL )
    @Headers( ( thisArg: ApiClient ) => thisArg.mockService.someOtherSubject.pipe( take( 1 ) ) )
    @Headers
    ( {
      [ NAME_FOR_METHOD_1 ]: () => of( VALUE_FOR_METHOD_1 ),
      [ NAME_FOR_METHOD_2 ]: () => VALUE_FOR_METHOD_2,
      [ NAME_FOR_METHOD_3 ]: VALUE_FOR_METHOD_3,
    } )
    testGet( @Header( 'param' ) someHeaderForMethod?: string ): Observable<any> { return; }
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

  it( 'should get headers from all forms of definition', inject( [ ApiClient, MockService ], ( apiClient: ApiClient, mockService: MockService ) =>
  {
    mockService.someSubject.next
    ( {
      [ NAME_CLASS_WIDE_1 ]: VALUE_CLASS_WIDE_2,
      [ NAME_CLASS_WIDE_2 ]: VALUE_CLASS_WIDE_3
    } );
    mockService.singleValueSubject.next( ['some-value', 'some-other-value'] );
    apiClient.testGet().subscribe();

    const request1 = httpTestingController.expectOne( req =>
    {
      debugger;
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
    request1.flush( {} );

    mockService.someSubject.next
    ( {
      [ NAME_CLASS_WIDE_2 ]: VALUE_CLASS_WIDE_1,
      [ NAME_CLASS_WIDE_3 ]: VALUE_CLASS_WIDE_2,
    } );
    mockService.someOtherSubject.next
    ( {
      [ NAME_FOR_METHOD_1 ]: VALUE_FOR_METHOD_2,
      [ NAME_FOR_METHOD_2 ]: VALUE_FOR_METHOD_3,
    } );
    apiClient.testGet().subscribe();
    const request2 = httpTestingController.expectOne( req =>
    {
      const
        expectHasHeaders = req.headers.has( NAME_FOR_METHOD_1 )
          && req.headers.has( NAME_FOR_METHOD_2 )
          && req.headers.has( NAME_FOR_METHOD_3 ),
        allHeaders1 = req.headers.getAll( NAME_FOR_METHOD_1 ),
        allHeaders2 = req.headers.getAll( NAME_FOR_METHOD_2 ),
        allHeaders3 = req.headers.getAll( NAME_FOR_METHOD_3 ),
        allHeaders4 = req.headers.getAll( NAME_CLASS_WIDE_2 ),
        allHeaders5 = req.headers.getAll( NAME_CLASS_WIDE_3 ),
        expectHeaders1 = allHeaders1.includes( VALUE_FOR_METHOD_1 ) && allHeaders1.includes( VALUE_FOR_METHOD_2 ),
        expectHeaders2 = allHeaders2.includes( VALUE_FOR_METHOD_2 ) && allHeaders2.includes( VALUE_FOR_METHOD_3 ),
        expectHeaders3 = allHeaders3.includes( VALUE_FOR_METHOD_3 ),
        expectHeaders4 = allHeaders4.includes( VALUE_CLASS_WIDE_1 ) && allHeaders4.includes( VALUE_CLASS_WIDE_2 ),
        expectHeaders5 = allHeaders5.includes( VALUE_CLASS_WIDE_3 ) && allHeaders5.includes( VALUE_CLASS_WIDE_2 );
      return expectHasHeaders && expectHeaders1 && expectHeaders2 && expectHeaders3 && expectHeaders4 && expectHeaders5;
    } );
    request2.flush( {} );

  } ) );

  afterEach( () => httpTestingController.verify() );
} );
