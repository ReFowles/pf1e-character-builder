// The class progression table and level-up checklist are mounted once in
// App.svelte, so the checklist stays open while "Go to Feats" switches tabs.
class ClassDialogs {
  progressionOpen = $state(false);
  progressionClass = $state('');
  levelUpOpen = $state(false);
  levelUpIndex = $state(0);

  showProgression(classId: string) {
    this.progressionClass = classId;
    this.progressionOpen = true;
  }

  /** `index` is into the character's levels. */
  showLevelUp(index: number) {
    this.levelUpIndex = index;
    this.levelUpOpen = true;
  }
}

export const classDialogs = new ClassDialogs();
