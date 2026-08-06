/** Domain types mirroring the backend discriminated unions. */

export type Timescale =
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months'
  | 'years'
  | 'eons';

export type NarrativePointOfView =
  | 'first_person'
  | 'second_person'
  | 'third_limited'
  | 'third_omniscient'
  | 'multiple';

export type BlockType =
  | 'setting'
  | 'character'
  | 'dialogue'
  | 'special_item'
  | 'vehicle'
  | 'tool';

export interface NarrativeDefaults {
  point_of_view: NarrativePointOfView;
  writing_style_material: string;
}

export interface Chapter {
  id: string;
  title: string;
  subtitle: string | null;
  description: string;
  order: number;
  timescale: Timescale;
  point_of_view_override: NarrativePointOfView | null;
  subplot_ids: string[];
  block_ids: string[];
  continuity_summary: string;
  draft_prose: string;
}

export interface Plot {
  id: string;
  name: string;
  description: string;
  chapter_ids: string[];
  related_plot_ids: string[];
}

export interface Subplot {
  id: string;
  name: string;
  description: string;
  chapter_ids: string[];
  related_subplot_ids: string[];
}

export interface BlockBase {
  id: string;
  title: string;
}

export interface SettingBlock extends BlockBase {
  block_type: 'setting';
  time_of_day: string;
  environment_state: string;
  description: string;
  micro_settings: string[];
}

export interface CharacterBlock extends BlockBase {
  block_type: 'character';
  attire: string;
  appearance: string;
  smell: string;
  personality: string;
  archetype: string;
  aura: string;
  special_skillsets: string[];
  personalized_items: string[];
}

export interface DialogueBlock extends BlockBase {
  block_type: 'dialogue';
  emotional_state: string;
  volume: string;
  conversation: string;
  character: string;
}

export interface SpecialItemBlock extends BlockBase {
  block_type: 'special_item';
  reaction: string;
  significance: string;
  what_it_does: string;
  how_it_works: string;
  environmental_effects: string;
}

export interface VehicleBlock extends BlockBase {
  block_type: 'vehicle';
  behaviors: string[];
  movement: string;
  scale: string;
  scope: string;
}

export interface ToolBlock extends BlockBase {
  block_type: 'tool';
  behaviors: string[];
  description: string;
  properties: string[];
}

export type StoryBlock =
  | SettingBlock
  | CharacterBlock
  | DialogueBlock
  | SpecialItemBlock
  | VehicleBlock
  | ToolBlock;

export interface BlockLink {
  id: string;
  source_block_id: string;
  target_block_id: string;
  description: string;
}

export interface BlockTemplate {
  id: string;
  name: string;
  block_type: BlockType;
  defaults: Record<string, unknown>;
}

export interface StoryProject {
  id: string;
  name: string;
  narrative_defaults: NarrativeDefaults;
  chapters: Chapter[];
  plots: Plot[];
  subplots: Subplot[];
  blocks: Record<string, StoryBlock>;
  block_links: BlockLink[];
  block_templates: BlockTemplate[];
  writing_style_material: string;
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  setting: 'Setting',
  character: 'Character',
  dialogue: 'Dialogue',
  special_item: 'Special Item',
  vehicle: 'Vehicle',
  tool: 'Tool',
};

export const TIMESCALES: Timescale[] = [
  'minutes',
  'hours',
  'days',
  'weeks',
  'months',
  'years',
  'eons',
];

export const POINT_OF_VIEWS: NarrativePointOfView[] = [
  'first_person',
  'second_person',
  'third_limited',
  'third_omniscient',
  'multiple',
];

export function assertNever(value: never): never {
  throw new Error(`Unhandled block type: ${JSON.stringify(value)}`);
}

export function orderedChapters(project: StoryProject): Chapter[] {
  return [...project.chapters].sort((a, b) => a.order - b.order);
}
