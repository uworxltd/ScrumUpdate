/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { TestBed, getTestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpService } from './http.service';
import { Router, ActivatedRoute, convertToParamMap } from '@angular/router';
import { Store } from '@ngrx/store';
import { MessageService } from 'primeng/api';
import { Actions } from '@ngrx/effects';
import { API_URL } from 'app/shared/helper-functions';

//TODO: add all the old test in given  when and then format
describe('HttpService', function () {
    let injector: TestBed;
    let httpService: HttpService;
    let httpMock: HttpTestingController;
    let params: any;
    let endpoint = "/indicator/team";
    let dummyResponse: any;
    let store: any = {};

    function givenDependanciesAreMocked() {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [HttpService,
                { provide: Store, useValue: store },
                { provide: Router, useValue: { url: '' } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ username: 'test' }) } } },
                { provide: MessageService, useValue: { add: jest.fn() } },
                { provide: Actions, useValue: { pipe: jest.fn() } }
            ]
        });

        injector = getTestBed();
        httpService = injector.get(HttpService);
        httpMock = injector.get(HttpTestingController);
    }

    describe('http Request', () => {
        it('should return an Observable<[]>', () => {
            givenParamsAreMocked();
            givenDependanciesAreMocked();
            httpService.apiPostRequest(endpoint, params, false).subscribe(data => {
                expect(data).toEqual(dummyResponse);
            });
            const req = httpMock.expectOne(API_URL + endpoint);
            expect(req.request.method).toBe("POST");
        });
        it('should return an Observable for get request', () => {
            givenParamsAreMocked();
            givenDependanciesAreMocked();
            httpService.apiGetRequest(endpoint).subscribe(data => {
                expect(data).toEqual(dummyResponse);
            });
            const req = httpMock.expectOne(API_URL + endpoint);
            expect(req.request.method).toBe("GET");
        });
        it('should return an Observable for getRequestWithUrl', () => {
            givenParamsAreMocked();
            givenDependanciesAreMocked();
            httpService.loadKhojiConfigs();
            httpService.apiGetRequest(endpoint).subscribe(data => {
                expect(data).toEqual(dummyResponse);
            });
            const req = httpMock.expectOne(API_URL + endpoint);
            expect(req.request.method).toBe("GET");
        });
        it('should return an Observable for postRequestWithOutHeaders', () => {
            givenParamsAreMocked();
            givenDependanciesAreMocked();
            httpService.postRequestWithOutHeaders(endpoint, null).subscribe(data => {
                expect(data).toEqual(dummyResponse);
            });
            const req = httpMock.expectOne(API_URL + endpoint);
            expect(req.request.method).toBe("POST");
        });
    });

    function givenParamsAreMocked() {
        params = {};
        dummyResponse = [
            { Name: 'John' },
            { Name: 'Doe' }
        ];
    }
});
