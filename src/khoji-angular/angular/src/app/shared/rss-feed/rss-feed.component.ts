import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RssFeedItem, RssFeedService } from 'app/services/rss-feed.service';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { animate, style, transition, trigger } from '@angular/animations';
import { RootNav, TrackingService, UserActions } from 'app/services/tracking';

@Component({
  selector: 'khoji-rss-feed',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    SkeletonModule,
  ],
  templateUrl: './rss-feed.component.html',
  styleUrls: ['./rss-feed.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.5s ease-in', style({ opacity: 1 }))
      ]),
    ])
  ]
})
export class RssFeedComponent implements OnInit {
  items: RssFeedItem[] = [];
  dummyThumbnail = dummyThumbnail;
  @Input() rssFeedUrl: string;
  @Input() showFeedItems = 1;

  constructor(public rssFeedService: RssFeedService, private trackingService: TrackingService) { }

  async ngOnInit() {
    // this.items = await this.rssFeedService.fetchDummy(this.rssFeedUrl, this.showFeedItems);
    this.items = await this.rssFeedService.fetchFromKBS(this.rssFeedUrl, this.showFeedItems)
    this.items = this.items.map(item => {
      const div = document.createElement('div');
      div.innerHTML = item.description;
      return {
        ...item,
        description: div.textContent || div.innerText || '',
        thumbnail: item.thumbnail || div.querySelector('img')?.src || dummyThumbnail
      };
    });
  }

  trackClick(title: string): void {
    this.trackingService.captureUserAction(UserActions.BlogLinkClicked);
    this.trackingService.captureNavigationStep(RootNav.BlogArticle, {title})
  }
}

const dummyThumbnail = 'assets/images/logo.svg'
