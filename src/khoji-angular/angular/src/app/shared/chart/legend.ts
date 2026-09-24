export class Legend {
  data: number[] = [];

  constructor(public name: string, private _show = true) { }

  get total() {
    return this.data.reduce((a, b) => a + b, 0);
  }

  get avg() {
    return this.total / this.data.length;
  }

  get show() {
    return this._show;
  }
  set show(value) {
    this._show = value;
  }

  reset() {
    this.data = [];
    return this;
  }

  //Reset Legend Data Plus its visibility
  resetLegend(show: boolean) {
    this._show = show;
    this.data = [];
    return this;
  }
}