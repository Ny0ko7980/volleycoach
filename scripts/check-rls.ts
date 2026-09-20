// Contrôle du cloisonnement des données entre joueurs (Row Level Security).
//
// Ce script ne vérifie PAS que des policies existent : il crée deux joueurs
// sans lien entre eux et tente réellement, depuis le compte de l'un, de lire,
// modifier et supprimer les données de l'autre. Chaque tentative doit échouer.
//
// Il vérifie aussi l'inverse — que le fonctionnement normal de VolleyCoach
// reste intact : chacun gère ses propres données, un coach voit le roster de
// l'équipe qu'il a créée, un joueur rejoint et quitte une équipe.
//
// Le schéma est reconstruit depuis supabase/migrations/*.sql sur une base
// jetable, avec un `auth.uid()` pilotable qui reproduit le comportement de
// Supabase : on peut ainsi « devenir » un joueur précis.
//
// Lancement : npm run rls:check
//   - par défaut : provisionne un PostgreSQL temporaire (initdb/pg_ctl requis)
//   - ou DATABASE_URL=postgres://… npm run rls:check pour viser une base
//     existante — JAMAIS la production : le script y écrit et y supprime.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ALICE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const ADMIN = "dddddddd-dddd-dddd-dddd-dddddddddddd";
// Comptes jetables du scénario C : la suppression de compte détruit
// réellement des lignes, elle ne peut pas s'exercer sur Alice ou Bob sans
// fausser les scénarios précédents.
const CAROL = "cccccccc-cccc-cccc-cccc-cccccccccccc";
const DAVE = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee";

let failures = 0;
let checks = 0;

function pass(name: string) {
  checks += 1;
  console.log(`  \x1b[32mOK\x1b[0m   ${name}`);
}
function fail(name: string, detail: string) {
  checks += 1;
  failures += 1;
  console.log(`  \x1b[31mÉCHEC\x1b[0m ${name}\n         → ${detail}`);
}

// --- Connexion ------------------------------------------------------------

interface Target {
  psql: (statement: string, asUser?: string) => { out: string; error: string | null };
  cleanup: () => void;
}

function findBinDir(): string | null {
  if (commandExists("initdb")) return "";
  const base = "/usr/lib/postgresql";
  if (!existsSync(base)) return null;
  const versions = readdirSync(base).sort().reverse();
  for (const v of versions) {
    const dir = join(base, v, "bin");
    if (existsSync(join(dir, "initdb"))) return dir;
  }
  return null;
}

