/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from "@angular/core";
import { Store } from "@ngrx/store";
import { Constants } from "app/constants";
import { AppState, LoadingState } from "app/states/app-states";
import { selectTranslation } from "app/states/global-translations.selector";
import { ConfirmationService } from 'primeng/api';
import { combineLatest, Subscription } from "rxjs";
import { v4 as uuidv4 } from 'uuid';
import { DropPosition, EntityState, PicklistCategory, PicklistGroup, PicklistItem } from "./interfaces";
import { group } from "./utils";
import { RandomColorService } from "app/services/randomColor.service";
import { fetchAiGeneratedCategories, setAiGeneratedCategoriesLoadingState } from "app/states/app.actions";
import { IssueType } from "app/interface/worklog-catagory";
import { selectIssueTypes } from "app/states/global-configs.selector";
import { selectAiGeneratedCategories, selectAiGeneratedCategoriesLoadingState } from "app/states/global-process.selector";

@Component({
    selector: 'khoji-picklist',
    templateUrl: './picklist.component.html',
    styleUrls: ['./picklist.component.scss'],
    providers: [RandomColorService] // RandomColorService is provided here to maintain the same instance across the component
})
export class PicklistComponent implements OnInit, OnDestroy {
    @ViewChild('input') input: ElementRef<HTMLInputElement>;
    issueTypes: IssueType[] = [];
    translation;
    ghostElement: HTMLElement;
    constants = Constants;
    #categories: PicklistCategory[] = [];
    savedCategories: PicklistCategory[] = [];
    #items: PicklistItem[] = [];
    #sourceItems: PicklistItem[] = [];
    subscription = new Subscription();
    loadingState = LoadingState;
    groups: PicklistGroup[] = this.initIssueTypeGroups();
    aiLoading = LoadingState.Pending;

    @Input() classStyle = '';
    @Input() loading = LoadingState.Pending;
    @Input() addNewCategoryByDefaultIfNoCategories = false;
    @Input() recentDays = 0;
    @Input() categoryNamesNotAllowedList = [];
    @Input() title = '';
    @Input() showTitle = false;

    @Input()
    get items() {
        return this.#items;
    }
    set items(items: PicklistItem[]) {
        // filter out invalid items
        this.#sourceItems = items?.length ? items.filter(this.validItemFilter) : [];
        this.#items = this.grouptItemsByName(this.#sourceItems);
        this.initGroups();
        this.initCategories();
    }

