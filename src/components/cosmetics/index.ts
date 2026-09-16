import type { ReactElement } from "react";
import type { ArtProps } from "@/components/art/Plate";
import {
  BeakedMaskAvatar,
  CandleBearerAvatar,
  CatAvatar,
  DeepHoodAvatar,
  DovAvatar,
  HalfMaskAvatar,
  LanternHoodAvatar,
  PlainHoodAvatar,
  RavenAvatar,
  ScribeAvatar,
  TallHatAvatar,
  VeiledAvatar,
  WardenAvatar,
  WideHatAvatar,
} from "./Avatars";
import {
  BramblesFrame,
  CandleRingFrame,
  ChainFrame,
  CrackedStoneFrame,
  GildedFrame,
  IronFrame,
  RopeFrame,
  WaxSealFrame,
} from "./Frames";
import {
  CastOutBadge,
  CleanHandsBadge,
  CompanyOfFiveBadge,
  FirstCandleBadge,
  LongNightBadge,
  SeasonFrostWatchBadge,
  SeasonLongNightBadge,
  SilverTongueBadge,
  TwoFacesBadge,
  UnmaskedBadge,
} from "./Badges";
import { BellEmote, BrokenSealEmote, MaskSlipEmote, RaisedCupEmote, SlowClapEmote, SnuffEmote } from "./Emotes";

export { CARET_COLORS } from "./carets";
export { THEME_VARS, themeCss } from "./themes";
export { TitleLine } from "./Titles";

/**
 * Every drawn cosmetic, by the `art` id in src/economy/catalog.ts. Titles are text, carets are a
 * colour and themes are a token set, so those three kinds are absent here and have their own
 * exports above.
 */
const ART: Readonly<Record<string, (props: ArtProps) => ReactElement>> = {
  "avatar-hooded-scribe": ScribeAvatar,
  "avatar-plain-hood": PlainHoodAvatar,
  "avatar-deep-hood": DeepHoodAvatar,
  "avatar-veiled": VeiledAvatar,
  "avatar-wide-hat": WideHatAvatar,
  "avatar-tall-hat": TallHatAvatar,
  "avatar-half-mask": HalfMaskAvatar,
  "avatar-beaked-mask": BeakedMaskAvatar,
  "avatar-raven": RavenAvatar,
  "avatar-candle-bearer": CandleBearerAvatar,
  "avatar-lantern-hood": LanternHoodAvatar,
  "avatar-warden": WardenAvatar,
  "avatar-dov": DovAvatar,
  "avatar-cat": CatAvatar,
  "frame-rope": RopeFrame,
  "frame-iron": IronFrame,
  "frame-wax-seal": WaxSealFrame,
  "frame-brambles": BramblesFrame,
  "frame-chain": ChainFrame,
  "frame-cracked-stone": CrackedStoneFrame,
  "frame-gilded": GildedFrame,
  "frame-candle-ring": CandleRingFrame,
  "badge-first-candle": FirstCandleBadge,
  "badge-company-of-five": CompanyOfFiveBadge,
  "badge-unmasked": UnmaskedBadge,
  "badge-silver-tongue": SilverTongueBadge,
  "badge-clean-hands": CleanHandsBadge,
  "badge-cast-out": CastOutBadge,
  "badge-long-night": LongNightBadge,
  "badge-two-faces": TwoFacesBadge,
  "badge-season-long-night": SeasonLongNightBadge,
  "badge-season-frost-watch": SeasonFrostWatchBadge,
  "emote-snuff": SnuffEmote,
  "emote-bell": BellEmote,
  "emote-raised-cup": RaisedCupEmote,
  "emote-slow-clap": SlowClapEmote,
  "emote-broken-seal": BrokenSealEmote,
  "emote-mask-slip": MaskSlipEmote,
};

/** The drawing for a catalog `art` id, or null for a title, a caret, a theme or an id with no art. */
export function cosmeticArt(artId: string): ((props: ArtProps) => ReactElement) | null {
  return ART[artId] ?? null;
}

/** What a guest with no loadout wears: the hood the Company issues, in a plain rope ring. */
export const GUEST_AVATAR = PlainHoodAvatar;
export const GUEST_FRAME = RopeFrame;
