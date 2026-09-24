
/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

import { Role } from "app/admin/admin.entities";

export interface PicklistCategory {
    id: string;
    name: string;
    color: string;
    description: string;
    items: PicklistItem[];
    collapsed?: boolean;
}

export interface PicklistGroup {
    id: string;
    name: string;
    fromCharCode?: number;
    toCharCode?: number;
    items: PicklistItem[];
    collapsed?: boolean;
    recentlyUsed?: boolean;
}

export interface PicklistItem {
    id: string;
    name: string;
    ids?: string[];
    category?: PicklistCategory;
    group?: PicklistGroup;
    selected?: boolean;
    recentlyUsed?: boolean;
}

export enum DropPosition {
    None, Category, CategoryName, Group, NewCategoryButton
}

export enum EntityState {
    Added, Unchanged, Modified
}

// for testing
export function generateIssueTypes() {
    const items = [];
    for (let i = 65; i <= 90; i++) {
        const initial = String.fromCharCode(i);
        for (let j = 0; j < 10; j++) {
            const item: PicklistItem = ({
                id: `${i}-${j}`,
                name: `${initial}-item-${i}${j}`,
            });
            items.push(item);
        }
    }
    return items;
}

export interface MemberWorklogPercentage {
    memberName: string;
    percentage: number;
}

export interface MemberRemindWorklog {
    id?: number,
    memberName: string;
    accountId: string
    percentage: number;
    email?: string;
    avatarURL?: string;
    selected?: boolean;
    userRole?: Role;
}

export interface WorklogStatusItem {
    title: string;
    count: number;
    icon?: string;
}

export interface AvatarData {
    avatarURL?: string;
    id?: number;
    userRole?: Role;
}

export interface CreateInstancePayload {
    tenantId: string;
    instanceImageUrl: string;
    instanceName: string;
    workspace: {
        id: number;
    };
    platform?: string;
    featureId: number;
}

export interface FeatureUnlockPayload {
    instanceId: number;
    featureId: number;
}

export interface UserWorklogSummaryRequest {
    accountId: string;
    startDate: string;
    endDate: string;
    timeZone: string;
}

export interface GenerateAIWorklogRequest {
  accountId: string;
  requestedDate: string;
  hoursToGenerate: number;
}

export interface InviteAction {
    instanceId: number;
    action: boolean
}
