import { Alert, Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system";

function fileExtensionFromUrl(url: string): string {
  const path = url.split("?")[0] ?? "";
  const m = /\.([a-z0-9]{2,5})$/i.exec(path);
  return m?.[1]?.toLowerCase() ?? "pdf";
}

/**
 * Download a signed export URL and open the system share sheet (Files, Mail, etc.).
 */
export async function openExportInShareSheet(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;

  const ext = fileExtensionFromUrl(trimmed);
  const dest =
    (FileSystem.cacheDirectory ?? "") + `theramate-export-${Date.now()}.${ext}`;

  try {
    const result = await FileSystem.downloadAsync(trimmed, dest);
    if (result.status !== 200) {
      throw new Error(`Download failed (${result.status})`);
    }

    const shareUrl =
      Platform.OS === "ios" ? result.uri : `file://${result.uri}`;
    await Share.share({
      url: shareUrl,
      title: "Theramate export",
      message: Platform.OS === "android" ? "Theramate export" : undefined,
    });
  } catch (e) {
    Alert.alert(
      "Could not open export",
      e instanceof Error
        ? e.message
        : "Download or share failed. Try again from Latest delivery.",
    );
  }
}
