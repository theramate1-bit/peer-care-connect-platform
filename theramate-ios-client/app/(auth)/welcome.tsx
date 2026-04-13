import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AuthBackHeader } from "@/components/AuthBackHeader";
import { HeroIllustration } from "@/components/auth/HeroIllustration";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";

/**
 * Secondary landing: sign in, sign up, browse — from “More options” on hero.
 */
export default function WelcomeScreen() {
  const { height } = useWindowDimensions();
  const compact = height < 640;
  const illustrationMaxH = compact ? 140 : height < 720 ? 160 : 200;

  const body = (
    <>
      <View style={styles.brandBlock}>
        <Text style={styles.eyebrow}>Explore</Text>
        <Text style={styles.title}>Theramate</Text>
        <Text style={styles.subtitle}>
          Book trusted therapy sessions, track progress, and manage your care
          in one place.
        </Text>
      </View>

      <View
        style={[
          styles.illustrationSlot,
          compact && styles.illustrationSlotCompact,
        ]}
      >
        <HeroIllustration maxHeight={illustrationMaxH} />
      </View>

      <View style={styles.bottom}>
        <View style={styles.card}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={() => router.push("/login")}
          >
            Sign in
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() =>
              router.push({
                pathname: "/register",
                params: { role: "client" },
              })
            }
          >
            Create account
          </Button>
          <Button
            variant="outline"
            size="lg"
            fullWidth
            onPress={() => router.push("/explore")}
          >
            Browse practitioners
          </Button>
          <Button
            variant="ghost"
            size="lg"
            fullWidth
            onPress={() => router.push("/how-it-works")}
          >
            Learn how it works
          </Button>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.backWrap}>
        <AuthBackHeader fallbackHref="/hero" label="Role selection" />
      </View>
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
  backWrap: {
    paddingHorizontal: 24,
    paddingTop: 4,
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
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.6,
    color: Colors.charcoal[900],
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.charcoal[500],
  },
  illustrationSlot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 100,
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
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.cream[200],
    gap: 12,
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
});
