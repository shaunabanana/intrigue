/* eslint-disable import/no-extraneous-dependencies */
// eslint-disable-next-line import/no-dynamic-require, global-require
const { default: Store } = await import('electron-store');

const store = new Store();

export default store;
