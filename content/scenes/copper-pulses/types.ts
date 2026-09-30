export interface Pt { x: number; y: number }
export interface WirePath { pair: number; d: string; colour: string; stripe: boolean }
export interface Spark { key: string; pair: number; dir: 1 | -1; head: Pt; trail: Pt[]; colour: string; alpha: number }
export interface CableProps { paths: WirePath[]; sparks: Spark[]; nerd: boolean }
export interface SparkProps { spark: Spark }
export interface CardProps { x: number; y: number; w: number; h: number; tint?: string }
