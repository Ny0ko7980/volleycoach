-- Coach Volley — proposition de séance depuis le Coach IA
--
-- Quand le coach répond à une question de progression ou de diagnostic, il
-- propose de construire une séance ciblée sur la compétence concernée. La
-- compétence est stockée avec le message pour que la proposition survive à la
-- réouverture de la conversation : sans ça, le bouton disparaîtrait au
-- rechargement alors que le texte de la réponse, lui, l'évoque toujours.

alter table public.ai_messages
  add column if not exists suggested_skill text,
  add column if not exists suggested_label text;

comment on column public.ai_messages.suggested_skill is
  'Compétence proposée à l''entraînement (même vocabulaire que exercises.category). Null si la réponse n''en propose aucune.';

alter table public.ai_messages drop constraint if exists ai_messages_suggested_skill_check;
alter table public.ai_messages add constraint ai_messages_suggested_skill_check
  check (suggested_skill is null or suggested_skill in (
    'reception','defense','passe','attaque','service','bloc',
    'deplacements','detente','renforcement','mobilite','lecture_jeu','echauffement'
  ));
