import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Mail } from "lucide-react-native";

import { AppStackHeader } from "@/components/navigation/AppStackHeader";
import { Colors } from "@/constants/colors";
import { APP_CONFIG } from "@/constants/config";
import type { LegalDocument } from "@/constants/legal/types";

type LegalDocumentScreenProps = {
  title: string;
  document: LegalDocument;
};

/**
 * Renders static legal / help copy shipped with the app (no WebView).
 */
export function LegalDocumentScreen({ title, document }: LegalDocumentScreenProps) {
  const mailSupport = () => {
    void Linking.openURL(`mailto:${APP_CONFIG.SUPPORT_EMAIL}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={["top"]}>
      <AppStackHeader title={title} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-charcoal-400 text-xs mb-6">{document.lastUpdated}</Text>

        {document.sections.map((section, i) => (
          <View key={i} className="mb-6">
            <Text className="text-charcoal-900 font-semibold text-base mb-2">
              {section.heading}
            </Text>
            {section.paragraphs.map((p, j) => (
              <Text
                key={j}
                className="text-charcoal-600 leading-6 mb-3 text-[15px]"
              >
                {p}
              </Text>
            ))}
          </View>
        ))}

        {document.footerNote ? (
          <Text className="text-charcoal-400 text-xs leading-5 mb-8">
            {document.footerNote}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={mailSupport}
          className="flex-row items-center self-start py-2"
          accessibilityRole="button"
          accessibilityLabel="Email support"
        >
          <Mail size={18} color={Colors.sage[600]} />
          <Text className="text-sage-700 font-semibold ml-2">
            {APP_CONFIG.SUPPORT_EMAIL}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
