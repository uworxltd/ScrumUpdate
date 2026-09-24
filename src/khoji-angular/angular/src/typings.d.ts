/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

declare module "*.json" {
  const value: any;
  export default value;
}

interface String {
  format(...args: string[]): string;
}

interface Date {
  /** formats local date in ISO style yyyy-mm-dd */
  formatISODateOnly(): string;
  getISODateOnly(): Date;
  getMonthName(): string;
  getMonthNameShort(): string;
}

interface Storage {
  /** @param key: string; @param timeout?: number = 1000ms **/
  trackItem(key: string, timeout?: number): Promise<string>;
  storeItem(key: string, value: string): void;
}