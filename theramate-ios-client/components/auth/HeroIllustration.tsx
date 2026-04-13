import React from "react";
import { View, useWindowDimensions, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";

import { Colors } from "@/constants/colors";
import { MASSAGE_THERAPIST_HERO_SVG } from "@/components/auth/massageTherapistHeroSvg";

/** viewBox 750×500 → height / width */
const VIEW_ASPECT = 500 / 750;

function themedMassageSvg(): string {
  return MASSAGE_THERAPIST_HERO_SVG.replace(/#6c63ff/gi, Colors.sage[500]).replace(
    /#ff725e/gi,
    Colors.sage[500],
  );
}

type Props = {
  /** Caps vertical size so hero + actions fit on short phones. */
  maxHeight?: number;
};

export function HeroIllustration({ maxHeight = 240 }: Props) {
  const { width } = useWindowDimensions();
  const xml = React.useMemo(() => themedMassageSvg(), []);

  const maxW = Math.min(width - 48, 340);
  let h = maxW * VIEW_ASPECT;
  let w = maxW;
  if (h > maxHeight) {
    h = maxHeight;
    w = h / VIEW_ASPECT;
  }

  return (
    <View
      style={styles.wrap}
      accessibilityRole="image"
      accessibilityLabel="Massage therapy illustration"
    >
      <SvgXml xml={xml} width={w} height={h} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
