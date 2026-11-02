import bhagavadGitaCover from "@assets/Bhagavad_Gita_1777363806053.png";
import vedasCover from "@assets/The_Vedas_1777363806056.png";
import upanishadsCover from "@assets/The_Upanishads_1777363806056.png";
import dhammapadaCover from "@assets/The_Dhammapada_1777363806056.png";
import kjvCover from "@assets/Bible_KJV_1777363806054.png";
import scofieldCover from "@assets/Bible_Scofield_1777363806054.png";
import psalmsCover from "@assets/Psalms_1777363806055.png";
import tanakhCover from "@assets/Tanakh_1777363806055.png";
import torahCover from "@assets/Torah_1777363806056.png";
import talmudCover from "@assets/Talmud_1777363806055.png";
import quranCover from "@assets/Quran_1777363806055.png";
import bukhariCover from "@assets/Sahih_Al-Bukhari_1777363806055.png";
import muslimCover from "@assets/Sahih_Muslim_1777363806055.png";
import kojikiCover from "@assets/Kojiki_1777363806055.png";
import guruGranthSahibCover from "@assets/Shri_Guru_Granth_Sahib_1777363806055.png";

export const BOOK_COVERS: Record<string, string> = {
  "bhagavad-gita-as-it-is": bhagavadGitaCover,
  "the-four-vedas": vedasCover,
  "upanishads-roebuck": upanishadsCover,
  "dhammapada-carter": dhammapadaCover,
  "kjv-illustrated": kjvCover,
  "scofield-reference-bible": scofieldCover,
  "psalms-vangemeren": psalmsCover,
  tanakh: tanakhCover,
  "torah-abram": torahCover,
  talmud: talmudCover,
  "clear-quran": quranCover,
  "sahih-al-bukhari": bukhariCover,
  "sahih-muslim": muslimCover,
  kojiki: kojikiCover,
  "guru-granth-sahib": guruGranthSahibCover,
};

export function getBookCover(bookId: string): string | undefined {
  return BOOK_COVERS[bookId];
}
