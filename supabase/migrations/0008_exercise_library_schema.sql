-- Coach Volley — extension du schéma `exercises` pour la bibliothèque enrichie.
--
-- Toutes les colonnes sont ajoutées en optionnel (nullable ou avec défaut) :
-- les lignes existantes, les écrans actuels, le générateur de séances et le
-- Coach IA continuent de fonctionner sans modification. Aucune colonne n'est
-- supprimée ni renommée.

alter table public.exercises
  add column if not exists slug text,
  add column if not exists category text,
  add column if not exists skills text[] not null default '{}',
  add column if not exists levels text[] not null default '{}',
  add column if not exists objective_statement text,
  add column if not exists players_min int,
  add column if not exists players_max int,
  add column if not exists intensity text,
  add column if not exists instruction_steps text[] not null default '{}',
  add column if not exists coaching_points text[] not null default '{}',
  add column if not exists common_mistakes_list text[] not null default '{}',
  add column if not exists progressions text[] not null default '{}',
  add column if not exists regressions text[] not null default '{}',
  add column if not exists solo_compatible boolean,
  add column if not exists ball_required boolean,
  add column if not exists physical_load int,
  add column if not exists technical_load int,
  add column if not exists tags text[] not null default '{}';

-- `slug` est l'identifiant stable et lisible de la bibliothèque
-- (ex: "reception_001"). Unique quand il est renseigné, ce qui permet des
-- migrations de seed idempotentes (upsert) sans toucher aux lignes héritées.
create unique index if not exists exercises_slug_key
  on public.exercises(slug)
  where slug is not null;

alter table public.exercises drop constraint if exists exercises_category_check;
alter table public.exercises add constraint exercises_category_check
  check (category is null or category in (
    'reception','defense','passe','attaque','service','bloc',
    'deplacements','detente','renforcement','mobilite','lecture_jeu','echauffement'
  ));

alter table public.exercises drop constraint if exists exercises_intensity_check;
alter table public.exercises add constraint exercises_intensity_check
  check (intensity is null or intensity in ('low','medium','high'));

alter table public.exercises drop constraint if exists exercises_players_check;
alter table public.exercises add constraint exercises_players_check
  check (
    (players_min is null or players_min >= 1)
    and (players_min is null or players_max is null or players_min <= players_max)
  );

alter table public.exercises drop constraint if exists exercises_load_check;
alter table public.exercises add constraint exercises_load_check
  check (
    (physical_load is null or physical_load between 1 and 5)
    and (technical_load is null or technical_load between 1 and 5)
  );

-- Reprise des lignes déjà en base : `levels` reprend le niveau unique existant
-- pour que le filtrage par niveau reste exhaustif après la bascule.
update public.exercises set levels = array[level] where levels = '{}';

-- Catégorie déduite uniquement quand la correspondance est certaine. Les
-- objectifs transversaux (regularite, competition, global) restent sans
-- catégorie plutôt que d'être rangés arbitrairement.
update public.exercises
set category = case objective
  when 'reception' then 'reception'
  when 'service' then 'service'
  when 'attaque' then 'attaque'
  when 'bloc' then 'bloc'
  when 'detente' then 'detente'
  when 'defense' then 'defense'
  when 'precision' then 'passe'
  when 'vitesse' then 'deplacements'
  else null
end
where category is null;

create index if not exists idx_exercises_category on public.exercises(category, level);
create index if not exists idx_exercises_levels on public.exercises using gin(levels);
create index if not exists idx_exercises_tags on public.exercises using gin(tags);
