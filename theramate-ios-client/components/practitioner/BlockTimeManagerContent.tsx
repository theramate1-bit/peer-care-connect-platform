/**
 * Parity with web `BlockTimeManager.tsx` — quick blocks, full form (all-day,
 * recurrence), list with edit/delete.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from "react-native";
import {
  Ban,
  Calendar,
  Check,
  Clock,
  Edit,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import { endOfDay, format, parseISO, startOfDay } from "date-fns";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import {
  type BlockTimeRow,
  type RecurrenceType,
  buildBlockInsertBase,
  deleteBlock,
  fetchUpcomingBlocks,
  formatBlockTimeRange,
  generateRecurringEvents,
  insertBlocksBatch,
  insertSingleBlock,
  updateBlock,
} from "@/lib/api/blockTime";
import { Button } from "@/components/ui/Button";
import { PressableCard } from "@/components/ui/Card";

const QUICK_BLOCKS = [
  {
    label: "Lunch Break",
    title: "Lunch Break",
    duration: 60,
    eventType: "block" as const,
    Icon: Clock,
  },
  {
    label: "Personal",
    title: "Personal Appointment",
    duration: 120,
    eventType: "block" as const,
    Icon: User,
  },
  {
    label: "Unavailable",
    title: "Unavailable",
    duration: 240,
    eventType: "unavailable" as const,
    Icon: Ban,
  },
];

type FormState = {
  title: string;
  description: string;
  event_type: "block" | "unavailable";
  date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  recurrence_type: RecurrenceType;
  recurrence_end_date: string;
};

const emptyForm = (dateYmd: string): FormState => ({
  title: "",
  description: "",
  event_type: "block",
  date: dateYmd,
  start_time: "12:00",
  end_time: "13:00",
  all_day: false,
  recurrence_type: "none",
  recurrence_end_date: "",
});

function todayYmd(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function BlockTimeManagerContent({
  embedded = false,
  onChanged,
}: {
  embedded?: boolean;
  onChanged?: () => void;
}) {
  const { userId } = useAuth();
  const [blocks, setBlocks] = useState<BlockTimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBlock, setEditingBlock] = useState<BlockTimeRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<FormState>(emptyForm(todayYmd()));

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await fetchUpcomingBlocks(userId);
      if (error) throw error;
      setBlocks(data);
    } catch (e) {
      console.warn("fetchUpcomingBlocks", e);
      Alert.alert("Error", "Failed to load blocked time.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setFormData(emptyForm(todayYmd()));
    setEditingBlock(null);
    setShowForm(false);
  };

  const handleQuickBlock = (quick: (typeof QUICK_BLOCKS)[0]) => {
    const defaultStart = "12:00";
    const [h, m] = defaultStart.split(":").map(Number);
    const endTime = new Date();
    endTime.setHours(h!, (m ?? 0) + quick.duration, 0, 0);
    const defaultEnd = `${String(endTime.getHours()).padStart(2, "0")}:${String(endTime.getMinutes()).padStart(2, "0")}`;
    setFormData({
      title: quick.title,
      description: "",
      event_type: quick.eventType,
      date: todayYmd(),
      start_time: defaultStart,
      end_time: defaultEnd,
      all_day: false,
      recurrence_type: "none",
      recurrence_end_date: "",
    });
    setEditingBlock(null);
    setShowForm(true);
  };

  const handleEditBlock = (block: BlockTimeRow) => {
    const startDate = parseISO(block.start_time);
    const endDate = parseISO(block.end_time);
    setEditingBlock(block);
    setFormData({
      title: block.title,
      description: block.description || "",
      event_type: block.event_type,
      date: format(startDate, "yyyy-MM-dd"),
      start_time: format(startDate, "HH:mm"),
      end_time: format(endDate, "HH:mm"),
      all_day: false,
      recurrence_type: "none",
      recurrence_end_date: "",
    });
    setShowForm(true);
  };

  const handleDelete = (block: BlockTimeRow) => {
    if (!userId) return;
    Alert.alert("Delete blocked time?", block.title, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void (async () => {
            setDeletingId(block.id);
            const res = await deleteBlock({ blockId: block.id, userId });
            setDeletingId(null);
            if (!res.ok) {
              Alert.alert("Error", res.error?.message || "");
              return;
            }
            void load();
            onChanged?.();
          })(),
      },
    ]);
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!formData.title.trim()) {
      Alert.alert("Title required", "Please enter a title.");
      return;
    }
    if (!formData.date) {
      Alert.alert("Date required", "Please select a date.");
      return;
    }
    if (!formData.all_day && (!formData.start_time || !formData.end_time)) {
      Alert.alert("Time required", "Please enter start and end times.");
      return;
    }
    if (!formData.all_day && formData.start_time >= formData.end_time) {
      Alert.alert("Invalid range", "End time must be after start time.");
      return;
    }
    if (
      formData.recurrence_type !== "none" &&
      !formData.recurrence_end_date.trim()
    ) {
      Alert.alert(
        "Repeat until required",
        "Choose an end date for recurring blocks (YYYY-MM-DD).",
      );
      return;
    }
    const todayStr = todayYmd();
    if (!editingBlock && formData.date < todayStr) {
      Alert.alert("Date", "Choose today or a future date (same as web).");
      return;
    }

    let startTime: Date;
    let endTime: Date;
    if (formData.all_day) {
      startTime = startOfDay(new Date(formData.date + "T12:00:00"));
      endTime = endOfDay(new Date(formData.date + "T12:00:00"));
    } else {
      startTime = new Date(`${formData.date}T${formData.start_time}`);
      endTime = new Date(`${formData.date}T${formData.end_time}`);
    }

    setSaving(true);
    try {
      const base = buildBlockInsertBase(userId);

      if (formData.recurrence_type !== "none" && formData.recurrence_end_date) {
        const until = new Date(formData.recurrence_end_date + "T23:59:59");
        const events = generateRecurringEvents(
          startTime,
          endTime,
          formData.recurrence_type,
          until,
        );
        const rows = events.map((event) => ({
          ...base,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          start_time: event.start.toISOString(),
          end_time: event.end.toISOString(),
          event_type: formData.event_type,
        }));
        const res = await insertBlocksBatch(rows);
        if (!res.ok) throw res.error;
        Alert.alert("Created", `${rows.length} recurring blocks created.`);
      } else {
        const row = {
          ...base,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          event_type: formData.event_type,
        };
        if (editingBlock) {
          const res = await updateBlock({
            blockId: editingBlock.id,
            userId,
            row: {
              title: row.title,
              description: row.description,
              start_time: row.start_time,
              end_time: row.end_time,
              event_type: row.event_type,
              status: row.status,
              provider: row.provider,
            },
          });
          if (!res.ok) throw res.error;
          Alert.alert("Saved", "Blocked time updated.");
        } else {
          const res = await insertSingleBlock(row);
          if (!res.ok) throw res.error;
          Alert.alert("Saved", "Blocked time created.");
        }
      }
      resetForm();
      void load();
      onChanged?.();
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <View className="py-8 px-4">
        <Text className="text-charcoal-600 text-center">Sign in required.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View className="py-16 items-center">
        <ActivityIndicator size="large" color={Colors.sage[500]} />
        <Text className="text-charcoal-500 mt-3">Loading blocked time…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
    >
      {!embedded ? (
        <View className="mb-4 px-1">
          <Text className="text-charcoal-900 text-xl font-semibold">
            Blocked time
          </Text>
          <Text className="text-charcoal-500 text-sm mt-1 leading-5">
            One-off blocks (lunch, appointments, unavailability). Same as web —
            removed from bookable slots, separate from weekly hours.
          </Text>
        </View>
      ) : null}

      {!showForm ? (
        <View className="bg-white border border-cream-200 rounded-2xl p-4 mb-6">
          <Text className="text-charcoal-800 font-semibold text-sm mb-3">
            Quick add
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {QUICK_BLOCKS.map((q) => {
              const Icon = q.Icon;
              return (
                <TouchableOpacity
                  key={q.label}
                  className="flex-row items-center bg-cream-50 border border-cream-200 rounded-xl px-3 py-2"
                  onPress={() => handleQuickBlock(q)}
                >
                  <Icon size={16} color={Colors.sage[600]} />
                  <Text className="text-charcoal-800 font-medium text-sm ml-2">
                    {q.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              className="flex-row items-center bg-sage-500 rounded-xl px-3 py-2 ml-auto"
              onPress={() => {
                setFormData((prev) => ({ ...prev, date: todayYmd() }));
                setEditingBlock(null);
                setShowForm(true);
              }}
            >
              <Plus size={18} color={Colors.white} />
              <Text className="text-white font-semibold text-sm ml-1">
                Custom block
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {showForm ? (
        <View className="bg-white border-2 border-sage-300 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Calendar size={20} color={Colors.sage[600]} />
              <Text className="text-charcoal-900 text-lg font-semibold">
                {editingBlock ? "Edit blocked time" : "Block time"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={resetForm}
              className="p-2"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={22} color={Colors.charcoal[600]} />
            </TouchableOpacity>
          </View>

          <Text className="text-charcoal-700 text-sm mb-1">Title *</Text>
          <TextInput
            className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
            value={formData.title}
            onChangeText={(t) => setFormData((p) => ({ ...p, title: t }))}
            placeholder="e.g. Lunch break"
            placeholderTextColor={Colors.charcoal[400]}
          />

          <Text className="text-charcoal-700 text-sm mb-1">Type</Text>
          <View className="flex-row gap-2 mb-3">
            {(
              [
                ["block", "Block"],
                ["unavailable", "Unavailable"],
              ] as const
            ).map(([val, label]) => (
              <TouchableOpacity
                key={val}
                className={`flex-1 py-3 rounded-xl border items-center ${
                  formData.event_type === val
                    ? "bg-sage-500 border-sage-500"
                    : "bg-white border-cream-200"
                }`}
                onPress={() => setFormData((p) => ({ ...p, event_type: val }))}
              >
                <Text
                  className={`font-semibold ${
                    formData.event_type === val
                      ? "text-white"
                      : "text-charcoal-800"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-charcoal-700 text-sm mb-1">
            Description (optional)
          </Text>
          <TextInput
            className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3 min-h-[72px]"
            value={formData.description}
            onChangeText={(t) => setFormData((p) => ({ ...p, description: t }))}
            multiline
            textAlignVertical="top"
            placeholderTextColor={Colors.charcoal[400]}
          />

          <Text className="text-charcoal-700 text-sm mb-1">
            Date * (YYYY-MM-DD)
          </Text>
          <TextInput
            className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-3"
            value={formData.date}
            onChangeText={(t) => setFormData((p) => ({ ...p, date: t }))}
            autoCapitalize="none"
          />

          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-charcoal-800 font-medium">All day</Text>
            <Switch
              value={formData.all_day}
              onValueChange={(v) => setFormData((p) => ({ ...p, all_day: v }))}
            />
          </View>

          {!formData.all_day ? (
            <View className="flex-row gap-3 mb-3">
              <View className="flex-1">
                <Text className="text-charcoal-700 text-sm mb-1">Start *</Text>
                <TextInput
                  className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
                  value={formData.start_time}
                  onChangeText={(t) =>
                    setFormData((p) => ({ ...p, start_time: t }))
                  }
                />
              </View>
              <View className="flex-1">
                <Text className="text-charcoal-700 text-sm mb-1">End *</Text>
                <TextInput
                  className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900"
                  value={formData.end_time}
                  onChangeText={(t) =>
                    setFormData((p) => ({ ...p, end_time: t }))
                  }
                />
              </View>
            </View>
          ) : null}

          <Text className="text-charcoal-700 text-sm mb-1">Recurrence</Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {(
              [
                ["none", "None"],
                ["daily", "Daily"],
                ["weekly", "Weekly"],
                ["monthly", "Monthly"],
              ] as const
            ).map(([val, label]) => (
              <TouchableOpacity
                key={val}
                className={`px-3 py-2 rounded-xl border ${
                  formData.recurrence_type === val
                    ? "bg-sage-500 border-sage-500"
                    : "bg-white border-cream-200"
                }`}
                onPress={() =>
                  setFormData((p) => ({ ...p, recurrence_type: val }))
                }
              >
                <Text
                  className={`text-sm font-medium ${
                    formData.recurrence_type === val
                      ? "text-white"
                      : "text-charcoal-800"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {formData.recurrence_type !== "none" ? (
            <>
              <Text className="text-charcoal-700 text-sm mb-1">
                Repeat until * (YYYY-MM-DD)
              </Text>
              <TextInput
                className="bg-cream-50 border border-cream-200 rounded-xl px-4 py-3 text-charcoal-900 mb-4"
                value={formData.recurrence_end_date}
                onChangeText={(t) =>
                  setFormData((p) => ({ ...p, recurrence_end_date: t }))
                }
                autoCapitalize="none"
              />
            </>
          ) : null}

          <View className="flex-row justify-end gap-2 mt-2">
            <Button variant="outline" onPress={resetForm}>
              <Text className="text-charcoal-800 font-semibold">Cancel</Text>
            </Button>
            <Button
              variant="primary"
              disabled={saving}
              onPress={() => void handleSave()}
            >
              <Text className="text-white font-semibold">
                {saving ? "Saving…" : editingBlock ? "Update" : "Create"}
              </Text>
            </Button>
          </View>
        </View>
      ) : null}

      {blocks.length === 0 ? (
        <View className="border-2 border-dashed border-cream-300 rounded-2xl p-10 items-center">
          <Calendar size={40} color={Colors.charcoal[300]} />
          <Text className="text-charcoal-800 font-medium text-center mt-4">
            No blocked time configured
          </Text>
          <Text className="text-charcoal-500 text-sm text-center mt-2 leading-5">
            Use quick actions above to add lunch breaks, personal time, or
            custom blocks — same as web.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {blocks.map((block) => (
            <PressableCard
              key={block.id}
              variant="default"
              padding="md"
              className="border border-cream-200"
            >
              <View className="flex-row justify-between gap-3">
                <View className="flex-1 min-w-0">
                  <View className="flex-row items-center gap-2 flex-wrap">
                    <Text
                      className="text-charcoal-900 font-semibold shrink"
                      numberOfLines={2}
                    >
                      {block.title}
                    </Text>
                    <View
                      className={`px-2 py-0.5 rounded-full ${
                        block.event_type === "block"
                          ? "bg-sage-100"
                          : "bg-charcoal-100"
                      }`}
                    >
                      <Text className="text-xs font-medium text-charcoal-700">
                        {block.event_type === "block" ? "Block" : "Unavailable"}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-2 mt-2">
                    <Clock size={14} color={Colors.charcoal[400]} />
                    <Text
                      className="text-charcoal-500 text-sm flex-1"
                      numberOfLines={2}
                    >
                      {formatBlockTimeRange(block)}
                    </Text>
                  </View>
                  {block.description ? (
                    <Text
                      className="text-charcoal-500 text-sm mt-2"
                      numberOfLines={3}
                    >
                      {block.description}
                    </Text>
                  ) : null}
                </View>
                <View className="flex-row items-start gap-1">
                  <TouchableOpacity
                    className="p-2"
                    onPress={() => handleEditBlock(block)}
                    accessibilityLabel="Edit block"
                  >
                    <Edit size={20} color={Colors.sage[600]} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="p-2"
                    onPress={() => handleDelete(block)}
                    disabled={deletingId === block.id}
                  >
                    {deletingId === block.id ? (
                      <ActivityIndicator size="small" color={Colors.error} />
                    ) : (
                      <Trash2 size={20} color={Colors.error} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </PressableCard>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
