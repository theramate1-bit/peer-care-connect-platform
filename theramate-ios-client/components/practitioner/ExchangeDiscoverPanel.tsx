/**
 * Discover peers in your rating tier and send a treatment exchange request (web parity).
 */

import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Switch,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react-native";

import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyCredits } from "@/lib/api/credits";
import { THERAPIST_ROLES } from "@/lib/api/marketplace";
import {
  fetchEligibleExchangePractitioners,
  fetchRequesterRatingTier,
  ratingTier,
  sendTreatmentExchangeRequest,
  type EligibleExchangePractitioner,
} from "@/lib/api/treatmentExchangeDiscovery";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120];

function roleLabel(role: string | null): string {
  switch (role) {
    case "sports_therapist":
      return "Sports therapist";
    case "osteopath":
      return "Osteopath";
    case "massage_therapist":
      return "Massage therapist";
    default:
      return role ?? "Therapist";
  }
}

function tierLabel(t: 0 | 1 | 2): string {
  if (t === 2) return "4–5★ tier";
  if (t === 1) return "2–3★ tier";
  return "0–1★ tier";
}

type Props = {
  userId: string;
};

export function ExchangeDiscoverPanel({ userId }: Props) {
  const { userProfile, updateProfile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    (typeof THERAPIST_ROLES)[number] | "all"
  >("all");

  const optIn = userProfile?.treatment_exchange_opt_in === true;
  const [toggleBusy, setToggleBusy] = useState(false);

  const creditsQuery = useQuery({
    queryKey: ["credits", userId],
    queryFn: async () => {
      const { data, error } = await fetchMyCredits(userId);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const eligibleQuery = useQuery({
    queryKey: ["exchange_eligible", userId],
    queryFn: async () => {
      const { data, error } = await fetchEligibleExchangePractitioners({
        requesterId: userId,
      });
      if (error) throw error;
      return data;
    },
    enabled: !!userId && optIn,
  });

  const myTierQuery = useQuery({
    queryKey: ["exchange_my_tier", userId],
    queryFn: async () => {
      const { tier, error } = await fetchRequesterRatingTier(userId);
      if (error) throw error;
      return tier;
    },
    enabled: !!userId,
  });

  const myTier = myTierQuery.data ?? 0;

  const filtered = useMemo(() => {
    let list: EligibleExchangePractitioner[] = eligibleQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase();
        const svc = (p.services_offered ?? []).join(" ").toLowerCase();
        return (
          name.includes(q) ||
          svc.includes(q) ||
          (p.location ?? "").toLowerCase().includes(q)
        );
      });
    }
    if (roleFilter !== "all") {
      list = list.filter((p) => p.user_role === roleFilter);
    }
    return list;
  }, [eligibleQuery.data, search, roleFilter]);

  const balance =
    creditsQuery.data?.current_balance ?? creditsQuery.data?.balance ?? 0;

  const onToggleOptIn = async (next: boolean) => {
    setToggleBusy(true);
    try {
      const res = await updateProfile({ treatment_exchange_opt_in: next });
      if (!res.success) {
        Alert.alert("Could not update", res.error || "Try again.");
        return;
      }
      await queryClient.invalidateQueries({
        queryKey: ["exchange_eligible", userId],
      });
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <View>
      <Card variant="default" padding="md" className="mb-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-charcoal-900 font-semibold">
              Join treatment exchange
            </Text>
            <Text className="text-charcoal-500 text-sm mt-1 leading-5">
              When enabled, peers in your rating tier ({tierLabel(myTier)}) can
              find you, and you can send requests. One credit per minute when a
              swap is accepted.
            </Text>
          </View>
          <Switch
            value={optIn}
            onValueChange={(v) => void onToggleOptIn(v)}
            disabled={toggleBusy}
            trackColor={{ false: Colors.cream[300], true: Colors.sage[400] }}
            thumbColor={Colors.cream[50]}
          />
        </View>
        <View className="flex-row items-center mt-4 pt-4 border-t border-cream-200">
          <Users size={18} color={Colors.sage[600]} />
          <Text className="text-charcoal-800 ml-2">
            Credits:{" "}
            <Text className="font-semibold">
              {creditsQuery.isLoading ? "…" : String(balance)}
            </Text>
          </Text>
        </View>
      </Card>

      {!optIn ? (
        <Text className="text-charcoal-500 leading-6">
          Turn on treatment exchange above to browse eligible practitioners and
          send requests.
        </Text>
      ) : (
        <>
          <Text className="text-charcoal-900 font-semibold text-base mb-2">
            Find a practitioner
          </Text>
          <TextInput
            className="border border-cream-300 rounded-xl px-4 py-3 text-charcoal-900 bg-cream-50 mb-3"
            placeholder="Search by name, location, or services"
            placeholderTextColor={Colors.charcoal[400]}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ gap: 8 }}
          >
            <FilterChip
              label="All roles"
              selected={roleFilter === "all"}
              onPress={() => setRoleFilter("all")}
            />
            {THERAPIST_ROLES.map((r) => (
              <FilterChip
                key={r}
                label={roleLabel(r)}
                selected={roleFilter === r}
                onPress={() => setRoleFilter(r)}
              />
            ))}
          </ScrollView>

          {eligibleQuery.isLoading ? (
            <ActivityIndicator color={Colors.sage[500]} className="py-6" />
          ) : eligibleQuery.isError ? (
            <Text className="text-red-700">
              {(eligibleQuery.error as Error)?.message ??
                "Could not load peers."}
            </Text>
          ) : filtered.length === 0 ? (
            <Text className="text-charcoal-500">
              No eligible practitioners match your filters. Try clearing search
              or another role.
            </Text>
          ) : (
            filtered.map((p) => (
              <PeerRow
                key={p.id}
                peer={p}
                userId={userId}
                creditBalance={balance}
                onSent={() => {
                  void queryClient.invalidateQueries({
                    queryKey: ["practitioner_dashboard", userId],
                  });
                  void queryClient.invalidateQueries({
                    queryKey: ["exchange_sent", userId],
                  });
                }}
              />
            ))
          )}
        </>
      )}
    </View>
  );
}

