import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAppTheme } from "@/hooks/useAppTheme";
import { radius } from "@/constants/theme";

function youtubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtu\.be\/)([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

// Lecteur vidéo d'exemple pour un exercice: iframe YouTube pour un lien
// YouTube (le format le plus courant pour des tutos), ou lecteur vidéo natif
// pour un fichier direct (mp4, etc.).
export function ExerciseVideo({ url }: { url: string }) {
  const { theme } = useAppTheme();
  const videoId = youtubeVideoId(url);

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surfaceAlt }]}>
      {videoId ? <YoutubeEmbed videoId={videoId} /> : <NativeVideo url={url} />}
    </View>
  );
}

/**
 * YouTube rejette une intégration dont il ne reconnaît pas l'origine (erreur
 * 153). Charger l'URL d'embed directement dans la WebView ne fournit aucune
 * origine : il faut servir une vraie page HTML et déclarer `baseUrl`, qui
 * devient l'origine du document.
 */
function YoutubeEmbed({ videoId }: { videoId: string }) {
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; }
      iframe { border: 0; display: block; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <iframe
      src="https://www.youtube.com/embed/${videoId}?playsinline=1&rel=0&modestbranding=1&origin=https%3A%2F%2Fwww.youtube.com"
      allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen
    ></iframe>
  </body>
</html>`;

  return (
    <WebView
      source={{ html, baseUrl: "https://www.youtube.com" }}
      originWhitelist={["*"]}
      style={styles.media}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      setSupportMultipleWindows={false}
      scrollEnabled={false}
      onShouldStartLoadWithRequest={(request) => {
        // Le lecteur charge ses propres ressources dans une sous-frame. Les
        // intercepter ferait quitter la carte dès la première requête interne,
        // avant même que la vidéo s'affiche.
        if (request.isTopFrame === false) return true;
        if (request.navigationType && request.navigationType !== "click") return true;

        // Reste un toucher sur un lien du lecteur (logo, titre) : on le refuse
        // pour que la lecture reste dans la carte, sans quitter l'application.
        return request.url.includes("/embed/");
      }}
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
  media: { width: "100%", height: "100%", backgroundColor: "#000" },
});
