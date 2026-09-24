/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { ChangeDetectorRef, Component, HostBinding, Input, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MenuService } from './app.menu.service';
import { LayoutService } from './service/app.layout.service';
import { getComponentConfigs } from 'app/states/global-configs.selector';
import { AppState } from 'app/states/app-states';
import { Store } from '@ngrx/store';
import { KhojiComponent } from 'app/interface/khoji-component.interface';
import { isComponentEnabled, pascalCaseDelimetedWord } from 'app/shared/helper-functions';
import { Constants } from 'app/constants';
import { TrackingService } from 'app/services/tracking/';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: '[app-menuitem]',
    template: `
		<ng-container>
            <div *ngIf="root && item.visible !== false" class="layout-menuitem-root-text">{{item.label}}</div>
			<a *ngIf="(!item.routerLink || item.items) && item.visible !== false" [attr.href]="item.url" (click)="itemClick($event)"  (mouseenter)="onMouseEnter()"
			   [ngClass]="item.class" [attr.target]="item.target" tabindex="0" pRipple [pTooltip]="item.label" [tooltipDisabled]="!(isSlim && root && !active)">
				<i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
				<span class="layout-menuitem-text">{{item.label}}</span>
				<i class="pi pi-fw pi-angle-down layout-submenu-toggler" *ngIf="item.items"></i>
			</a>
			<a *ngIf="(item.routerLink && !item.items) && item.visible !== false" (click)="itemClick($event)" (mouseenter)="onMouseEnter()" [ngClass]="item.class" class="{{item.routerLink | slice:1}}"
			   [routerLink]="item.routerLink" routerLinkActive="active-route" [routerLinkActiveOptions]="item.routerLinkActiveOptions||{ paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' }"
               [fragment]="item.fragment" [queryParamsHandling]="item.queryParamsHandling" [preserveFragment]="item.preserveFragment"
               [skipLocationChange]="item.skipLocationChange" [replaceUrl]="item.replaceUrl" [state]="item.state" [queryParams]="item.queryParams"
               [attr.target]="item.target" tabindex="0" pRipple [pTooltip]="item.label" [tooltipDisabled]="!(isSlim && root)">
				<i [ngClass]="item.icon" class="layout-menuitem-icon"></i>
				<span class="layout-menuitem-text">{{item.label}}</span>
				<i class="pi pi-fw pi-angle-down layout-submenu-toggler" *ngIf="item.items"></i>
			</a>

			<ul *ngIf="item.items && item.visible !== false" [@children]="submenuAnimation">
				<ng-template ngFor let-child let-i="index" [ngForOf]="item.items" >
					<li app-menuitem [item]="child" [index]="i" [parentKey]="key" [class]="child.badgeClass" *ngIf="checkMenuData(child)"></li>
				</ng-template>
			</ul>
		</ng-container>
    `,
    animations: [
        trigger('children', [
            state('collapsed', style({
                height: '0'
            })),
            state('expanded', style({
                height: '*'
            })),
            state('hidden', style({
                display: 'none'
            })),
            state('visible', style({
                display: 'block'
            })),
            transition('collapsed <=> expanded', animate('400ms cubic-bezier(0.86, 0, 0.07, 1)'))
        ])
    ]
})
export class AppMenuitemComponent implements OnInit, OnDestroy {

    @Input() item: any;

    @Input() index!: number;

    @Input() @HostBinding('class.layout-root-menuitem') root!: boolean;

    @Input() parentKey!: string;

    active = false;

    menuSourceSubscription: Subscription;

    menuResetSubscription: Subscription;

    key: string = "";

    menuItemsConfigs: KhojiComponent[];
    constants = Constants;

