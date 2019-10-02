import { TestBed, inject } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, Headers, Header, HEAD } from '.';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { take } from 'rxjs/operators';

fdescribe( 'Headers', () =>
{
  const
    SOME_URL = 'some-url',
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
    VALUE_FOR_METHOD_3 = 'yet-another-header-for-method',
    NAME_PROPERTY_1 = 'someHeaderProperty',
    VALUE_PROPERTY_1 = 'some-header-property',
    NAME_PROPERTY_2 = 'someOtherHeaderProperty',
    NAME_PARAMETER_1 = 'someHeaderParameter',
    VALUE_PARAMETER_1 = 'some-header-parameter',
    VALUE_PARAMETER_11 = 'some-header-parameter-1',
    NAME_PARAMETER_2 = 'someOtherHeaderParameter',
    VALUE_PARAMETER_2 = 'some-other-header-parameter',
    VALUE_RANDOM_1 = 'some-value',
    VALUE_RANDOM_2 = 'some-other-value';
  let httpTestingController: HttpTestingController;

  class MockService
  {
    public readonly someSubject = new BehaviorSubject( {} );
    public readonly someOtherSubject = new BehaviorSubject( {} );
    public readonly singleValueSubject = new BehaviorSubject( {} );
  }

  // class-wide Header value from function at runtime for current method
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
      public readonly mockService: MockService
    ) { super( http ); }

    @Header() // Header value from simple class property
    [ NAME_PROPERTY_1 ] = [ VALUE_PROPERTY_1 ];

    @Header() // Header value from Observable class property
    [ NAME_PROPERTY_2 ] = this.mockService.singleValueSubject.pipe( take( 1 ) );

    @HEAD( SOME_URL )
    // Header value from function at runtime for current method
    @Headers( ( thisArg: ApiClient ) => thisArg.mockService.someOtherSubject.pipe( take( 1 ) ) )
    @Headers
    ( {
      [ NAME_FOR_METHOD_1 ]: () => of( VALUE_FOR_METHOD_1 ),
      [ NAME_FOR_METHOD_2 ]: () => VALUE_FOR_METHOD_2,
      [ NAME_FOR_METHOD_3 ]: VALUE_FOR_METHOD_3,
    } )
    testGet( @Header( NAME_PARAMETER_1 ) h1?: string, @Header( NAME_PARAMETER_1 ) h11?: string, @Header( NAME_PARAMETER_2 ) h2?: string ): Observable<any> { return; }
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
    mockService.singleValueSubject.next( [ VALUE_RANDOM_1, VALUE_RANDOM_2 ] );
    apiClient.testGet( VALUE_PARAMETER_1, VALUE_PARAMETER_11, VALUE_PARAMETER_2 ).subscribe();

    const request1 = httpTestingController.expectOne( ( { headers } ) =>
    {
      const
        expectHasHeaders = headers.has( NAME_CLASS_WIDE_1 )
          && headers.has( NAME_CLASS_WIDE_2 )
          && headers.has( NAME_CLASS_WIDE_3 ),
        classWideHeaders1 = headers.getAll( NAME_CLASS_WIDE_1 ),
        classWideHeaders2 = headers.getAll( NAME_CLASS_WIDE_2 ),
        classWideHeaders3 = headers.getAll( NAME_CLASS_WIDE_3 ),
        propertyHeaders1 = headers.getAll( NAME_PROPERTY_1 ),
        propertyHeaders2 = headers.getAll( NAME_PROPERTY_2 ),
        parameterHeaders1 = headers.getAll( NAME_PARAMETER_1 ),
        parameterHeaders2 = headers.getAll( NAME_PARAMETER_2 ),
        expectHeaders1 = classWideHeaders1.includes( VALUE_CLASS_WIDE_1 ) && classWideHeaders1.includes( VALUE_CLASS_WIDE_2 ),
        expectHeaders2 = classWideHeaders2.includes( VALUE_CLASS_WIDE_2 ) && classWideHeaders2.includes( VALUE_CLASS_WIDE_3 ),
        expectHeaders3 = classWideHeaders3.includes( VALUE_CLASS_WIDE_3 ),
        expectHeaders4 = propertyHeaders1.includes( VALUE_PROPERTY_1 ),
        expectHeaders5 = propertyHeaders2.includes( VALUE_RANDOM_1 ) && propertyHeaders2.includes( VALUE_RANDOM_2 ),
        expectHeaders6 = parameterHeaders1.includes( VALUE_PARAMETER_1 ) && parameterHeaders1.includes( VALUE_PARAMETER_11 ) && parameterHeaders2.includes( VALUE_PARAMETER_2 );
      return expectHasHeaders && expectHeaders1 && expectHeaders2 && expectHeaders3 && expectHeaders4 && expectHeaders5 && expectHeaders6;
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
    const request2 = httpTestingController.expectOne( ( { headers } ) =>
    {
      const
        expectHasHeaders = headers.has( NAME_FOR_METHOD_1 )
          && headers.has( NAME_FOR_METHOD_2 )
          && headers.has( NAME_FOR_METHOD_3 ),
        allHeaders1 = headers.getAll( NAME_FOR_METHOD_1 ),
        allHeaders2 = headers.getAll( NAME_FOR_METHOD_2 ),
        allHeaders3 = headers.getAll( NAME_FOR_METHOD_3 ),
        allHeaders4 = headers.getAll( NAME_CLASS_WIDE_2 ),
        allHeaders5 = headers.getAll( NAME_CLASS_WIDE_3 ),
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
