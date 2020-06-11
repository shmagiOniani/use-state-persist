import AsyncStorage from '@react-native-community/async-storage';
import { StorageProvider, Data, StorageItem, StorageEvents } from './types';
import { Event } from './event';

class SyncStorage implements StorageProvider {
  static instance: SyncStorage;
  private data: Data = new Map();
  private loaded = false;

  private constructor(private events: StorageEvents = {}) {}

  static getInstance() {
    if (SyncStorage.instance) return SyncStorage.instance;
    return (SyncStorage.instance = new SyncStorage());
  }

  async init() {
    if (this.loaded) return;
    const keys = await AsyncStorage.getAllKeys();
    const storageData = await AsyncStorage.multiGet(keys);
    storageData.forEach(item => this.mapToMemory(item));
    this.loaded = true;
  }

  subscribe(key: string, callback: (data: any) => void) {
    return this.getEvent(key).on(callback);
  }

  getItem<T>(key: string) {
    this.checkIfLoaded();
    return this.data.get(key) as T;
  }

  setItem<T>(key: string, value: T) {
    if (!key) throw Error('No key provided');
    this.data.set(key, value);
    this.getEvent(key).trigger(value);
    AsyncStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key: string) {
    if (!key) throw Error('No key provided');
    this.data.delete(key);
    this.getEvent(key).trigger(undefined);
    AsyncStorage.removeItem(key);
  }

  getAllKeys() {
    return Array.from(this.data.keys());
  }

  get length() {
    return this.data.size;
  }

  getEvent(key: string) {
    if (this.events[key]) {
      return this.events[key];
    }
    return (this.events[key] = new Event());
  }

  clear() {
    this.data.clear();
    AsyncStorage.clear();
  }

  private mapToMemory(item: StorageItem) {
    const key = item[0];
    const value = item[1];

    if (!value) return;

    this.data.set(key, JSON.parse(value));
  }

  private checkIfLoaded() {
    if (this.loaded) return;
    throw Error('Sync Storage `init()` needs to be called before using it.');
  }

  // Used for testing
  get _private() {
    return {
      mapToMemory: this.mapToMemory.bind(this),
      checkIfLoaded: this.checkIfLoaded.bind(this),
      loaded: this.loaded,
    };
  }
}

export const syncStorage = SyncStorage.getInstance();
