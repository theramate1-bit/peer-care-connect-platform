import React from "react";
import {
  ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";

type Props = ScrollViewProps & {
  extraBottomPadding?: number;
};

export function TabScreenScroll({
  extraBottomPadding = 24,
  contentContainerStyle,
  ...props
}: Props) {
  const { contentPaddingBottom } = useTabScreenInsets(extraBottomPadding);

  return (
    <ScrollView
      {...props}
      contentContainerStyle={
        [
          { paddingBottom: contentPaddingBottom },
          contentContainerStyle,
        ] as StyleProp<ViewStyle>
      }
    />
  );
}
