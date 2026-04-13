import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router } from "expo-router";
import { User, Briefcase } from "lucide-react-native";

import { HeroIllustration } from "@/components/auth/HeroIllustration";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";

/**
 * First screen after auth bootstrap: choose client vs practitioner, then continue to sign-up.
 */
export default function HeroScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 640;
  const illustrationMaxH = compact ? 140 : height < 720 ? 168 : 228;

  const body = (
    <>
      {/* Brand — compact top */}
      <View style={styles.brandBlock}>
        <Text style={styles.eyebrow}>Welcome</Text>
        <Text style={styles.title}>Theramate</Text>
        <Text style={styles.subtitle}>
          Book therapy, manage sessions, and grow your practice — all in one
          place.
        </Text>
      </View>

      {/* Illustration — fills space between headline and CTAs (Figma-style) */}
      <View
        style={[
          styles.illustrationSlot,
          compact && styles.illustrationSlotCompact,
        ]}
      >
        <HeroIllustration maxHeight={illustrationMaxH} />
      </View>

      {/* Actions — pinned to bottom of the column */}
      <View style={styles.bottom}>
        <View>
          <Text style={styles.sectionLabel}>Get started</Text>
          <Text style={styles.sectionHint}>
            Choose how you’ll use the app. You can sign in below if you already
            have an account.
          </Text>

          <View style={styles.choiceCard}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<User size={22} color="#FFFFFF" />}
              onPress={() =>
                router.push({
                  pathname: "/register",
                  params: { role: "client" },
                })
              }
            >
              I’m a client
            </Button>
            <Button
              variant="outline"
              size="lg"
              fullWidth
              leftIcon={<Briefcase size={22} color={Colors.sage[500]} />}
              onPress={() =>
                router.push({
                  pathname: "/register",
                  params: { role: "practitioner" },
                })
              }
            >
              I’m a practitioner
            </Button>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.divider} />

          <Link href="/login" asChild>
            <TouchableOpacity
              style={styles.signInRow}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Sign in to existing account"
            >
              <Text style={styles.signInLine}>
                <Text style={styles.signInMuted}>Already have an account?</Text>
                <Text style={styles.signInStrong}> Sign in</Text>
              </Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            style={styles.browseRow}
            onPress={() => router.push("/explore")}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Browse as guest"
          >
            <Text style={styles.browseText}>Browse as guest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {compact ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerScroll}>{body}</View>
        </ScrollView>
      ) : (
        <View style={styles.root}>
          <View style={styles.inner}>{body}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.cream[50],
  },
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.select({ ios: 10, default: 8 }),
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  innerScroll: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 4,
    maxWidth: 480,
    width: "100%",
    alignSelf: "center",
  },
  brandBlock: {
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: Colors.sage[600],
    marginBottom: 8,
  },
  title: {
    fontSize: 38,
    fontWeight: "700",
    letterSpacing: -0.8,
    color: Colors.charcoal[900],
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.charcoal[500],
    maxWidth: 340,
  },
  illustrationSlot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 120,
    marginVertical: 4,
  },
  illustrationSlotCompact: {
    flex: 0,
    marginVertical: 12,
  },
  bottom: {
    paddingTop: 4,
    paddingBottom: Platform.select({ ios: 4, default: 2 }),
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.charcoal[900],
    marginBottom: 6,
  },
  sectionHint: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.charcoal[500],
    marginBottom: 14,
  },
  choiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cream[200],
    gap: 14,
    ...Platform.select({
      ios: {
        shadowColor: Colors.charcoal[900],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  footer: {
    marginTop: 14,
    paddingTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.cream[300],
    marginBottom: 14,
    opacity: 0.9,
  },
  signInRow: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginBottom: 2,
  },
  signInLine: {
    fontSize: 16,
    textAlign: "center",
  },
  signInMuted: {
    color: Colors.charcoal[600],
  },
  signInStrong: {
    fontWeight: "700",
    color: Colors.sage[600],
  },
  browseRow: {
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  browseText: {
    fontSize: 15,
    color: Colors.charcoal[500],
    textDecorationLine: "underline",
    textDecorationColor: Colors.charcoal[300],
  },
});
