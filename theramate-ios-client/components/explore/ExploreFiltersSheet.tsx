import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";
import { X } from "lucide-react-native";

import { Colors } from "@/constants/colors";

export type TherapistTypeFilter = "clinic_based" | "mobile" | "hybrid" | null;
export type ExploreSortKey = "rating" | "price" | "reviews";

export type ExploreFilters = {
  therapistType: TherapistTypeFilter;
  acceptsInPersonOnly: boolean;
  sortBy: ExploreSortKey;
};

type Props = {
  visible: boolean;
  filters: ExploreFilters;
  onChange: (next: ExploreFilters) => void;
  onClose: () => void;
  onApply: () => void;
  onReset: () => void;
};

const DELIVERY_OPTIONS: { value: TherapistTypeFilter; label: string }[] = [
  { value: null, label: "Any" },
  { value: "clinic_based", label: "Clinic" },
  { value: "mobile", label: "Mobile visit" },
  { value: "hybrid", label: "Hybrid" },
];

const SORT_OPTIONS: { value: ExploreSortKey; label: string }[] = [
  { value: "rating", label: "Highest rated" },
  { value: "price", label: "Lowest price" },
  { value: "reviews", label: "Most reviews" },
];

function Chip({
  selected,
  label,
  onPress,
}: {
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-4 py-2 rounded-full border mr-2 mb-2 ${
        selected ? "bg-sage-500 border-sage-500" : "bg-white border-cream-300"
      }`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text
        className={`text-sm font-medium ${
          selected ? "text-white" : "text-charcoal-700"
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function ExploreFiltersSheet({
  visible,
  filters,
  onChange,
  onClose,
  onApply,
  onReset,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onPress={onClose}
      >
        <Pressable
          className="bg-cream-50 rounded-t-3xl"
          style={{ maxHeight: "80%" }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between px-6 pt-5 pb-3 border-b border-cream-200">
            <Text className="text-charcoal-900 text-lg font-bold">Filters</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Close filters"
            >
              <X size={22} color={Colors.charcoal[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-6 py-4" keyboardShouldPersistTaps="handled">
            <Text className="text-charcoal-800 font-semibold mb-2">
              Service delivery
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {DELIVERY_OPTIONS.map((opt) => (
                <Chip
                  key={opt.label}
                  label={opt.label}
                  selected={filters.therapistType === opt.value}
                  onPress={() =>
                    onChange({ ...filters, therapistType: opt.value })
                  }
                />
              ))}
            </View>

            <Text className="text-charcoal-800 font-semibold mb-2">
              Sort by
            </Text>
            <View className="flex-row flex-wrap mb-4">
              {SORT_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={filters.sortBy === opt.value}
                  onPress={() => onChange({ ...filters, sortBy: opt.value })}
                />
              ))}
            </View>

            <TouchableOpacity
              className={`px-4 py-3 rounded-xl border mb-6 ${
                filters.acceptsInPersonOnly
                  ? "bg-sage-50 border-sage-400"
                  : "bg-white border-cream-300"
              }`}
              onPress={() =>
                onChange({
                  ...filters,
                  acceptsInPersonOnly: !filters.acceptsInPersonOnly,
                })
              }
              accessibilityRole="checkbox"
              accessibilityState={{ checked: filters.acceptsInPersonOnly }}
            >
              <Text className="text-charcoal-800 font-medium">
                Pay at clinic only
              </Text>
              <Text className="text-charcoal-500 text-sm mt-1">
                Show therapists who accept in-person payment at the clinic
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <View className="flex-row gap-3 px-6 pb-8 pt-2 border-t border-cream-200">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl border border-cream-300 bg-white"
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel="Reset filters"
            >
              <Text className="text-center text-charcoal-700 font-semibold">
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl bg-sage-500"
              onPress={onApply}
              accessibilityRole="button"
              accessibilityLabel="Apply filters"
            >
              <Text className="text-center text-white font-semibold">
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
  therapistType: null,
  acceptsInPersonOnly: false,
  sortBy: "rating",
};
