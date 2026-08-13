"""Canonical character-archetype catalog."""

from __future__ import annotations

from typing import TypedDict


class CharacterArchetype(TypedDict):
    id: str
    label: str
    description: str


# Descriptions are kept short for dropdown lines.
CHARACTER_ARCHETYPES: tuple[CharacterArchetype, ...] = (
    {
        "id": 'rogue_with_a_heart_of_gold',
        "label": 'The Rogue With a Heart of Gold',
        "description": 'Seems selfish, but risks all for a just cause.',
    },
    {
        "id": 'rebellious_hero',
        "label": 'The Rebellious Hero',
        "description": 'Defies authority from a deeper moral sense.',
    },
    {
        "id": 'disguised_stranger',
        "label": 'The Disguised Stranger',
        "description": 'Hides identity until a pivotal reveal.',
    },
    {
        "id": 'wandering_bard',
        "label": 'The Wandering Bard',
        "description": 'Roaming storyteller who quietly shapes events.',
    },
    {
        "id": 'broken_optimist',
        "label": 'The Broken Optimist',
        "description": 'Jaded by life, fighting to reclaim hope.',
    },
    {
        "id": 'gentle_giant',
        "label": 'The Gentle Giant',
        "description": 'Imposing body, soft heart.',
    },
    {
        "id": 'reluctant_warrior',
        "label": 'The Reluctant Warrior',
        "description": 'Prefers peace; fierce when forced to fight.',
    },
    {
        "id": 'seeker_of_vengeance',
        "label": 'The Seeker of Vengeance',
        "description": 'Revenge-driven; questions the cost of payback.',
    },
    {
        "id": 'cursed_wanderer',
        "label": 'The Cursed Wanderer',
        "description": 'Doomed to roam under curse or tragic past.',
    },
    {
        "id": 'melancholic_dreamer',
        "label": 'The Melancholic Dreamer',
        "description": 'Lost in ethereal thought, often to their cost.',
    },
    {
        "id": 'enigmatic_scholar',
        "label": 'The Enigmatic Scholar',
        "description": 'Vast knowledge, revealed only in rare moments.',
    },
    {
        "id": 'fallen_hero',
        "label": 'The Fallen Hero',
        "description": 'Once revered; brought low by flaw or fate.',
    },
    {
        "id": 'scheming_artisan',
        "label": 'The Scheming Artisan',
        "description": 'Craft used for dubious or malicious ends.',
    },
    {
        "id": 'leader_with_a_dark_secret',
        "label": 'The Leader with a Dark Secret',
        "description": 'Commands followers while hiding a vital truth.',
    },
    {
        "id": 'outlaw_out_for_justice',
        "label": 'The Outlaw Out for Justice',
        "description": 'Outside the law in service of a just cause.',
    },
    {
        "id": 'silent_observer',
        "label": 'The Silent Observer',
        "description": 'Few words; actions and insights carry weight.',
    },
    {
        "id": 'ethereal_mystic',
        "label": 'The Ethereal Mystic',
        "description": 'Spiritually attuned guide or warner.',
    },
    {
        "id": 'enigmatic_stranger',
        "label": 'The Enigmatic Stranger',
        "description": 'Appears suddenly; identity and aims unclear.',
    },
    {
        "id": 'puppet_master',
        "label": 'The Puppet Master',
        "description": 'Shadows manipulate people and events.',
    },
    {
        "id": 'defiant_artist',
        "label": 'The Defiant Artist',
        "description": 'Art as rebellion against norms or power.',
    },
    {
        "id": 'nurturing_guardian',
        "label": 'The Nurturing Guardian',
        "description": 'Protects others, often at personal cost.',
    },
    {
        "id": 'dreamer_awakened',
        "label": 'The Dreamer Awakened',
        "description": 'Fantasy shattered; forced into reality.',
    },
    {
        "id": 'fallen_noble',
        "label": 'The Fallen Noble',
        "description": 'Lost rank or glory; seeks return or redemption.',
    },
    {
        "id": 'merchant_with_a_code',
        "label": 'The Merchant with a Code',
        "description": 'Trades by a strict personal ethic.',
    },
    {
        "id": 'charming_scoundrel',
        "label": 'The Charming Scoundrel',
        "description": 'Crime or gray deeds done with wit and charm.',
    },
    {
        "id": 'ethical_adversary',
        "label": 'The Ethical Adversary',
        "description": 'Opposes the hero from conflicting honor.',
    },
    {
        "id": 'reviled_martyr',
        "label": 'The Reviled Martyr',
        "description": 'Sacrifices for good, met with scorn.',
    },
    {
        "id": 'mirror_twin',
        "label": 'The Mirror Twin',
        "description": "Double that exposes another's hidden self.",
    },
    {
        "id": 'hopeful_outlander',
        "label": 'The Hopeful Outlander',
        "description": 'Outsider whose optimism challenges the status quo.',
    },
    {
        "id": 'mournful_avenger',
        "label": 'The Mournful Avenger',
        "description": 'Vengeance fueled by grief more than rage.',
    },
    {
        "id": 'lighthearted_sage',
        "label": 'The Lighthearted Sage',
        "description": 'Wisdom delivered with humor and ease.',
    },
    {
        "id": 'reclusive_genius',
        "label": 'The Reclusive Genius',
        "description": 'Brilliant but withdrawn from society.',
    },
    {
        "id": 'sentinel_at_the_end',
        "label": 'The Sentinel at the End',
        "description": 'Guards the final threshold or trial.',
    },
    {
        "id": 'orphan_seeking_kin',
        "label": 'The Orphan Seeking Kin',
        "description": 'Quest for origins intertwined with larger stakes.',
    },
    {
        "id": 'masked_avenger',
        "label": 'The Masked Avenger',
        "description": 'Hidden identity in pursuit of justice.',
    },
    {
        "id": 'wild_card',
        "label": 'The Wild Card',
        "description": 'Unpredictable loyalties that unsettle the plot.',
    },
    {
        "id": 'naive_idealist',
        "label": 'The Naive Idealist',
        "description": 'Believes in inherent good—triumph and peril.',
    },
    {
        "id": 'brooding_loner',
        "label": 'The Brooding Loner',
        "description": 'Haunted solitude, pulled back into the world.',
    },
    {
        "id": 'resilient_survivor',
        "label": 'The Resilient Survivor',
        "description": 'Trauma endured; path of healing and grit.',
    },
    {
        "id": 'curious_explorer',
        "label": 'The Curious Explorer',
        "description": 'Thirst for the unknown drives the journey.',
    },
    {
        "id": 'playful_trickster',
        "label": 'The Playful Trickster',
        "description": 'Wit and pranks without pure malice.',
    },
    {
        "id": 'aging_warrior',
        "label": 'The Aging Warrior',
        "description": 'Past prime; mentor or last great venture.',
    },
    {
        "id": 'benevolent_guide',
        "label": 'The Benevolent Guide',
        "description": 'Otherworldly or mystical mentor.',
    },
    {
        "id": 'outcast_with_a_secret',
        "label": 'The Outcast with a Secret',
        "description": 'Shunned, yet holding key knowledge or power.',
    },
    {
        "id": 'determined_inventor',
        "label": 'The Determined Inventor',
        "description": 'Constant creation—breakthrough or disaster.',
    },
    {
        "id": 'cynic_with_a_hidden_heart',
        "label": 'The Cynic with a Hidden Heart',
        "description": 'Jaded shell over deep passion or kindness.',
    },
    {
        "id": 'guardian_at_the_crossroads',
        "label": 'The Guardian at the Crossroads',
        "description": 'Tests who may pass or claim what they guard.',
    },
    {
        "id": 'time_tested_friend',
        "label": 'The Time-Tested Friend',
        "description": 'Long loyalty bridging past and present.',
    },
    {
        "id": 'wanderer_with_no_past',
        "label": 'The Wanderer with No Past',
        "description": 'Arrives without history; becomes essential.',
    },
    {
        "id": 'prophet_of_doom',
        "label": 'The Prophet of Doom',
        "description": 'Dire warnings dismissed until they come true.',
    },
    {
        "id": 'relentless_pursuer',
        "label": 'The Relentless Pursuer',
        "description": 'Stops at nothing to hunt the target down.',
    },
    {
        "id": 'enthusiastic_amateur',
        "label": 'The Enthusiastic Amateur',
        "description": 'Skill thin; passion and nerve fill the gap.',
    },
    {
        "id": 'virtuous_outcast',
        "label": 'The Virtuous Outcast',
        "description": "Moral code intact despite society's rejection.",
    },
    {
        "id": 'disguised_ruler',
        "label": 'The Disguised Ruler',
        "description": 'Royalty hidden among the people.',
    },
    {
        "id": 'dreamer_bound_by_reality',
        "label": 'The Dreamer Bound by Reality',
        "description": 'Aspires beyond reach; bittersweet outcomes.',
    },
    {
        "id": 'fallen_mentor',
        "label": 'The Fallen Mentor',
        "description": 'Guide who lost the way—warning or redeemable.',
    },
    {
        "id": 'ambiguous_ally',
        "label": 'The Ambiguous Ally',
        "description": 'Allegiance unclear until late in the story.',
    },
    {
        "id": 'pacifist_warrior',
        "label": 'The Pacifist Warrior',
        "description": 'Deadly skilled, fights only when necessary.',
    },
    {
        "id": 'altruistic_thief',
        "label": 'The Altruistic Thief',
        "description": 'Steals to right wrongs or share wealth.',
    },
    {
        "id": 'disillusioned_dreamer',
        "label": 'The Disillusioned Dreamer',
        "description": 'Ideals broken into a colder worldview.',
    },
    {
        "id": 'benevolent_conqueror',
        "label": 'The Benevolent Conqueror',
        "description": 'Expansion aimed at peace or order.',
    },
    {
        "id": 'broken_peacemaker',
        "label": 'The Broken Peacemaker',
        "description": 'Seeks peace while wrestling private wounds.',
    },
    {
        "id": 'seeker_of_forbidden_truths',
        "label": 'The Seeker of Forbidden Truths',
        "description": 'Unearths what others want buried.',
    },
    {
        "id": 'ethical_mercenary',
        "label": 'The Ethical Mercenary',
        "description": 'For hire, but bound by a personal code.',
    },
    {
        "id": 'tinkerer_at_the_crossroads',
        "label": 'The Tinkerer at the Crossroads',
        "description": 'Tweaks and inventions that tip fate.',
    },
    {
        "id": 'displaced_noble',
        "label": 'The Displaced Noble',
        "description": 'Privilege lost; humility teaches hard lessons.',
    },
    {
        "id": 'tormented_artist',
        "label": 'The Tormented Artist',
        "description": 'Great art born of demons or misunderstanding.',
    },
    {
        "id": 'echo_from_the_past',
        "label": 'The Echo from the Past',
        "description": 'Old era or mindset colliding with now.',
    },
    {
        "id": 'defender_of_the_lost_cause',
        "label": 'The Defender of the Lost Cause',
        "description": 'Fights on when others call it futile.',
    },
    {
        "id": 'hidden_mastermind',
        "label": 'The Hidden Mastermind',
        "description": 'Influence felt; identity and aims concealed.',
    },
    {
        "id": 'star_crossed_lovers',
        "label": 'The Star-Crossed Lovers',
        "description": 'Deep love doomed by outside forces.',
    },
    {
        "id": 'loyal_retainer',
        "label": 'The Loyal Retainer',
        "description": 'Unwavering support at personal risk.',
    },
    {
        "id": 'forgotten_chronicler',
        "label": 'The Forgotten Chronicler',
        "description": 'Records overlooked truths and other histories.',
    },
)

CHARACTER_ARCHETYPE_IDS: frozenset[str] = frozenset(
    item["id"] for item in CHARACTER_ARCHETYPES
)
CHARACTER_ARCHETYPE_BY_ID: dict[str, CharacterArchetype] = {
    item["id"]: item for item in CHARACTER_ARCHETYPES
}


def character_archetype_label(archetype_id: str) -> str:
    item = CHARACTER_ARCHETYPE_BY_ID.get(archetype_id)
    return item["label"] if item else archetype_id

