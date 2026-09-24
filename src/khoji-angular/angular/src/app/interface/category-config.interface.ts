interface IssueConfig {
  khojiCategories: Category[];
  sourceCategories: Category[];
}

interface KhojiSourceConfig {
  khojiCategories: string[];
  sourceCategories: string[];
}

export interface Category {
  id: number;
  name: string;
  color: string;
  order: number;
  applicableStatusIds: number[];
}

export interface CategoryConfig {
  issue: IssueConfig;
  sprint: KhojiSourceConfig;
  release: KhojiSourceConfig;
}
