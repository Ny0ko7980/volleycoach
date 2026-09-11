import { TriangleAlert } from "lucide-react-native";
import { useAppTheme } from "@/hooks/useAppTheme";
import { EmptyState } from "./EmptyState";

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = "Une erreur est survenue. Vérifie ta connexion et réessaie.", onRetry }: Props) {
  const { theme } = useAppTheme();
  return (
    <EmptyState
      icon={<TriangleAlert size={26} color={theme.warning} />}
      title="Oups, ça n'a pas fonctionné"
      description={message}
      actionLabel={onRetry ? "Réessayer" : undefined}
      onAction={onRetry}
    />
  );
}
