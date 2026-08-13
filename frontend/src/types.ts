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
  | 'multiple'
  | 'unreliable_narrator'
  | 'stream_of_consciousness'
  | 'free_indirect_discourse';

export type StructuralDevice =
  | 'frame_narrative'
  | 'parallel_dual_timelines'
  | 'circular_cyclical'
  | 'ring_chiasmus'
  | 'in_medias_res'
  | 'ab_ovo';

export type PacingDevice =
  | 'scene'
  | 'summary'
  | 'temporal_expansion'
  | 'scene_sequel_rhythm'
  | 'syntactic_pacing'
  | 'delay_stretching_gap';

export type SuspenseMechanism =
  | 'ticking_clock'
  | 'cliffhanger'
  | 'information_asymmetry'
  | 'raising_the_stakes'
  | 'false_haven'
  | 'open_loops';

export type FigurativeDevice =
  | 'metaphor'
  | 'simile'
  | 'personification'
  | 'anthropomorphism'
  | 'hyperbole'
  | 'litotes'
  | 'metonymy'
  | 'synecdoche'
  | 'oxymoron'
  | 'paradox'
  | 'sensory_imagery'
  | 'synesthesia';

export type BlockType =
  | 'setting'
  | 'character'
  | 'dialogue'
  | 'special_item'
  | 'vehicle'
  | 'tool'
  | 'group'
  | 'prose_builder';

export interface NarrativeDefaults {
  point_of_view: NarrativePointOfView;
  writing_style_material: string;
  structural_devices: StructuralDevice[];
  structural_devices_custom: string[];
}

export interface WritingTexture {
  rule_of_three: number;
  emotional_flatlining: number;
  metaphor_stacking: number;
  list_rhythm_stacking: number;
  subject_x_vs_subject_y: number;
  metaphor_with_personification: number;
  clean_pivot_sentences: number;
  over_dramatic_metaphor: number;
  emotional_shorthand_stacking: number;
}

export type WritingTextureTechnique = keyof WritingTexture;

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
  pacing_devices: PacingDevice[];
  pacing_devices_custom: string[];
  syntactic_pacing_notes: string;
  suspense_mechanisms: SuspenseMechanism[];
  suspense_custom: string[];
  writing_texture: WritingTexture;
}

export interface Plot {
  id: string;
  name: string;
  description: string;
  chapter_ids: string[];
  related_plot_ids: string[];
  inciting_incident: string;
  macguffin: string;
  plot_twist: string;
  deus_ex_machina: string;
}

export interface SubplotPhase {
  id: string;
  description: string;
}

export interface Subplot {
  id: string;
  name: string;
  description: string;
  chapter_ids: string[];
  related_subplot_ids: string[];
  phases: SubplotPhase[];
  /** Catalog id from plotArchetypes; empty means unset. */
  plot_archetype: string;
  /** How this subplot diverges from the chosen archetype template. */
  delta: string;
  inciting_incident: string;
  macguffin: string;
  plot_twist: string;
  deus_ex_machina: string;
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
  juxtaposition: string;
  /** Timeline shade index; clones keep the same value for scene returns. */
  color_variant: number;
  /** Character blocks present in this setting/scene. */
  character_ids: string[];
}

export interface CharacterBlock extends BlockBase {
  block_type: 'character';
  attire: string;
  appearance: string;
  smell: string;
  personality: string;
  /** Catalog id from characterArchetypes; empty means unset. */
  archetype: string;
  /** How this character diverges from the chosen archetype template. */
  archetype_delta: string;
  aura: string;
  special_skillsets: string[];
  personalized_items: string[];
  character_foil_id: string | null;
}

export interface DialogueLine {
  character_id: string | null;
  /** Legacy free-text speaker when no character_id is linked. */
  character_label: string;
  conversation: string;
  emotional_state: string;
  volume: string;
  subtext: string;
  /** Stage business: ticks, micro-expressions, gestures, etc. */
  action: string;
  /** true = internal monologue; false = spoken / true dialogue */
  internal_monologue: boolean;
  overheard: boolean;
  fourth_wall: boolean;
}

