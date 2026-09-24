import { Injectable } from '@angular/core';
import { HttpService } from './common/http.service';
import { catchError, takeUntil } from 'rxjs/operators';
import { of } from 'rxjs';
import { Actions, ofType } from '@ngrx/effects';
import { discardSentCallsAfterNavigate } from 'app/states/app.actions';
import { Action } from '@ngrx/store';

export interface RssFeedItem {
	title: string;
	link: string;
	description: string;
	pubDate: string;
	thumbnail: string;
}

@Injectable({
	providedIn: 'root'
})
export class RssFeedService {
	response: RssFeedItem[] = [];
	loading = false;
	constructor(private http: HttpService, private actions$: Actions) { }

	async fetch(url: string, length = 0) {
		try {
			const response = await fetch(url, { mode: 'no-cors' });
			const xml = await response.text();
			const parser = new DOMParser();
			const xmlDocument = parser.parseFromString(xml, 'text/xml');
			const items = xmlDocument.querySelectorAll('item');
			const feed: RssFeedItem[] = [];

			items.forEach((item) => {
				if (length > 0 && feed.length >= length) {
					return;
				}

				const title = item.querySelector('title').textContent;
				const link = item.querySelector('link').textContent;
				const description = item.querySelector('description').textContent;
				const pubDate = item.querySelector('pubDate').textContent;
				const thumbnail = item.querySelector('thumbmail').getAttribute('url');
				feed.push({ title, link, description, pubDate, thumbnail });
			});

			return feed;
		}
		catch (error) {
			console.error('Failed to fetch RSS feed:', error);
			return [];
		}
	}

	async fetchFromKBS(url: string, length = 0) {
		if(this.response.length > 0) {
			return Promise.resolve(this.response.slice(0, length > 0 ? length : this.response.length));
		}

		this.loading = true;
		return new Promise<RssFeedItem[]>((res, rej) => {
			this.http.apiGetRequest<RssFeedItem[]>(url)
				.pipe(
          takeUntil(
            this.actions$.pipe(
              ofType(
                discardSentCallsAfterNavigate
              )
            )
          ),
          catchError(error => {
					this.loading = false;
					console.error('Failed to fetch RSS feed:', error);
					rej(error);
					return of<RssFeedItem[]>([]);
				})
      )
				.subscribe((response) => {
					this.loading = false;
					this.response = response;
					res(response.slice(0, length > 0 ? length : response.length));
      });
    });
  }

	// using mock data to simulate fetching the RSS feed
	async fetchDummy(dummyUrl: string, length = 0) {
	this.loading = true;
	return new Promise<RssFeedItem[]>((resolve) => {
		setTimeout(() => {
			this.loading = false;
			resolve(dummyFeed.slice(0, length > 0 ? length : dummyFeed.length));
		}, 1000);
	});
}
}

const dummyFeed = [
	{
		title: 'Sample RSS Feed Item 1',
		link: 'https://example.com/rss-feed-item-1',
		description: 'This is the description for RSS feed item 1.',
		pubDate: '2024-08-21 05:40:28',
		thumbnail: ''
	},
	{
		title: 'RSS Feed Item 2',
		link: 'https://example.com/rss-feed-item-2',
		description: 'This is the description for RSS feed item 2.',
		pubDate: '2021-01-02T00:00:00Z',
		thumbnail: ''
	},
	{
		title: 'RSS Feed Item 3',
		link: 'https://example.com/rss-feed-item-3',
		description: 'This is the description for RSS feed item 3.',
		pubDate: '2021-01-03T00:00:00Z',
		thumbnail: ''
	}
];
