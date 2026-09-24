/*
  Copyright 2026 UWorx Services.
  Licensed under the Apache License, Version 2.0.
  See LICENSE for the full license text.
*/


export function buildPathRec<T>(obj: T, separator = '/', path?: string) {

    if ('_path' in <object><any>obj) return;

    const append = path ? `${path}${separator}` : '';

    for (const key in obj) {
        const _path = `${append}${key}`;
        const _val = obj[key];
        const val = Object.keys(_val).length > 0 ? buildPathRec(_val, separator, _path) : _val;
        obj[key] = {
            ...val,
            _path,
            toString: () => _path,
        };
    }

    return obj;
}