export interface DialogueBlock extends BlockBase {
  block_type: 'dialogue';
  lines: DialogueLine[];
  template_source_id: string | null;
}

export function emptyDialogueLine(): DialogueLine {
  return {
    character_id: null,
    character_label: '',
    conversation: '',
    emotional_state: '',
    volume: '',
    subtext: '',
    action: '',
    internal_monologue: false,
    overheard: false,
    fourth_wall: false,
  };
}

export function ensureDialogueLines(lines: DialogueLine[] | null | undefined): DialogueLine[] {
  if (lines && lines.length > 0) return lines.map((line) => ({ ...emptyDialogueLine(), ...line }));
  return [emptyDialogueLine()];
}

export function isDialogueLineEmpty(line: DialogueLine): boolean {
  return (
    !line.character_id &&
    !line.character_label.trim() &&
    !line.conversation.trim() &&
    !line.emotional_state.trim() &&
    !line.volume.trim() &&
    !line.subtext.trim() &&
    !line.action.trim() &&
    !line.internal_monologue &&
    !line.overheard &&
    !line.fourth_wall
  );
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

export interface GroupBlock extends BlockBase {
  block_type: 'group';
  /** Who/what this group is (faction, crew, unit, etc.). */
  description: string;
  /** Optional opposing forces / rival factions. */
  adversaries: string;
  /** Chapter-local roster for this group instance. */
  character_ids: string[];
}

export interface ProseBuilderBlock extends BlockBase {
  block_type: 'prose_builder';
  subject: string;
  figurative_devices: FigurativeDevice[];
  figurative_devices_custom: string[];
}

export type StoryBlock =
  | SettingBlock
  | CharacterBlock
  | DialogueBlock
  | SpecialItemBlock
  | VehicleBlock
  | ToolBlock
  | GroupBlock
  | ProseBuilderBlock;

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

export interface TimelineSlot {
  id: string;
  name: string;
  subplot_id: string | null;
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
  timeline_slots: TimelineSlot[];
  writing_style_material: string;
}

export interface ReviewWarning {
  code: string;
  message: string;
  chapter_id: string | null;
  block_id: string | null;
}

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  setting: 'Setting',
  character: 'Character',
  dialogue: 'Dialogue',
  special_item: 'Special Item',
  vehicle: 'Vehicle',
  tool: 'Tool',
  group: 'Group',
  prose_builder: 'Prose Builder',
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
  'unreliable_narrator',
  'stream_of_consciousness',
  'free_indirect_discourse',
];

export const STRUCTURAL_DEVICES: { value: StructuralDevice; label: string }[] = [
  { value: 'frame_narrative', label: 'Frame narrative (Nested Storytelling)' },
  { value: 'parallel_dual_timelines', label: 'Parallel Dual Timelines' },
  { value: 'circular_cyclical', label: 'Circular / Cyclical Structure' },
  { value: 'ring_chiasmus', label: 'Ring Structure (Chiasmus)' },
  { value: 'in_medias_res', label: 'In Medias Res (In the Middle)' },
  { value: 'ab_ovo', label: 'Ab Ovo (From the Beginning)' },
];

export const PACING_DEVICES: { value: PacingDevice; label: string }[] = [
  { value: 'scene', label: 'Scene' },
  { value: 'summary', label: 'Summary' },
  { value: 'temporal_expansion', label: 'Temporal Expansion (Slow Motion / Dilation)' },
  { value: 'scene_sequel_rhythm', label: 'Scene & Sequel Rhythm' },
  { value: 'syntactic_pacing', label: 'Syntactic Pacing (Micro-Pacing)' },
  { value: 'delay_stretching_gap', label: 'Delay / Stretching the Gap' },
];