    constructor(public layoutService: LayoutService, private cd: ChangeDetectorRef, public router: Router, private menuService: MenuService, private store: Store<AppState>, private trackingService: TrackingService) {
        this.menuSourceSubscription = this.menuService.menuSource$.subscribe(value => {
            Promise.resolve(null).then(() => {
                if (value.routeEvent) {
                    this.active = (value.key === this.key || value.key.startsWith(this.key + '-')) ? true : false;
                }
                else {
                    if (value.key !== this.key && !value.key.startsWith(this.key + '-')) {
                        this.active = false;
                    }
                }
            });
        });

        this.menuResetSubscription = this.menuService.resetSource$.subscribe(() => {
            this.active = false;
        });

        this.router.events.pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(params => {
                if (this.isSlim || this.isHorizontal) {
                    this.active = false;
                }
                else {
                    if (this.item.routerLink) {
                        this.updateActiveStateFromRoute();
                    }
                }
            });
    }

    ngOnInit() {
        this.menuItemsConfigs = [];
        const componentConfigs$ = this.store.pipe(getComponentConfigs);
        this.menuSourceSubscription.add(componentConfigs$.subscribe(data => {
            this.menuItemsConfigs = data;
        }))

        this.key = this.parentKey ? this.parentKey + '-' + this.index : String(this.index);

        if (!(this.isSlim || this.isHorizontal) && this.item.routerLink) {
            this.updateActiveStateFromRoute();
        }
    }

    updateActiveStateFromRoute() {
        let activeRoute = this.router.isActive(this.item.routerLink[0], { paths: 'exact', queryParams: 'ignored', matrixParams: 'ignored', fragment: 'ignored' });

        if (activeRoute) {
            this.menuService.onMenuStateChange({ key: this.key, routeEvent: true });
        }
    }

    itemClick(event: Event) {
        // avoid processing disabled items
        if (this.item.disabled) {
            event.preventDefault();
            return;
        }

        // navigate with hover
        if (this.root && this.isSlim || this.isHorizontal) {
            this.layoutService.state.menuHoverActive = !this.layoutService.state.menuHoverActive;
        }

        // execute command
        if (this.item.command) {
            this.item.command = (object: any) => {
              this.trackingService.captureNavigationStep(`${this.constants.MENU_CLICK}${pascalCaseDelimetedWord(object.item.id, '-')}`)
            }
            this.item.command({ originalEvent: event, item: this.item });
        }

        // toggle active state
        if (this.item.items) {
            this.active = !this.active;

            if (this.root && this.active && (this.isSlim || this.isHorizontal)) {
                this.layoutService.onOverlaySubmenuOpen();
            }
        }
        else {
            if (this.layoutService.isMobile()) {
                this.layoutService.state.staticMenuMobileActive = false;
            }

            if (this.isSlim || this.isHorizontal) {
                this.menuService.reset();
                this.layoutService.state.menuHoverActive = false;
            }
        }

        this.menuService.onMenuStateChange({ key: this.key });
    }

    onMouseEnter() {
        // activate item on hover
        if (this.root && (this.isSlim || this.isHorizontal) && this.layoutService.isDesktop()) {
            if (this.layoutService.state.menuHoverActive) {
                this.active = true;
                this.menuService.onMenuStateChange({ key: this.key });
            }
        }
    }

    get submenuAnimation() {
        if (this.layoutService.isDesktop() && (this.layoutService.isHorizontal() || this.layoutService.isSlim()))
            return this.active ? 'visible' : 'hidden';
        else
            return this.root ? 'expanded' : (this.active ? 'expanded' : 'collapsed');
    }

    get isHorizontal() {
        return this.layoutService.isHorizontal();
    }

    get isSlim() {
        return this.layoutService.isSlim();
    }

    checkMenuData(data: any) {
        if (data.id == Constants.INDICATOR_SUMMARY_BY_TEAM)
            return isComponentEnabled(this.menuItemsConfigs, data.id) && isComponentEnabled(this.menuItemsConfigs, Constants.TEAM_INDICATOR_ANALYSIS);
        return isComponentEnabled(this.menuItemsConfigs, data.id);
    }

    @HostBinding('class.active-menuitem')
    get activeClass() {
        return this.active && !this.root;
    }

    ngOnDestroy() {
        if (this.menuSourceSubscription) {
            this.menuSourceSubscription.unsubscribe();
        }

        if (this.menuResetSubscription) {
            this.menuResetSubscription.unsubscribe();
        }
    }
}
