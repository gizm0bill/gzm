import { TestBed, inject } from '@angular/core/testing';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AbstractApiClient, GET, Headers, Header } from '.';
import { Observable } from 'rxjs';

describe( 'ng-rest-client', () =>
{
  const
    GET_URL = 'test-get-url',
    HEADER_CLASS_NAME  = 'test-class-header-name',
    HEADER_CLASS_VALUE  = 'test-class-header-value',
    HEADER_METHOD_NAME = 'test-method-header-name',
    HEADER_METHOD_VALUE = 'test-method-header-value',
    HEADER_PARAM_NAME = 'test-param-header-name',
    HEADER_PARAM_VALUE = 'test-param-header-value',
    someTestData  = [ 'some', 'response' ],
    expectSomeTestData = ( { body }: HttpResponse<any> ) => expect( body ).toBe( someTestData )
    ;
  let httpTestingController: HttpTestingController;

  @Headers( { [HEADER_CLASS_NAME]: HEADER_CLASS_VALUE } )
  class ApiClient extends AbstractApiClient
  {
    @GET( GET_URL )
    @Headers( { [HEADER_METHOD_NAME]: HEADER_METHOD_VALUE } )
    testHeaders( @Header( HEADER_PARAM_NAME ) someHeader: string ): Observable<any> { return; }
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

  it( 'should add headers', inject( [ ApiClient ], ( apiClient: ApiClient ) =>
  {
    apiClient.testHeaders( HEADER_PARAM_VALUE ).subscribe();
    const request = httpTestingController.expectOne( ( { headers } ) =>
      headers.get( HEADER_METHOD_NAME ) === HEADER_METHOD_VALUE
      && headers.get( HEADER_CLASS_NAME ) === HEADER_CLASS_VALUE
      && headers.get( HEADER_PARAM_NAME ) === HEADER_PARAM_VALUE );
    request.flush( null );
  } ) );

  afterEach( () => httpTestingController.verify() );
} );
