import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius } from "@/constants/theme";

function toYoutubeEmbedUrl(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return `https://www.youtube.com/embed/${match[1]}?playsinline=1`;
  }
  return null;
}

// Lecteur vidéo d'exemple pour un exercice: rendu en WebView pour un lien
// YouTube (le format le plus courant pour des tutos), ou en lecteur vidéo
// natif pour un fichier direct (mp4, etc.).
export function ExerciseVideo({ url }: { url: string }) {
  const { theme } = useAppTheme();
  const embedUrl = toYoutubeEmbedUrl(url);

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surfaceAlt }]}>
      {embedUrl ? <YoutubeEmbed url={embedUrl} /> : <NativeVideo url={url} />}
    </View>
  );
}

function YoutubeEmbed({ url }: { url: string }) {
  return (
    <WebView
      source={{ uri: url }}
      style={styles.media}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
    />
  );
}

function NativeVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.media} nativeControls />;
}

const styles = StyleSheet.create({
  wrapper: { width: "100%", aspectRatio: 16 / 9, borderRadius: radius.lg, overflow: "hidden" },
  media: { width: "100%", height: "100%" },
});