    @Input()
    get categories() {
        return this.#categories;
    }
    set categories(categories: PicklistCategory[]) {
        // filter out invalid categories and invalid category items
        const fresh = categories?.length ? categories.filter(this.validCategoryFilter).map(c => ({ ...c, collapsed: true, items: c.items.filter(this.validItemFilter) })) : [];
        // before setting new categories, compare with already loaded categories and only set of changed.
        // it will maintain the order of categories
        const loaded = this.validCategories();

        if (loaded.length && fresh.length) {
            const _loaded = this.serializeCategories(loaded.map(c => ({ ...c, items: this.unGroupItemsByName(c.items) })));

            if (!this.#hasChanges(_loaded, fresh)) {
                this.#categories = this.validCategories();
                this.acceptChanges();
                this.collapseAllCategories();
                return;
            }
        }

        this.#categories = fresh;

        if (this.#items.length) this.initCategories();
    }

    @Output() newButtonClick = new EventEmitter();

    searchTerm = '';
    selectedCategoryName = () => this.selectedCategory?.name.trim();
    collapseAllCategories = () => this.categories.forEach(c => c.collapsed = true);
    searchFilter = (item: PicklistItem) => this.searchTerm ? item.name.toLowerCase().includes(this.searchTerm) : true;

    removeFromGroup = (item: PicklistItem) => {
        const index = item.group.items.findIndex(gItem => gItem.id === item.id);
        if (index > -1) item.group.items.splice(index, 1);
    };

    removeFromCategory = (item: PicklistItem) => {
        const index = item.category.items.findIndex(cItem => cItem.id === item.id);
        if (index > -1) item.category.items.splice(index, 1);
    };

    validCategoryFilter = (c: PicklistCategory) => c?.name.trim();
    validItemFilter = (item: PicklistItem) => item?.id && item?.name.trim();
    validCategories = () => this.categories.filter(this.validCategoryFilter);
    itemCssId = (item: PicklistItem) => `item-${item.id}`;
    categoryCssId = (item: PicklistCategory) => `category-${item.id}`;
    itemElements = (items: PicklistItem[], callback: (el: HTMLElement) => void) => document.querySelectorAll(items.map(t => `#${this.itemCssId(t)}`).join(',')).forEach(callback);
    categoryElement = (category: PicklistCategory, callback: (el: HTMLElement) => void) => callback(document.querySelector(`#${this.categoryCssId(category)}`));
    findCategoryCssId = (ref: HTMLElement) => ref.closest('.header-box')?.id;

    constructor(
        private store: Store<AppState>,
        private confirmationService: ConfirmationService,
        private cdr: ChangeDetectorRef,
        private randomColorService: RandomColorService,
    ) { }

    ngOnInit(): void {
        this.randomColorService.init(Constants.COLOR_PICKER_PALETTE);
        this.loading = LoadingState.Loading;

        this.subscription.add(
            this.store.pipe(selectTranslation).subscribe((translation) => {
                this.translation = translation;
            })
        );

        this.subscription.add(
            this.store.pipe(selectIssueTypes).subscribe((data) => {
                this.issueTypes = data.sourceIssueTypes;
            })
        );

        const aiLoadingState$ = this.store.pipe(selectAiGeneratedCategoriesLoadingState);
        const selectAiGeneratedCategories$ = this.store.pipe(selectAiGeneratedCategories);

        this.subscription.add(
            aiLoadingState$.subscribe((loadingState) => {
                this.aiLoading = loadingState;
            })
        );

        this.subscription.add(
          combineLatest([selectAiGeneratedCategories$, aiLoadingState$]).subscribe(([data, loadingState]) => {
            if (loadingState === LoadingState.Done) {
              const categories = data.map<PicklistCategory>((c) => ({
                id: uuidv4(),
                description: '',
                name: c.title,
                color: this.randomColorService.getRandomColor(),
                // we get single issue type from AI, so we need to map it to the actual issue type to handle duplicates
                items: c.issuetypes.map((t) => this.issueTypes.filter((i) => i.name === t.issueTypeName).map((i) => ({ id: i.id, name: i.name }))).flat()
              }));
              this.restoreCategories(categories);
            }
          })
        );
    }

    focusInput = () => setTimeout(() => this.input?.nativeElement.focus(), 200);

    private initIssueTypeGroups() {
        return [
            Constants.RECENTLY_USED_ISSUE_TYPES_GROUP,
            'a-g', 'h-m', 'n-s', 't-z',
            Constants.ALL_OTHER_ISSUE_TYPES_GROUP
        ].map(id => id === Constants.ALL_OTHER_ISSUE_TYPES_GROUP || id === Constants.RECENTLY_USED_ISSUE_TYPES_GROUP ? ({
            id,
            name: id,
            fromCharCode: 0,
            toCharCode: 0,
            items: [],
        }) : ({
            id,
            name: id.replace(/\-/, ' - ').toUpperCase(),
            fromCharCode: id.charCodeAt(0),
            toCharCode: id.charCodeAt(2),
            items: [],
        }));
    }

    initGroups() {
        this.groups = this.initIssueTypeGroups();

        const recentlyUsedGroup = this.groups.find(g => g.id === Constants.RECENTLY_USED_ISSUE_TYPES_GROUP);
        const allOtherGroup = this.groups.find(g => g.id === Constants.ALL_OTHER_ISSUE_TYPES_GROUP);

        if (!recentlyUsedGroup || !allOtherGroup) {
            throw new Error('Essential groups (recently used or all other) are missing.');
        }

        const alphaGroups = this.groups.filter(g => g.id !== Constants.RECENTLY_USED_ISSUE_TYPES_GROUP && g.id !== Constants.ALL_OTHER_ISSUE_TYPES_GROUP);

        this.#items.forEach(item => {
            item.id = item.id || uuidv4();

            let group: PicklistGroup;
            const charCode = item.name[0].toLocaleLowerCase().charCodeAt(0);

            if (item.recentlyUsed) {
                group = recentlyUsedGroup;
                group.recentlyUsed = true;
            } else {
                group = alphaGroups.find(g => charCode >= g.fromCharCode && charCode <= g.toCharCode) || allOtherGroup;
            }

            item.group = group;
        });

        const groupedItems = group(this.#items, item => item.group.id);

        this.groups.forEach(grp => {
            grp.items = groupedItems.find(g => g.key === grp.id)?.val || [];
            this.sortItems(grp.items);
        });

        this.groups = this.groups.filter(grp => grp.id !== Constants.RECENTLY_USED_ISSUE_TYPES_GROUP || grp.items.length > 0);
    }