function FilterChip(props: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={props.onPress}
      className={`px-3 py-2 rounded-full border ${
        props.selected
          ? "bg-sage-100 border-sage-400"
          : "bg-cream-50 border-cream-300"
      }`}
    >
      <Text
        className={`text-sm ${props.selected ? "text-charcoal-900 font-semibold" : "text-charcoal-600"}`}
      >
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function PeerRow(props: {
  peer: EligibleExchangePractitioner;
  userId: string;
  creditBalance: number;
  onSent: () => void;
}) {
  const { peer, userId, creditBalance, onSent } = props;
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [sessionType, setSessionType] = useState("");
  const [notes, setNotes] = useState("");

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const name =
    `${peer.first_name ?? ""} ${peer.last_name ?? ""}`.trim() || "Practitioner";

  const validate = (): string | null => {
    if (!ISO_DATE_RE.test(sessionDate)) return "Date must be YYYY-MM-DD.";
    if (sessionDate < todayIso) return "Date must be today or later.";
    if (!TIME_RE.test(startTime)) return "Start time must be HH:MM (24h).";
    if (creditBalance < duration)
      return `You need ${duration} credits for this duration; you have ${creditBalance}.`;
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      Alert.alert("Check the form", err);
      return;
    }
    setBusy(true);
    try {
      const res = await sendTreatmentExchangeRequest({
        requesterId: userId,
        recipientUserId: peer.user_id,
        sessionDate,
        startTime,
        durationMinutes: duration,
        sessionType: sessionType.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (!res.ok) {
        Alert.alert("Could not send", res.error?.message ?? "Try again.");
        return;
      }
      setModalOpen(false);
      setSessionDate("");
      setStartTime("");
      setSessionType("");
      setNotes("");
      onSent();
      Alert.alert(
        "Request sent",
        `${name} will be notified to accept or decline.`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card variant="default" padding="md" className="mb-3">
        <View className="flex-row gap-3">
          <Avatar
            source={peer.profile_photo_url ?? undefined}
            name={name}
            size="lg"
          />
          <View className="flex-1">
            <Text className="text-charcoal-900 font-semibold">{name}</Text>
            <Text className="text-charcoal-500 text-sm">
              {roleLabel(peer.user_role)}
            </Text>
            {peer.location ? (
              <Text className="text-charcoal-600 text-sm mt-1">
                {peer.location}
              </Text>
            ) : null}
            {peer.average_rating != null ? (
              <Text className="text-charcoal-500 text-xs mt-1">
                Rating {peer.average_rating.toFixed(1)} ·{" "}
                {tierLabel(ratingTier(peer.average_rating))}
              </Text>
            ) : null}
          </View>
        </View>
        <Button
          variant="primary"
          className="mt-4"
          onPress={() => setModalOpen(true)}
        >
          Request exchange
        </Button>
      </Card>

      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !busy && setModalOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => !busy && setModalOpen(false)}
        >
          <Pressable
            className="bg-cream-50 rounded-t-3xl max-h-[90%] px-4 pt-4 pb-8"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="w-12 h-1 bg-cream-300 rounded-full self-center mb-4" />
            <Text className="text-charcoal-900 text-lg font-semibold mb-1">
              Propose a session with {name}
            </Text>
            <Text className="text-charcoal-500 text-sm mb-4">
              Same rating tier as you. If they accept, credits apply per minute.
              Use their usual session length when possible.
            </Text>

            <Text className="text-charcoal-700 text-sm font-medium mb-1">
              Date (YYYY-MM-DD)
            </Text>
            <TextInput
              className="border border-cream-300 rounded-xl px-4 py-3 text-charcoal-900 bg-white mb-3"
              placeholder={todayIso}
              value={sessionDate}
              onChangeText={setSessionDate}
            />

            <Text className="text-charcoal-700 text-sm font-medium mb-1">
              Start (HH:MM)
            </Text>
            <TextInput
              className="border border-cream-300 rounded-xl px-4 py-3 text-charcoal-900 bg-white mb-3"
              placeholder="14:00"
              value={startTime}
              onChangeText={setStartTime}
            />

            <Text className="text-charcoal-700 text-sm font-medium mb-2">
              Duration
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
            >
              <View className="flex-row flex-wrap gap-2">
                {DURATION_OPTIONS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setDuration(m)}
                    className={`px-3 py-2 rounded-full border ${
                      duration === m
                        ? "bg-sage-100 border-sage-400"
                        : "bg-white border-cream-300"
                    }`}
                  >
                    <Text
                      className={
                        duration === m
                          ? "text-charcoal-900 font-semibold"
                          : "text-charcoal-600"
                      }
                    >
                      {m} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text className="text-charcoal-700 text-sm font-medium mb-1">
              Session type (optional)
            </Text>
            <TextInput
              className="border border-cream-300 rounded-xl px-4 py-3 text-charcoal-900 bg-white mb-3"
              placeholder="e.g. Sports massage"
              value={sessionType}
              onChangeText={setSessionType}
            />

            <Text className="text-charcoal-700 text-sm font-medium mb-1">
              Note to them (optional)
            </Text>
            <TextInput
              className="border border-cream-300 rounded-xl px-4 py-3 text-charcoal-900 bg-white mb-4"
              placeholder="Anything they should know"
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <Button
              variant="primary"
              onPress={() => void submit()}
              isLoading={busy}
              disabled={busy}
            >
              Send request ({duration} credits if accepted)
            </Button>
            <Button
              variant="outline"
              className="mt-2"
              onPress={() => setModalOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
