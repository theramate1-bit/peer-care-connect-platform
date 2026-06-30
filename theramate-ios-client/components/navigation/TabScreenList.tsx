import React from "react";
import {
  FlatList,
  type FlatListProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { useTabScreenInsets } from "@/hooks/useTabScreenInsets";

type Props<ItemT> = FlatListProps<ItemT> & {
  extraBottomPadding?: number;
};

export function TabScreenList<ItemT>({
  extraBottomPadding = 24,
  contentContainerStyle,
  ...props
}: Props<ItemT>) {
  const { contentPaddingBottom } = useTabScreenInsets(extraBottomPadding);

  return (
    <FlatList
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