    initCategories() {
        this.restoreCategories(this.validCategories());
        this.saveCategories();
    }

    restoreCategories(categories: PicklistCategory[]) {
        this.randomColorService.init(Constants.COLOR_PICKER_PALETTE);

        this.#categories = categories.map(cat => {
            this.randomColorService.dequeueColor(cat.color);
            const category: PicklistCategory = {
                ...cat,
                id: cat.id || uuidv4(),
                collapsed: true,
                items: [],
            };

            [...cat.items].forEach(itm => {
                const item = this.#items.find(t => t.id == itm.id);

                if (item) {
                    item.category = category;
                    category.items.push(item);
                    this.removeFromGroup(item);
                }
                else {
                    const index = category.items.findIndex(t => t.id === itm.id);
                    if (index > -1) category.items.splice(index, 1);
                }
            });

            this.sortItems(category.items);

            return category;
        });

        this.sortItems(this.categories);

        if (this.categories.length === 0 && this.addNewCategoryByDefaultIfNoCategories) {
            this.addCategory();
        }
        // Requirement by QA
        // else if (this.categories.length) {
        //     this.categories[0].collapsed = false;
        // }
    }

    saveCategories() {
        this.savedCategories = this.serializeCategories(this.validCategories());
    }

    serializeCategories(categories: PicklistCategory[]) {
        return categories.map<PicklistCategory>(c => ({
            id: c.id,
            name: c.name,
            description: c.description,
            color: c.color,
            items: c.items.map<PicklistItem>(t => ({ id: t.id, name: t.name })),
        }));
    }

    addCategory() {
        this.collapseAllCategories();
        this.categories.unshift({
            id: uuidv4(),
            name: '',
            color: this.randomColorService.getRandomColor(),
            description: '',
            items: [],
            collapsed: false,
        });

        this.focusInput();
    }

    handleAddCategory() {
        this.newButtonClick.emit();
        this.addCategory();
    }

    handleToggleCategory(category: PicklistCategory) {
        if (this.selectedCategoryName() === '' && !!this.selectedCategory?.items.length) {
            const message = this.translation?.picklist.confirmDiscard.message;
            const acceptLabel = this.translation?.picklist.confirmDiscard.acceptLabel;
            this.confirm(this.input.nativeElement, message, acceptLabel, () => {
                const index = this.categories.findIndex(c => c.id === this.selectedCategory.id);
                this.removeCategory(index, this.selectedCategory);
                this.toggleCategory(category);
            });
        }
        else if (this.selectedCategoryName() === '') {
            const index = this.categories.findIndex(c => c.id === this.selectedCategory.id);
            this.removeCategory(index, this.selectedCategory);
            this.toggleCategory(category);
        }
        else {
            this.toggleCategory(category);
        }
    }

    handleColorChange(color: string, category: PicklistCategory) {
        this.randomColorService.swapColors(category.color, color);
        category.color = color;
    }

    toggleCategory(category: PicklistCategory) {
        const cat = { ...category };
        this.categories.forEach(c => {
            c.collapsed = cat.id === c.id ? !cat.collapsed : (cat.collapsed ? true : c.collapsed)
        });

        if (cat.collapsed) this.focusInput();
    }

    get selectedCategory() {
        return this.categories.find(cat => !cat.collapsed);
    }

    get assignCategoryItems() {
        return this.#items.filter(item => item.selected && !item.category);
    }

    get unassignCategoryItems() {
        return this.#items.filter(item => item.selected && !!item.category);
    }

    assignCategory(items: PicklistItem[], category: PicklistCategory) {
        if (!category || !items.length) return;

        const itms = [...items];

        itms.forEach(itm => {
            const item = this.#items.find(t => itm.id === t.id);
            item.selected = false;
            !!item.category ? this.removeFromCategory(item) : this.removeFromGroup(item);
            item.category = category;
            category.items.push(item);
        });

        this.sortItems(category.items);

        setTimeout(() => {
            this.itemElements(itms, el => {
                el.classList.add('moved');
            });
        }, 50);
    }

    unassignCategory(items: PicklistItem[]) {
        if (!items.length) return;

        const itms = [...items];

        itms.forEach(itm => {
            const item = this.#items.find(t => itm.id === t.id);
            item.selected = false;
            this.removeFromCategory(item);
            item.category = null;
            const group = this.groups.find(g => g.id === item.group.id);
            group.items.push(item);
            this.sortItems(group.items);
        });

        setTimeout(() => {
            this.itemElements(itms, el => {
                el.classList.add('moved');
            });
        }, 50);
    }

    getCompletedCategories<T>(callback: (category: PicklistCategory) => T) {
        return new Promise<T[]>((res, rej) => {
            if (this.selectedCategoryName() === '' && !!this.selectedCategory?.items.length) {
                const message = this.translation?.picklist.confirmDiscard.message;
                const acceptLabel = this.translation?.picklist.confirmDiscard.acceptLabel;
                this.confirm(this.input.nativeElement, message, acceptLabel, () => {
                    const index = this.categories.findIndex(c => c.id === this.selectedCategory.id);
                    this.removeCategory(index, this.selectedCategory);

                    if (this.hasChanges()) {
                        res(this.validCategories().map(c => callback({ ...c, items: this.unGroupItemsByName(c.items) })));
                    }
                    else {
                        res(null);
                    }
                }, () => {
                    res(null);
                });
            }
            else {
                res(this.validCategories().map(c => callback({ ...c, items: this.unGroupItemsByName(c.items) })))
            }
        });
    }

    /** using copy */
    grouptItemsByName(items: PicklistItem[]) {
        const _items: PicklistItem[] = [];
        const groups = group(items, item => item.name);

        groups.forEach(g => {
            const item = { ...g.val[0] }; // copy
            item.recentlyUsed = g.val.some(t => t.recentlyUsed);
            item.ids = g.val.map(t => t.id).sort();
            _items.push(item);
        });

        return _items;
    }

    /** using copy */
    unGroupItemsByName(items: PicklistItem[]): PicklistItem[] {
        const ids = items.flatMap(t => t.ids);
        return this.#sourceItems.filter(s => ids.includes(s.id)).map(s => ({ ...s })); // copy
    }

    confirm(target, message, acceptLabel, callback: Function, rejectCallback?: Function) {
        this.confirmationService.confirm({
            target,
            message,
            acceptLabel,
            rejectLabel: 'Cancel',
            accept: () => {
                callback();
            },
            reject: () => {
                rejectCallback && rejectCallback();
            }
        });
    }

    removeCategory(index: number, category: PicklistCategory) {
        this.unassignCategory(category?.items || []);
        this.categories.splice(index, 1);
        this.randomColorService.enqueueColor(category.color);

        if (this.categories.length === 0) {
          this.resetAiGeneratedCategoriesLoadingState();
        }
    }

    isInValidName() {
        let name = this.selectedCategoryName();

        if (name === undefined || name === '') return;

        name = name.toLowerCase();

        if (this.categoryNamesNotAllowedList.some(item => item.toLowerCase() === name)) {
            return this.translation.picklist.nameNotAllowedText.format(name);
        }

        const categories = this.validCategories();
        const exists = categories.filter(c => c.id !== this.selectedCategory.id && c.name.trim().toLowerCase() === name).length > 0;

        if (exists) return this.translation.picklist.nameAlreadyExistsText;
    }

    expandGroups() {
        this.groups.forEach(g => g.collapsed = false);
    }

    sortItems(items: PicklistItem[] | PicklistCategory[]) {
        items.sort((a, b) => a.name.localeCompare(b.name));
    }

    allowDrop(ev: DragEvent) {
        ev.preventDefault();
    }

    draggableItems(ev: DragEvent) {
        const target = ev.target as HTMLDivElement;
        const item = this.#items.find(t => this.itemCssId(t) == target.id);
        const isCategoryItem = target.classList.contains('category-item');
        const items = isCategoryItem ? this.unassignCategoryItems : this.assignCategoryItems;
        if (!item.selected) items.push(item);
        return items;
    }

    drag(ev: DragEvent) {
        const target = (ev.target as HTMLDivElement);
        const items = this.draggableItems(ev);
        const itemIds = items.map(t => t.id).join(',');
        ev.dataTransfer.setData("item-ids", itemIds);
        ev.dataTransfer.setData('item-source', target.className);

        const ghostElement = document.createElement('div');
        ghostElement.classList.add('dragging');

        const elements = items.map(t => {
            const element = document.createElement('div');
            element.innerText = t.name;
            return element;
        });

        ghostElement.append(...elements);
        document.body.appendChild(ghostElement);
        const itemRect = (ev.target as HTMLElement).getBoundingClientRect();

        ev.dataTransfer.setDragImage(
            ghostElement,
            ev.clientX - itemRect.left,
            ev.clientY - itemRect.top
        );

        this.ghostElement = ghostElement;
    }

    drop(ev: DragEvent) {
        ev.preventDefault();
        const ids = ev.dataTransfer.getData("item-ids")?.split(',');
        const items = this.#items.filter(item => ids.includes(item.id));
        if (!items.length) return;

        const [dropPosition, categoryCssId] = this.dropPosition(ev);

        if (dropPosition === DropPosition.Category) {
            this.assignCategory(items, this.selectedCategory);
        }
        else if (dropPosition === DropPosition.NewCategoryButton) {
            this.handleAddCategory();
            this.assignCategory(items, this.selectedCategory);
        }
        else if (dropPosition === DropPosition.Group) {
            this.unassignCategory(items);
        }
        else if (dropPosition === DropPosition.CategoryName) {
            const category = this.categories.find(c => this.categoryCssId(c) === categoryCssId);
            this.assignCategory(items, category);
            this.categoryElement(category, el => {
                el.classList.add('dropped');
                setTimeout(() => {
                    el.classList.remove('dropped');
                }, 1000);
            });
        }

        if (this.ghostElement) {
            this.ghostElement.remove();
        }
    }

    dropPosition(ev: DragEvent) {
        const source = ev.dataTransfer.getData("item-source").split(' ');
        const isGroupTarget = () => !!(ev.target as HTMLElement).closest('.group-wrapper');
        const isCategoryTarget = () => !!(ev.target as HTMLElement).closest('.category-body');
        const isNewCategoryButtonTarget = () => !!(ev.target as HTMLElement).closest('.add-new-category-button');
        let categoryCssId;

        if (source.includes('group-item') && isCategoryTarget()) {
            return [DropPosition.Category, 0]
        }
        else if (source.includes('group-item') && isNewCategoryButtonTarget()) {
            return [DropPosition.NewCategoryButton, 0]
        }
        else if (source.includes('category-item') && isGroupTarget()) {
            return [DropPosition.Group, 0];
        }
        else if (categoryCssId = this.findCategoryCssId(ev.target as HTMLElement)) {
            return [DropPosition.CategoryName, categoryCssId];
        }

        return [DropPosition.None, 0];
    }

    categoryState(saved: PicklistCategory[], category: PicklistCategory) {
        const original = saved.find(o => o.name === category.name);

        if (!original) return EntityState.Added;
        if (category.items.length !== original.items.length) return EntityState.Modified;

        const changed = category.name !== original.name || category.color !== original.color;

        if (changed) return EntityState.Modified;

        const itemsChanged = category.items.length !== category.items.filter(e => original.items.findIndex(o => o.id === e.id) > -1).length;

        return itemsChanged ? EntityState.Modified : EntityState.Unchanged;
    }

    #hasChanges(saved: PicklistCategory[], recent: PicklistCategory[]) {
        if (saved.length !== recent.length) return true;

        let changed = false;

        for (const category of recent) {
            const state = this.categoryState(saved, category);

            if (state === EntityState.Added || state === EntityState.Modified) {
                changed = true;
                break;
            }
        }

        return changed;
    }

    hasChanges() {
        if (this.selectedCategoryName() === '' && !!this.selectedCategory?.items.length) {
            return true;
        }

        return this.#hasChanges(this.savedCategories, this.validCategories());
    }

    acceptChanges() {
        this.saveCategories();
    }

    reset() {
        if (!this.hasChanges()) return;
        
        const items = this.categories.flatMap(c => c.items);
        this.unassignCategory(items);
        
        this.restoreCategories(this.savedCategories.map(c => ({
            ...c,
            items: this.#items.filter(t => c.items.findIndex(o => t.id === o.id) > -1),
        })));

        this.resetAiGeneratedCategoriesLoadingState();
    }

    generateCategoriesWithAi() {
        this.store.dispatch(fetchAiGeneratedCategories({issueTypes: this.issueTypes}));
    }

    regenerateCategoriesWithAi(event) {
        const message = this.translation?.picklist.confirmDiscardForAi.message;
        const acceptLabel = this.translation?.picklist.confirmDiscardForAi.acceptLabel;
        this.confirm(event.target, message, acceptLabel, () => {
          this.generateCategoriesWithAi();
        });
    }

    resetAiGeneratedCategoriesLoadingState() {
        this.store.dispatch(setAiGeneratedCategoriesLoadingState({loadingState: LoadingState.Pending}));
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.resetAiGeneratedCategoriesLoadingState();
    }
}
