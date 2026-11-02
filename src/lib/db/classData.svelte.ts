// Class and archetype data for the progression table and level-up checklist,
// loaded on first use and shared by both.
import { loadDb } from '.';
import type { DbArchetype, DbClass } from './types';

class ClassData {
  classes = $state<DbClass[]>([]);
  archetypes = $state<DbArchetype[]>([]);
  status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');

  load() {
    if (this.status === 'loading' || this.status === 'ready') return;
    this.status = 'loading';
    Promise.all([loadDb('classes'), loadDb('archetypes')])
      .then(([classes, archetypes]) => {
        this.classes = classes;
        this.archetypes = archetypes;
        this.status = 'ready';
      })
      .catch(() => (this.status = 'error'));
  }
}

export const classData = new ClassData();
