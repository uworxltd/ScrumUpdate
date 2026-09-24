export class StringUtils {
  static isEmpty(str: string | null): boolean {
    return !str && str.trim().length === 0;
  }

  static isNotEmpty(str: string | null): boolean {
    if (typeof str == 'string') {
      return str && str.trim().length !== 0;
    }
    return false;
  }

  static compare(a: string, b: string): number {
    return a.localeCompare(b, undefined, { sensitivity: 'base' })
  }

  static getNumbersFromString(str: string): number[] {
    return str?.match(/\d+/g)?.map(Number) ?? [];
  }
}
