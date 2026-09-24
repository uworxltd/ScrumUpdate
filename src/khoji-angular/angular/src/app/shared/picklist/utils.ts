export interface IGroup<T2, T> {
    key: T2;
    val: T[];
}

export function group<T, T2>(list: Iterable<T>, key: (item: T) => T2) {
    const groups: IGroup<T2, T>[] = [];

    return Array.from(list).reduce((groups, item) => {
        const k = key(item);
        const idx = groups.findIndex((g) => g.key == k);
        const group = idx > -1 ? groups[idx] : { key: k, val: [] };
        group.val.push(item);

        if (idx == -1) groups.push(group);

        return groups;
    }, groups);
}