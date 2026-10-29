declare module '@3d-dice/dice-box' {
  export interface DiceBoxConfig {
    assetPath: string;
    container?: string | HTMLElement;
    theme?: string;
    themeColor?: string;
    scale?: number;
    offscreen?: boolean;
    enableShadows?: boolean;
    gravity?: number;
    throwForce?: number;
    settleTimeout?: number;
    lightIntensity?: number;
  }
  export interface DiceBoxRoll {
    qty: number;
    sides: number | string;
  }
  export interface DiceBoxDie {
    groupId: number;
    rollId: number;
    sides: number;
    value: number;
  }
  export default class DiceBox {
    constructor(config: DiceBoxConfig);
    init(): Promise<void>;
    roll(notation: string | DiceBoxRoll | (string | DiceBoxRoll)[]): Promise<DiceBoxDie[]>;
    clear(): void;
    hide(): void;
    show(): void;
    updateConfig(config: Partial<DiceBoxConfig>): void;
  }
}
