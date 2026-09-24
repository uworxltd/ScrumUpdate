/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/

export interface DropdownItem {
  item_id: string;
  item_text: string;
  item_subtext?: string;
  item_status_label?: string;
  item_status_class?: string;
  item_description?: string;
  item_date?: string;
  /** @deprecated */
  item_value?: any;
  /** 'active' | 'closed' */
  item_status?: string;
  item_selected?: boolean;
  hide?: boolean;
  // grouping info
  is_group?: boolean;
  grouping_key?: string;
  grouping_value?: string | number | boolean;
  children_count?: number;
  expand?: boolean;
  item_cached?: boolean;
}