function commandExists(cmd: string): boolean {
  try {
    execFileSync("which", [cmd], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function run(cmd: string, args: string[]): string {
  return execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function connectToExisting(url: string): Target {
  return {
    psql: (statement, asUser) => exec(["psql", url], statement, asUser),
    cleanup: () => undefined,
  };
}

function exec(base: string[], statement: string, asUser?: string) {
  const prelude = asUser
    ? `set role authenticated; set request.jwt.claim.sub = '${asUser}'; `
    : "";
  try {
    const out = execFileSync(base[0]!, [...base.slice(1), "-v", "ON_ERROR_STOP=1", "-tAq", "-c", prelude + statement], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { out: out.trim(), error: null };
  } catch (e) {
    const err = e as { stderr?: string; message: string };
    return { out: "", error: (err.stderr ?? err.message).trim() };
  }
}

function provisionTemporary(): Target {
  const bin = findBinDir();
  if (bin === null) {
    console.error(
      "PostgreSQL introuvable.\n" +
        "  Installe-le (`sudo apt-get install -y postgresql`) ou vise une base de test :\n" +
        "  DATABASE_URL=postgres://user:pass@host:5432/base npm run rls:check\n" +
        "  (jamais la production : ce script écrit et supprime des données)"
    );
    process.exit(2);
  }
  const b = (name: string) => (bin ? join(bin, name) : name);
  const dir = mkdtempSync(join(tmpdir(), "volley-rls-"));
  const port = String(5400 + Math.floor(Math.random() * 150));

  // initdb refuse de tourner en root : on délègue à un compte non privilégié
  // quand c'est nécessaire.
  const asRoot = process.getuid?.() === 0;
  const owner = asRoot ? findUnprivilegedUser() : null;
  const sh = (command: string) =>
    asRoot && owner ? run("su", [owner, "-c", command]) : run("bash", ["-c", command]);

  if (asRoot && owner) run("chown", ["-R", `${owner}:${owner}`, dir]);
  sh(`${b("initdb")} -D ${dir} -U rlscheck`);
  sh(`${b("pg_ctl")} -D ${dir} -o "-k /tmp -p ${port} -c listen_addresses=" -l ${dir}/log start`);
  sh(`${b("createdb")} -h /tmp -p ${port} -U rlscheck volley`);

  const psqlBase = asRoot && owner
    ? ["su", owner, "-c", ""] // remplacé plus bas
    : ["psql", "-h", "/tmp", "-p", port, "-U", "rlscheck", "-d", "volley"];

  const psql = (statement: string, asUser?: string) => {
    if (asRoot && owner) {
      const prelude = asUser ? `set role authenticated; set request.jwt.claim.sub = '${asUser}'; ` : "";
      const payload = (prelude + statement).replace(/'/g, "'\\''");
      try {
        const out = run("su", [
          owner,
          "-c",
          `psql -h /tmp -p ${port} -U rlscheck -d volley -v ON_ERROR_STOP=1 -tAq -c '${payload}'`,
        ]);
        return { out: out.trim(), error: null };
      } catch (e) {
        const err = e as { stderr?: string; message: string };
        return { out: "", error: (err.stderr ?? err.message).trim() };
      }
    }
    return exec(psqlBase, statement, asUser);
  };

  return {
    psql,
    cleanup: () => {
      try {
        sh(`${b("pg_ctl")} -D ${dir} stop`);
      } catch {
        /* le serveur est peut-être déjà arrêté */
      }
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

function findUnprivilegedUser(): string | null {
  for (const candidate of ["pgtest", "postgres", "nobody"]) {
    try {
      run("id", [candidate]);
      return candidate;
    } catch {
      /* utilisateur absent */
    }
  }
  try {
    run("useradd", ["-m", "pgtest"]);
    return "pgtest";
  } catch {
    return null;
  }
}

// --- Construction du schéma ------------------------------------------------

function buildSchema(t: Target) {
  // Socle Supabase : rôles, schéma auth, et un auth.uid() lisant une variable
  // de session — exactement ce que fait Supabase à partir du JWT.
  const base = `
    create extension if not exists pgcrypto;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
    end $$;
    create schema if not exists auth;
    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}'::jsonb);
    create or replace function auth.uid() returns uuid as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$ language sql stable;
    grant usage on schema public, auth to authenticated, anon;
  `;
  const r = t.psql(base);
  if (r.error) throw new Error(`socle Supabase : ${r.error}`);

  const dir = "supabase/migrations";
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    const applied = t.psql(`\\i ${join(dir, file)}`);
    if (applied.error) throw new Error(`migration ${file} : ${applied.error}`);
  }

  // Sur Supabase, le rôle `authenticated` a les privilèges de table : la RLS
  // est la seule barrière. On reproduit ça, sinon le test serait faussé par un
  // simple refus de privilège.
  const grants = t.psql(`
    grant all on all tables in schema public to authenticated;
    grant all on all sequences in schema public to authenticated;
  `);
  if (grants.error) throw new Error(`privilèges : ${grants.error}`);
}

function seed(t: Target) {
  const r = t.psql(`
    insert into auth.users (id, email) values
      ('${ALICE}','alice@test.local'), ('${BOB}','bob@test.local'), ('${ADMIN}','admin@test.local')
      on conflict (id) do nothing;
    update public.player_profiles set position='libero', level='intermediaire' where id in ('${ALICE}','${BOB}');

    -- Le trigger de durcissement 0005 remet role/is_premium à leur ancienne
    -- valeur dès que l'appelant n'est pas admin — y compris le superutilisateur
    -- qui amorce ce jeu de données (auth.uid() est nul ici). On le désactive le
    -- temps de créer le tout premier admin, puis on le remet aussitôt : les
    -- tentatives d'escalade du scénario A doivent l'affronter pour de vrai.
    alter table public.player_profiles disable trigger trg_protect_privileged_profile_columns;
    update public.player_profiles set role='admin' where id = '${ADMIN}';
    alter table public.player_profiles enable trigger trg_protect_privileged_profile_columns;

    insert into public.workouts (id, player_id, title, objective, duration_minutes)
      values ('11111111-0000-0000-0000-000000000001','${BOB}','Séance de Bob','reception',45);
    insert into public.workout_sessions (id, player_id, workout_id, status)
      values ('22222222-0000-0000-0000-000000000002','${BOB}','11111111-0000-0000-0000-000000000001','completed');
    insert into public.statistics (player_id, category, metric, value) values ('${BOB}','service','aces',12);
    insert into public.goals (player_id, name, category, target_value) values ('${BOB}','Objectif de Bob','service',50);
    insert into public.player_skill_scores (player_id, skill, score, sample_size) values ('${BOB}','reception',77,10);
    insert into public.skill_signals (player_id, skill, source, direction) values ('${BOB}','reception','feedback','weakness');
    insert into public.exercise_feedback (player_id, session_id, exercise_id, skill, rating)
      select '${BOB}','22222222-0000-0000-0000-000000000002', id,'reception','difficile' from public.exercises limit 1;
    insert into public.ai_conversations (id, player_id, title)
      values ('33333333-0000-0000-0000-000000000003','${BOB}','Conversation de Bob');
    insert into public.ai_messages (conversation_id, role, content)
      values ('33333333-0000-0000-0000-000000000003','user','Message confidentiel');
  `);
  if (r.error) throw new Error(`jeu de données : ${r.error}`);
}

// --- Aides d'assertion -----------------------------------------------------

function count(t: Target, as: string, query: string): number {
  const r = t.psql(query, as);
  if (r.error) return -1;
  return Number(r.out || "0");
}

/** Nombre de lignes réellement touchées par une écriture (0 = bloquée par RLS). */
function affected(t: Target, as: string, mutation: string): { rows: number; refused: boolean } {
  const r = t.psql(`with touched as (${mutation} returning 1) select count(*) from touched;`, as);
  if (r.error) return { rows: 0, refused: true };
  return { rows: Number(r.out || "0"), refused: false };
}

function expectNoAccess(t: Target, label: string, query: string) {
  const n = count(t, ALICE, query);
  if (n === 0) pass(label);
  else fail(label, `${n} ligne(s) visibles alors qu'aucune ne devrait l'être`);
}

function expectNoWrite(t: Target, label: string, mutation: string) {
  const { rows, refused } = affected(t, ALICE, mutation);
  if (rows === 0) pass(`${label}${refused ? " (rejetée)" : " (aucune ligne touchée)"}`);
  else fail(label, `${rows} ligne(s) modifiée(s)/supprimée(s) — l'isolation est rompue`);
}

/**
 * Certaines défenses (le trigger 0005) laissent l'UPDATE aboutir mais annulent
 * la colonne privilégiée. Compter les lignes ne suffit donc pas : on lit la
 * valeur obtenue après la tentative.
 */
function expectNoEscalation(
  t: Target,
  label: string,
  mutation: string,
  read: string,
  expected: string,
) {
  t.psql(mutation, ALICE);
  const actual = (t.psql(read, ALICE).out || "").trim();
  if (actual === expected) pass(`${label} (valeur toujours « ${expected} »)`);
  else fail(label, `la valeur est devenue « ${actual} » — l'escalade a réussi`);
}

function expectAllowed(t: Target, label: string, as: string, statement: string) {
  const r = t.psql(statement, as);
  if (r.error) fail(label, `refusé alors que ce devrait être permis : ${firstLine(r.error)}`);
  else pass(label);
}

function firstLine(s: string): string {
  return s.split("\n").find((l) => l.includes("ERROR")) ?? s.split("\n")[0] ?? s;
}

// --- Scénarios -------------------------------------------------------------

/** Tout ce qu'Alice ne doit jamais pouvoir lire chez Bob. */
function crossReadBattery(t: Target, phase = "") {
  console.log(`\n  Lecture croisée${phase ? " " + phase : ""}`);
  expectNoAccess(t, phase + "profil de Bob", `select count(*) from public.player_profiles where id='${BOB}'`);
  expectNoAccess(t, phase + "séances de Bob", `select count(*) from public.workout_sessions where player_id='${BOB}'`);
  expectNoAccess(t, phase + "statistiques de Bob", `select count(*) from public.statistics where player_id='${BOB}'`);
  expectNoAccess(t, phase + "objectifs de Bob", `select count(*) from public.goals where player_id='${BOB}'`);
  expectNoAccess(t, phase + "scores de compétence de Bob", `select count(*) from public.player_skill_scores where player_id='${BOB}'`);
  expectNoAccess(t, phase + "signaux de Bob", `select count(*) from public.skill_signals where player_id='${BOB}'`);
  expectNoAccess(t, phase + "ressentis d'exercice de Bob", `select count(*) from public.exercise_feedback where player_id='${BOB}'`);
  expectNoAccess(t, phase + "conversations IA de Bob", `select count(*) from public.ai_conversations where player_id='${BOB}'`);
  expectNoAccess(t, phase + "messages IA de Bob", `select count(*) from public.ai_messages where conversation_id='33333333-0000-0000-0000-000000000003'`);
  expectNoAccess(t, phase + "séances de Bob via son workout", `select count(*) from public.workouts where player_id='${BOB}'`);

}

/** Tout ce qu'Alice ne doit jamais pouvoir modifier chez Bob. */
function crossUpdateBattery(t: Target, phase = "") {
  console.log(`\n  Modification croisée${phase ? " " + phase : ""}`);
  expectNoWrite(t, phase + "renommer l'objectif de Bob", `update public.goals set name='piraté' where player_id='${BOB}'`);
  expectNoWrite(t, phase + "fausser les statistiques de Bob", `update public.statistics set value=0 where player_id='${BOB}'`);
  expectNoWrite(t, phase + "modifier le profil de Bob", `update public.player_profiles set username='piraté' where id='${BOB}'`);
  expectNoWrite(t, phase + "altérer les scores de Bob", `update public.player_skill_scores set score=0 where player_id='${BOB}'`);

}

/** Tout ce qu'Alice ne doit jamais pouvoir supprimer chez Bob. */
function crossDeleteBattery(t: Target, phase = "") {
  console.log(`\n  Suppression croisée${phase ? " " + phase : ""}`);
  expectNoWrite(t, phase + "supprimer les séances de Bob", `delete from public.workout_sessions where player_id='${BOB}'`);
  expectNoWrite(t, phase + "supprimer les statistiques de Bob", `delete from public.statistics where player_id='${BOB}'`);
  expectNoWrite(t, phase + "supprimer les objectifs de Bob", `delete from public.goals where player_id='${BOB}'`);
  expectNoWrite(t, phase + "supprimer les scores de Bob", `delete from public.player_skill_scores where player_id='${BOB}'`);
  expectNoWrite(t, phase + "supprimer les signaux de Bob", `delete from public.skill_signals where player_id='${BOB}'`);
  expectNoWrite(t, phase + "supprimer les ressentis de Bob", `delete from public.exercise_feedback where player_id='${BOB}'`);

}

function attackScenarios(t: Target) {
  console.log("\n\x1b[1mA. Alice tente d'atteindre les données de Bob — tout doit échouer\x1b[0m\n");

  crossReadBattery(t);
  crossUpdateBattery(t);
  crossDeleteBattery(t);

  console.log("\n  Écriture au nom de Bob");
  expectNoWrite(t, "insérer une statistique au nom de Bob",
    `insert into public.statistics (player_id,category,metric,value) values ('${BOB}','service','aces',999)`);
  expectNoWrite(t, "insérer un objectif au nom de Bob",
    `insert into public.goals (player_id,name,category,target_value) values ('${BOB}','forgé','service',1)`);

  console.log("\n  Élévation de privilèges");
  expectNoEscalation(t, "se promouvoir administrateur",
    `update public.player_profiles set role='admin' where id='${ALICE}'`,
    `select role from public.player_profiles where id='${ALICE}'`, "player");
  expectNoEscalation(t, "s'accorder le premium",
    `update public.player_profiles set is_premium=true where id='${ALICE}'`,
    `select is_premium from public.player_profiles where id='${ALICE}'`, "f");
  expectNoWrite(t, "se forger un badge",
    `insert into public.player_achievements (player_id, achievement_id) select '${ALICE}', id from public.achievements limit 1`);
  expectNoWrite(t, "renommer le catalogue d'exercices", `update public.exercises set name='piraté'`);
  expectNoWrite(t, "supprimer un exercice du catalogue",
    `delete from public.exercises where id in (select id from public.exercises limit 1)`);

  console.log("\n  Voie d'escalade par les équipes");
  // Bob crée son équipe ; Alice crée la sienne, ce qui la rend coach quelque part.
  const teamB = t.psql(`select id from public.create_team_as_coach('Équipe de Bob');`, BOB).out;
  t.psql(`select id from public.create_team_as_coach('Équipe d''Alice');`, ALICE);

  const visible = count(t, ALICE, `select count(*) from public.teams`);
  if (visible === 1) pass("Alice ne voit que sa propre équipe (codes d'invitation non exposés)");
  else fail("énumération des équipes", `${visible} équipe(s) visibles, dont celles des autres et leur invite_code`);

  expectNoWrite(t, "s'insérer comme coach de l'équipe de Bob",
    `insert into public.team_members (team_id, player_id, role) values ('${teamB}','${ALICE}','coach')`);
  expectNoWrite(t, "se promouvoir coach dans une équipe existante",
    `update public.team_members set role='coach' where team_id='${teamB}'`);
  expectNoWrite(t, "retirer Bob d'une équipe qu'elle ne coache pas",
    `delete from public.team_members where team_id='${teamB}' and player_id='${BOB}'`);

  // Même en rejoignant légitimement par le code, un simple membre ne voit rien.
  const code = t.psql(`select invite_code from public.teams where id='${teamB}';`).out;
  t.psql(`select id from public.join_team_by_code('${code}');`, ALICE);

  // C'est ICI que se jouait la faille réelle : les policies vulnérables ne
  // laissaient pas Alice lire Bob directement, elles la laissaient d'abord
  // devenir « coach » de l'équipe de Bob, et c'est ce statut qui ouvrait
  // ensuite la lecture ET l'écriture sur toutes ses données. On rejoue donc
  // les trois batteries dans cet état-là : c'est la seule façon de prouver que
  // la chaîne complète est cassée, et pas seulement sa première marche.
  // Sur un schéma vulnérable, les tentatives ci-dessus RÉUSSISSENT — dont la
  // suppression de Bob de sa propre équipe, ce qui détruirait la condition
  // qu'on veut justement tester. On remet donc Bob dans son équipe en tant que
  // coach, hors RLS (superutilisateur), pour que le rejeu ci-dessous parte bien
  // de l'état que l'attaquante cherchait à atteindre.
  t.psql(`insert into public.team_members (team_id, player_id, role)
          values ('${teamB}','${BOB}','coach')
          on conflict (team_id, player_id) do update set role='coach';`);

  console.log("\n  Rejeu complet depuis l'intérieur de l'équipe de Bob");
  crossReadBattery(t, "[dans l'équipe] ");
  crossUpdateBattery(t, "[dans l'équipe] ");
  crossDeleteBattery(t, "[dans l'équipe] ");

  console.log("\n  Intégrité des données de Bob après toutes les tentatives");
  const intact = t.psql(`
    select (select count(*) from public.workout_sessions where player_id='${BOB}')
         + (select count(*) from public.statistics where player_id='${BOB}')
         + (select count(*) from public.goals where player_id='${BOB}')
         + (select count(*) from public.player_skill_scores where player_id='${BOB}')
         + (select count(*) from public.skill_signals where player_id='${BOB}');`).out;
  if (Number(intact) === 5) pass("les 5 données de Bob sont intactes");
  else fail("intégrité", `${intact}/5 lignes subsistent — des données ont été détruites`);
}

function normalUseScenarios(t: Target) {
  console.log("\n\x1b[1mB. Fonctionnement normal — tout doit continuer de marcher\x1b[0m\n");

  console.log("  Chaque joueur gère ses propres données");
  expectAllowed(t, "créer sa séance", ALICE,
    `insert into public.workouts (id, player_id, title, objective, duration_minutes)
     values ('44444444-0000-0000-0000-000000000004','${ALICE}','Ma séance','reception',45);
     insert into public.workout_sessions (id, player_id, workout_id, status)
     values ('55555555-0000-0000-0000-000000000005','${ALICE}','44444444-0000-0000-0000-000000000004','in_progress');`);
  expectAllowed(t, "terminer sa séance", ALICE,
    `update public.workout_sessions set status='completed', fatigue_level=3, satisfaction=4
     where id='55555555-0000-0000-0000-000000000005';`);
  expectAllowed(t, "enregistrer un ressenti d'exercice", ALICE,
    `insert into public.exercise_feedback (player_id, session_id, exercise_id, skill, rating)
     select '${ALICE}','55555555-0000-0000-0000-000000000005', id,'reception','adapte' from public.exercises limit 1;`);
  expectAllowed(t, "mettre à jour ses scores de compétence", ALICE,
    `insert into public.player_skill_scores (player_id, skill, score, sample_size)
     values ('${ALICE}','reception',60,4)
     on conflict (player_id, skill) do update set score = excluded.score;`);
  expectAllowed(t, "enregistrer un signal de compétence", ALICE,
    `insert into public.skill_signals (player_id, skill, source, direction) values ('${ALICE}','service','feedback','weakness');`);
  expectAllowed(t, "créer puis supprimer un objectif", ALICE,
    `insert into public.goals (id, player_id, name, category, target_value)
     values ('66666666-0000-0000-0000-000000000006','${ALICE}','Mon objectif','service',30);
     delete from public.goals where id='66666666-0000-0000-0000-000000000006';`);
  expectAllowed(t, "ajouter une statistique", ALICE,
    `insert into public.statistics (player_id, category, metric, value) values ('${ALICE}','reception','erreurs',2);`);
  expectAllowed(t, "modifier son propre profil", ALICE,
    `update public.player_profiles set username='alice', age=20 where id='${ALICE}';`);
  expectAllowed(t, "lire son propre historique", ALICE,
    `select count(*) from public.workout_sessions where player_id='${ALICE}';`);

  console.log("\n  Catalogue partagé");
  const exercises = count(t, ALICE, `select count(*) from public.exercises`);
  if (exercises > 300) pass(`bibliothèque d'exercices lisible (${exercises} exercices)`);
  else fail("bibliothèque", `${exercises} exercices lisibles`);
  const badges = count(t, ALICE, `select count(*) from public.achievements`);
  if (badges > 0) pass(`catalogue de badges lisible (${badges})`);
  else fail("badges", "catalogue vide ou illisible");

  console.log("\n  Fonctionnalité Équipe");
  const teamC = t.psql(`select id from public.create_team_as_coach('Équipe test');`, ALICE).out;
  if (teamC) pass("créer une équipe (devient coach)");
  else fail("création d'équipe", "la RPC n'a rien renvoyé");

  const codeC = t.psql(`select invite_code from public.teams where id='${teamC}';`).out;
  expectAllowed(t, "rejoindre une équipe avec le code", BOB, `select id from public.join_team_by_code('${codeC}');`);

  const roster = count(t, ALICE, `select count(*) from public.team_members where team_id='${teamC}'`);
  if (roster === 2) pass("le coach voit le roster complet (2 membres)");
  else fail("roster", `le coach voit ${roster} membre(s) au lieu de 2`);

  const rosterProfiles = count(t, ALICE,
    `select count(*) from public.team_members m join public.player_profiles p on p.id = m.player_id where m.team_id='${teamC}'`);
  if (rosterProfiles === 2) pass("le coach lit les profils de son roster (poste, niveau, série)");
  else fail("profils du roster", `${rosterProfiles} profil(s) lisibles au lieu de 2`);

  const bobSees = count(t, BOB, `select count(*) from public.teams where id='${teamC}'`);
  if (bobSees === 1) pass("un membre voit l'équipe qu'il a rejointe");
  else fail("visibilité de l'équipe", `le membre voit ${bobSees} équipe(s)`);

  expectAllowed(t, "le coach retire un joueur de SON équipe", ALICE,
    `delete from public.team_members where team_id='${teamC}' and player_id='${BOB}';`);
  expectAllowed(t, "un joueur quitte son équipe", ALICE, `select public.leave_team();`);

  console.log("\n  Écran Administration");
  const sessions = count(t, ADMIN, `select count(*) from public.workout_sessions`);
  const goalsCount = count(t, ADMIN, `select count(*) from public.goals`);
  const profiles = count(t, ADMIN, `select count(*) from public.player_profiles`);
  if (sessions > 0 && goalsCount >= 0 && profiles >= 3) pass(`l'admin lit ses compteurs (${profiles} profils, ${sessions} séances)`);
  else fail("compteurs admin", `profils=${profiles} séances=${sessions} objectifs=${goalsCount}`);
}

function accountAndQuotaScenarios(t: Target) {
  console.log("\n\x1b[1mC. Suppression de compte et plafond du Coach IA (migration 0014)\x1b[0m\n");

  // Deux comptes jetables, avec de vraies données des deux côtés : sans le
  // second, on ne pourrait pas distinguer « la cascade a tout effacé » de
  // « la cascade a effacé trop de choses ».
  const seedData = (uid: string, tag: string) => `
    insert into public.workouts (id, player_id, title, objective, duration_minutes)
      values (gen_random_uuid(),'${uid}','Séance de ${tag}','reception',45);
    insert into public.workout_sessions (player_id, workout_id, status)
      select '${uid}', id, 'completed' from public.workouts where player_id='${uid}' limit 1;
    insert into public.statistics (player_id, category, metric, value) values ('${uid}','service','aces',7);
    insert into public.goals (player_id, name, category, target_value) values ('${uid}','Objectif de ${tag}','service',40);
    insert into public.player_skill_scores (player_id, skill, score, sample_size) values ('${uid}','service',55,3);
    insert into public.skill_signals (player_id, skill, source, direction) values ('${uid}','service','feedback','weakness');
    insert into public.ai_conversations (player_id, title) values ('${uid}','Conversation de ${tag}');
    insert into public.ai_messages (conversation_id, role, content)
      select id, 'user', 'Message de ${tag}' from public.ai_conversations where player_id='${uid}' limit 1;
  `;

  const prepared = t.psql(`
    insert into auth.users (id, email) values ('${CAROL}','carol@test.local'), ('${DAVE}','dave@test.local')
      on conflict (id) do nothing;
    ${seedData(CAROL, "Carol")}
    ${seedData(DAVE, "Dave")}
  `);
  if (prepared.error) {
    fail("préparation du scénario C", firstLine(prepared.error));
    return;
  }

  // --- Plafond quotidien ---------------------------------------------------
  console.log("  Plafond quotidien d'appels au modèle de langage");

  const QUOTA = 30;
  let refusedAt = 0;
  for (let i = 1; i <= QUOTA + 2; i += 1) {
    const allowed = (t.psql(`select allowed from public.consume_ai_quota();`, CAROL).out || "").trim();
    if (allowed !== "t" && refusedAt === 0) refusedAt = i;
  }
  if (refusedAt === QUOTA + 1) pass(`les ${QUOTA} premiers appels passent, le ${QUOTA + 1}ᵉ est refusé`);
  else if (refusedAt === 0) fail("plafond IA", `aucun appel refusé après ${QUOTA + 2} tentatives — la dépense n'est pas bornée`);
  else fail("plafond IA", `refus dès l'appel ${refusedAt} au lieu du ${QUOTA + 1}ᵉ`);

  const counted = count(t, CAROL, `select message_count from public.ai_usage where player_id='${CAROL}'`);
  if (counted === QUOTA) pass(`le compteur s'arrête au plafond (${counted}) au lieu de gonfler indéfiniment`);
  else fail("compteur IA", `message_count=${counted} au lieu de ${QUOTA}`);

  // Le plafond ne vaut que s'il n'est pas contournable par celui qu'il vise.
  expectNoAccess(t, "la consommation d'un autre joueur reste invisible",
    `select count(*) from public.ai_usage where player_id='${CAROL}'`);
  {
    const { rows } = affected(t, CAROL, `update public.ai_usage set message_count=0 where player_id='${CAROL}'`);
    if (rows === 0) pass("remettre son propre compteur à zéro est refusé");
    else fail("compteur IA", `${rows} ligne(s) remise(s) à zéro — le plafond se contourne`);
  }
  {
    const { rows } = affected(t, CAROL, `delete from public.ai_usage where player_id='${CAROL}'`);
    if (rows === 0) pass("supprimer sa propre ligne de quota est refusé");
    else fail("compteur IA", `${rows} ligne(s) supprimée(s) — le plafond se contourne`);
  }

  const daveAllowed = (t.psql(`select allowed from public.consume_ai_quota();`, DAVE).out || "").trim();
  if (daveAllowed === "t") pass("le plafond est par joueur : un autre compte n'est pas affecté");
  else fail("plafond IA", "un joueur au plafond bloque les autres");

  // --- Suppression de compte ----------------------------------------------
  console.log("\n  Suppression de compte");

  const anon = t.psql(`select public.delete_my_account();`);
  if (anon.error) pass("un appel sans utilisateur authentifié est rejeté");
  else fail("suppression de compte", "la RPC s'exécute sans utilisateur authentifié");

  const before = count(t, DAVE, `select count(*) from public.player_profiles where id='${DAVE}'`);
  const removal = t.psql(`select public.delete_my_account();`, CAROL);
  if (removal.error) {
    fail("suppression de compte", firstLine(removal.error));
    return;
  }
  pass("le joueur supprime son propre compte");

  // Lecture en superutilisateur : la RLS masquerait des lignes survivantes et
  // ferait passer une cascade incomplète pour un succès.
  const residual = t.psql(`
    select (select count(*) from auth.users where id='${CAROL}')
         + (select count(*) from public.player_profiles where id='${CAROL}')
         + (select count(*) from public.workouts where player_id='${CAROL}')
         + (select count(*) from public.workout_sessions where player_id='${CAROL}')
         + (select count(*) from public.statistics where player_id='${CAROL}')
         + (select count(*) from public.goals where player_id='${CAROL}')
         + (select count(*) from public.player_skill_scores where player_id='${CAROL}')
         + (select count(*) from public.skill_signals where player_id='${CAROL}')
         + (select count(*) from public.ai_conversations where player_id='${CAROL}')
         + (select count(*) from public.ai_usage where player_id='${CAROL}')
         + (select count(*) from public.ai_messages m
              where not exists (select 1 from public.ai_conversations c where c.id = m.conversation_id));`).out;
  if (Number(residual) === 0) pass("aucune donnée du compte supprimé ne subsiste (profil, séances, stats, objectifs, IA)");
  else fail("suppression de compte", `${residual} ligne(s) survivent à la suppression`);

  const daveIntact = t.psql(`
    select (select count(*) from public.player_profiles where id='${DAVE}')
         + (select count(*) from public.workout_sessions where player_id='${DAVE}')
         + (select count(*) from public.statistics where player_id='${DAVE}')
         + (select count(*) from public.goals where player_id='${DAVE}')
         + (select count(*) from public.player_skill_scores where player_id='${DAVE}')
         + (select count(*) from public.skill_signals where player_id='${DAVE}')
         + (select count(*) from public.ai_conversations where player_id='${DAVE}');`).out;
  if (Number(daveIntact) === 7 && before === 1) pass("les données des autres joueurs sont intactes (7/7)");
  else fail("suppression de compte", `${daveIntact}/7 lignes restantes chez l'autre joueur — la cascade a débordé`);

  const library = count(t, DAVE, `select count(*) from public.exercises`);
  if (library > 300) pass(`la bibliothèque partagée est intacte (${library} exercices)`);
  else fail("suppression de compte", `${library} exercices restants — le contenu partagé a été emporté`);
}

// --- Exécution -------------------------------------------------------------

const url = process.env.DATABASE_URL;
const target = url ? connectToExisting(url) : provisionTemporary();

try {
  console.log(url ? `Base visée : ${url.replace(/:[^:@]*@/, ":***@")}` : "Base PostgreSQL temporaire provisionnée.");
  buildSchema(target);
  seed(target);
  attackScenarios(target);
  normalUseScenarios(target);
  accountAndQuotaScenarios(target);
} catch (e) {
  console.error(`\nErreur de préparation : ${(e as Error).message}`);
  target.cleanup();
  process.exit(2);
}

target.cleanup();

console.log(`\n${"─".repeat(72)}`);
if (failures === 0) {
  console.log(`\x1b[32m${checks} contrôles passés — le cloisonnement entre joueurs est vérifié.\x1b[0m`);
  process.exit(0);
}
console.log(`\x1b[31m${failures} échec(s) sur ${checks} contrôles — NE PAS DÉPLOYER.\x1b[0m`);
process.exit(1);
