import { EmptyState } from "./EmptyState";

interface Props {
  message?: string;
  onRetry?: () => void;
}

export function ErrorView({ message = "Une erreur est survenue. Vérifie ta connexion et réessaie.", onRetry }: Props) {
  return (
    <EmptyState
      icon="⚠️"
      title="Oups, ça n'a pas fonctionné"
      description={message}
      actionLabel={onRetry ? "Réessayer" : undefined}
      onAction={onRetry}
    />
  );
}