export const SUSPENSE_MECHANISMS: { value: SuspenseMechanism; label: string }[] = [
  { value: 'ticking_clock', label: 'Ticking Clock (The Countdown)' },
  { value: 'cliffhanger', label: 'Cliffhanger' },
  { value: 'information_asymmetry', label: 'Information Asymmetry (Suspense vs. Surprise)' },
  { value: 'raising_the_stakes', label: 'Raising the Stakes (Escalation)' },
  { value: 'false_haven', label: 'False Haven / False Victory' },
  { value: 'open_loops', label: 'Open Loops (The Zeigarnik Effect)' },
];

export const WRITING_TEXTURE_BUDGET = 160;

export const EMPTY_WRITING_TEXTURE: WritingTexture = {
  rule_of_three: 0,
  emotional_flatlining: 0,
  metaphor_stacking: 0,
  list_rhythm_stacking: 0,
  subject_x_vs_subject_y: 0,
  metaphor_with_personification: 0,
  clean_pivot_sentences: 0,
  over_dramatic_metaphor: 0,
  emotional_shorthand_stacking: 0,
};

export const WRITING_TEXTURE_TECHNIQUES: {
  value: WritingTextureTechnique;
  label: string;
}[] = [
  { value: 'rule_of_three', label: 'Rule of Three' },
  { value: 'emotional_flatlining', label: 'Emotional Flatlining' },
  { value: 'metaphor_stacking', label: 'Metaphor Stacking' },
  { value: 'list_rhythm_stacking', label: 'List Rhythm Stacking' },
  { value: 'subject_x_vs_subject_y', label: 'Subject X vs Subject Y contrast' },
  { value: 'metaphor_with_personification', label: 'Metaphor with Personification' },
  { value: 'clean_pivot_sentences', label: 'Clean Pivot Sentences' },
  { value: 'over_dramatic_metaphor', label: 'Over Dramatic Metaphor' },
  { value: 'emotional_shorthand_stacking', label: 'Emotional Short-hand stacking' },
];

export function writingTextureTotal(texture: WritingTexture | null | undefined): number {
  const source = texture ?? EMPTY_WRITING_TEXTURE;
  return WRITING_TEXTURE_TECHNIQUES.reduce((sum, technique) => sum + (source[technique.value] ?? 0), 0);
}

/** Number of distinct light→dark shades used for setting chips on the timeline. */
export const SETTING_COLOR_SHADE_COUNT = 8;

export function settingShadeIndex(colorVariant: number | null | undefined): number {
  const value = Number.isFinite(colorVariant) ? Number(colorVariant) : 0;
  return ((value % SETTING_COLOR_SHADE_COUNT) + SETTING_COLOR_SHADE_COUNT) % SETTING_COLOR_SHADE_COUNT;
}

export const FIGURATIVE_DEVICES: { value: FigurativeDevice; label: string }[] = [
  { value: 'metaphor', label: 'Metaphor' },
  { value: 'simile', label: 'Simile' },
  { value: 'personification', label: 'Personification' },
  { value: 'anthropomorphism', label: 'Anthropomorphism' },
  { value: 'hyperbole', label: 'Hyperbole' },
  { value: 'litotes', label: 'Litotes' },
  { value: 'metonymy', label: 'Metonymy' },
  { value: 'synecdoche', label: 'Synecdoche' },
  { value: 'oxymoron', label: 'Oxymoron' },
  { value: 'paradox', label: 'Paradox' },
  { value: 'sensory_imagery', label: 'Sensory Imagery' },
  { value: 'synesthesia', label: 'Synesthesia' },
];

export function assertNever(value: never): never {
  throw new Error(`Unhandled block type: ${JSON.stringify(value)}`);
}

export function orderedChapters(project: StoryProject): Chapter[] {
  return [...project.chapters].sort((a, b) => a.order - b.order);
}

export function labelize(value: string): string {
  return value.replace(/_/g, ' ');
}
