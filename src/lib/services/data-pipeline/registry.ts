import { DataAdapter, AdapterCategory, AdapterMetadata } from './types';

class DataAdapterRegistry {
  private adapters = new Map<string, DataAdapter>();

  register(adapter: DataAdapter): void {
    if (this.adapters.has(adapter.key)) {
      console.warn(`Adapter "${adapter.key}" already registered, overwriting.`);
    }
    this.adapters.set(adapter.key, adapter);
  }

  get(key: string): DataAdapter | undefined {
    return this.adapters.get(key);
  }

  has(key: string): boolean {
    return this.adapters.has(key);
  }

  list(): DataAdapter[] {
    return Array.from(this.adapters.values());
  }

  listEnabled(): DataAdapter[] {
    return this.list().filter(a => !a.disabled);
  }

  listByCategory(category: AdapterCategory): DataAdapter[] {
    return this.list().filter(a => a.metadata.category === category);
  }

  listMetadata(): AdapterMetadata[] {
    return this.list().map(a => ({ ...a.metadata, key: a.key } as AdapterMetadata & { key: string }));
  }

  keys(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const registry = new DataAdapterRegistry();
