import { Constants } from 'app/constants';
import { wait } from 'app/shared/helper-functions';
import { addMinutes } from 'date-fns';

String.prototype.format = function () {
  let formatted = this;
  for (let i = 0; i < arguments.length; i++) {
    const regexp = new RegExp('\\{' + i + '\\}', 'gi');
    formatted = formatted.replace(regexp, arguments[i]);
  }
  return formatted;
};

Date.prototype.formatISODateOnly = function () {
  return addMinutes(this, -this.getTimezoneOffset()).toISOString().split('T')[0];
};

Date.prototype.getISODateOnly = function () {
  const [year, month, date] = addMinutes(this, -this.getTimezoneOffset()).toISOString().split('T')[0].split('-');
  return new Date(Number(year), Number(month) - 1, Number(date));
};

Date.prototype.getMonthName = function () {
  return this.toLocaleString('default', { month: 'long' });
};

Date.prototype.getMonthNameShort = function () {
  return this.toLocaleString('default', { month: 'short' });
}

Storage.prototype.trackItem = async function (key: string, timeout = 1000) {
  let value = this.getItem(key);

  while (timeout > 0 && !value) {
    await wait(100);
    value = this.getItem(key);
    timeout -= 100;
  }

  return value;
};

Storage.prototype.storeItem = function (key: string, value: string) {
  const event = new CustomEvent(Constants.EVENT_STORAGE_STORE_ITEM, { detail: { key, value } });
  window.dispatchEvent(event);
  this.setItem(key, value);
};
