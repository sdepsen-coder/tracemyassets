import iconList from "./iconNames.json";

/**
 * Stylesheet for the Material Symbols icon font, limited to the icons the
 * site uses (see scripts/icons.mjs). The full font is about 4 MB and held up
 * the first paint by many seconds; this subset is a few KB. The names must be
 * in alphabetical order for the font service.
 *
 * font-display "block": while the small font loads the icon is invisible
 * instead of showing its name as text.
 */
const names = [...new Set([...iconList.names, ...iconList.extra])].sort();

export const ICON_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:" +
  "opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" +
  `&icon_names=${names.join(",")}&display=block`;
