// Contrôle du stockage de la session Supabase.
//
// La session contient le jeton de rafraîchissement, la vraie clé du compte :
// elle doit vivre dans le coffre du système. Mais `expo-secure-store` documente
// une limite de 2 048 octets par valeur, qu'une session dépasse. Ce script
// vérifie le découpage qui règle ce problème, et surtout qu'il échoue de la
// bonne façon — une session à moitié écrite doit se lire comme absente, jamais
// comme tronquée.
//
// Lancement : npm run session:check

import { createChunkedStore, splitIntoChunks, CHUNK_SIZE, type KeyValueStore } from "@/lib/session/chunkedStore";

let failures = 0;

function check(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`OK   ${label}`);
  } else {
    failures += 1;
    console.log(`ÉCHEC ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** Coffre simulé, avec la limite de taille réellement documentée. */
function makeSecureStore(options: { limitBytes?: number; failOnKey?: string } = {}) {
  const data = new Map<string, string>();
  const limit = options.limitBytes ?? 2_048;
  const oversized: string[] = [];
  const store: KeyValueStore & { dump: () => Map<string, string>; oversized: string[] } = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => {
      if (key === options.failOnKey) throw new Error(`écriture refusée pour ${key}`);
      if (Buffer.byteLength(value, "utf8") > limit) oversized.push(key);
      data.set(key, value);
    },
    removeItem: async (key) => void data.delete(key),
    dump: () => data,
    oversized,
  };
  return store;
}

function makePlainStore(initial: Record<string, string> = {}) {
  const data = new Map<string, string>(Object.entries(initial));
  const store: KeyValueStore & { dump: () => Map<string, string> } = {
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => void data.set(key, value),
    removeItem: async (key) => void data.delete(key),
    dump: () => data,
  };
  return store;
}

/**
 * Session Supabase représentative : un JWT d'accès, un jeton de
 * rafraîchissement et l'objet utilisateur. Sert à vérifier que le problème
 * qu'on prétend régler existe réellement.
 */
function realisticSession(options: { richMetadata?: boolean } = {}): string {
  const jwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${"A".repeat(720)}.${"B".repeat(43)}`;
  return JSON.stringify({
    access_token: jwt,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: 1790000000,
    refresh_token: "v1.Mr8kPq2XwLd9",
    user: {
      id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      aud: "authenticated",
      role: "authenticated",
      email: "joueuse@exemple.fr",
      email_confirmed_at: "2026-09-01T10:00:00Z",
      phone: "",
      confirmed_at: "2026-09-01T10:00:00Z",
      last_sign_in_at: "2026-09-28T08:00:00Z",
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: options.richMetadata
        ? {
            username: "Zoé Réception",
            position: "réceptionneur-attaquant",
            level: "intermédiaire",
            team_name: "Volley Club de Saint-Étienne-du-Rouvray",
            goals: ["réception", "attaque", "détente", "service flottant"],
            available_equipment: ["ballon", "filet", "plots", "élastique", "box"],
            preferences: { reminder_hour: 18, dark_mode: true, locale: "fr-FR" },
          }
        : { username: "Zoé Réception" },
      identities: [
        {
          identity_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          user_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          identity_data: { email: "joueuse@exemple.fr", sub: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
          provider: "email",
          created_at: "2026-09-01T10:00:00Z",
          updated_at: "2026-09-28T08:00:00Z",
        },
      ],
      created_at: "2026-09-01T10:00:00Z",
      updated_at: "2026-09-28T08:00:00Z",
      is_anonymous: false,
    },
  });
}

const KEY = "sb-acywvbxezaoioapdmicl-auth-token";

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // Où se situe réellement une session par rapport à la limite du coffre.
  //
  // À contre-courant de ce qu'on lit souvent : une session Supabase minimale
  // ne dépasse PAS 2 048 octets. Elle s'en approche, et le franchit dès que
  // les métadonnées grossissent — équipe, préférences, seconde identité. Le
  // découpage n'est donc pas la réparation d'un dépassement certain, c'est ce
  // qui rend la question sans objet.
  // -------------------------------------------------------------------------
  {
    const minimal = Buffer.byteLength(realisticSession(), "utf8");
    const rich = Buffer.byteLength(realisticSession({ richMetadata: true }), "utf8");
    console.log(`     session minimale : ${minimal} o · session chargée : ${rich} o · limite : 2048 o`);
    // On n'affirme pas qu'une session dépasse toujours la limite — ce serait
    // faux, et ajuster la donnée de test jusqu'à ce que ce soit vrai n'aurait
    // rien prouvé. Ce qui justifie le découpage est la marge : quelques
    // centaines d'octets, sur une valeur dont la taille dépend des claims du
    // jeton et des métadonnées du compte, donc hors de notre contrôle.
    // Parier que ça tient, c'est parier sur le pseudo que choisira un joueur.
    const margin = 2_048 - rich;
    check(`la marge d'une session chargée est mince (${margin} o restants)`, margin < 500, `${margin} octets`);
    check("une session minimale tient encore sous la limite", minimal < 2_048);
    check("le contenu comprend des caractères accentués", /[À-ÿ]/.test(realisticSession()));
  }

  // -------------------------------------------------------------------------
  // 1. Aller-retour, et aucun morceau au-dessus de la limite.
  // -------------------------------------------------------------------------
  {
    const secure = makeSecureStore();
    const store = createChunkedStore({ secure });
    const session = realisticSession({ richMetadata: true });

    await store.setItem(KEY, session);
    const read = await store.getItem(KEY);

    check("1. la session relue est identique à la session écrite", read === session);
    check("1. aucune valeur écrite ne dépasse la limite du coffre", secure.oversized.length === 0, secure.oversized.join(", "));
    check("1. la session est bien découpée en plusieurs morceaux", splitIntoChunks(session).length > 1);
  }

  // -------------------------------------------------------------------------
  // 2. Reprise d'une session écrite par une version précédente.
  // -------------------------------------------------------------------------
  {
    const session = realisticSession();
    const secure = makeSecureStore();
    const legacy = makePlainStore({ [KEY]: session });
    let migrated: string | null = null;
    const store = createChunkedStore({ secure, legacy, onMigrated: (k) => (migrated = k) });

    const read = await store.getItem(KEY);
    check("2. la session de l'ancien stockage est retrouvée", read === session);
    check("2. elle est signalée comme reprise", migrated === KEY);
    check("2. elle a été retirée de l'ancien stockage", (await legacy.getItem(KEY)) === null);
    check("2. et elle est désormais lisible depuis le coffre seul", (await createChunkedStore({ secure }).getItem(KEY)) === session);
  }

  // -------------------------------------------------------------------------
  // 3. Écriture interrompue : absente, jamais tronquée.
  // -------------------------------------------------------------------------
  {
    const session = realisticSession();
    const chunks = splitIntoChunks(session);
    // On fait échouer l'écriture du manifeste, donc après celle des morceaux.
    const secure = makeSecureStore({ failOnKey: KEY });
    const store = createChunkedStore({ secure });

    let threw = false;
    try {
      await store.setItem(KEY, session);
    } catch {
      threw = true;
    }
    check("3. l'écriture interrompue remonte bien une erreur", threw);
    check("3. des morceaux ont pourtant été écrits", [...secure.dump().keys()].some((k) => k.startsWith(`${KEY}.g`)));

    const readBack = await createChunkedStore({ secure: makeSecureStoreFrom(secure) }).getItem(KEY);
    check("3. la relecture rend « absent », pas une session tronquée", readBack === null, String(readBack).slice(0, 40));
    check("3. (contrôle) la session complète aurait fait " + chunks.length + " morceaux", chunks.length > 1);
  }

  // -------------------------------------------------------------------------
  // 3 bis. Réécriture interrompue par-dessus une valeur EXISTANTE.
  //
  // Le cas que le test précédent ne couvrait pas : il écrivait sur un stockage
  // vide. Écrire les nouveaux morceaux par-dessus les anciens laissait, en cas
  // d'interruption, un début de nouvelle valeur suivi d'une fin d'ancienne —
  // une session corrompue que le manifeste inchangé déclarait lisible.
  // -------------------------------------------------------------------------
  {
    const original = realisticSession();
    const secure = makeSecureStore();
    await createChunkedStore({ secure }).setItem(KEY, original);

    // Le rafraîchissement du jeton réécrit la session, et l'écriture du
    // manifeste échoue.
    const renewed = realisticSession({ richMetadata: true });
    const failing = createChunkedStore({ secure: makeFailingManifestStore(secure) });
    try {
      await failing.setItem(KEY, renewed);
    } catch {
      /* attendu */
    }

    const readBack = await createChunkedStore({ secure }).getItem(KEY);
    check("3bis. la session précédente est toujours lisible, intacte", readBack === original);
    check("3bis. ce n'est pas un mélange des deux versions", readBack !== renewed && readBack !== null);
  }

  // -------------------------------------------------------------------------
  // 4. Morceau manquant : on échoue fermé.
  // -------------------------------------------------------------------------
  {
    const secure = makeSecureStore();
    const store = createChunkedStore({ secure });
    await store.setItem(KEY, realisticSession({ richMetadata: true }));
    const aChunk = [...secure.dump().keys()].find((k) => k.startsWith(`${KEY}.g`) && k.endsWith(".1"));
    secure.dump().delete(aChunk as string);

    check("4. un morceau manquant rend la valeur absente", (await store.getItem(KEY)) === null);
  }

  // -------------------------------------------------------------------------
  // 5. Valeur plus courte : aucun fragment de l'ancien jeton ne subsiste.
  // -------------------------------------------------------------------------
  {
    const secure = makeSecureStore();
    const store = createChunkedStore({ secure });
    await store.setItem(KEY, realisticSession());
    const chunkCountBefore = [...secure.dump().keys()].filter((k) => k.startsWith(`${KEY}.`)).length;

    await store.setItem(KEY, JSON.stringify({ access_token: "court" }));
    const chunkCountAfter = [...secure.dump().keys()].filter((k) => k.startsWith(`${KEY}.`)).length;

    check("5. les morceaux orphelins sont effacés", chunkCountAfter < chunkCountBefore, `${chunkCountBefore} → ${chunkCountAfter}`);
    check("5. aucun fragment de l'ancien jeton ne traîne", ![...secure.dump().values()].some((v) => v.includes("AAAAAAAAAA")));
    check("5. la nouvelle valeur se relit correctement", (await store.getItem(KEY)) === JSON.stringify({ access_token: "court" }));
  }

  // -------------------------------------------------------------------------
  // 6. Déconnexion : plus rien, ni dans le coffre ni dans l'ancien stockage.
  // -------------------------------------------------------------------------
  {
    const secure = makeSecureStore();
    const legacy = makePlainStore({ [KEY]: "vieille session" });
    const store = createChunkedStore({ secure, legacy });
    await store.setItem(KEY, realisticSession());
    await store.removeItem(KEY);

    check("6. la session est absente après déconnexion", (await store.getItem(KEY)) === null);
    check("6. aucun morceau ne subsiste dans le coffre", secure.dump().size === 0, [...secure.dump().keys()].join(", "));
    check("6. l'ancien stockage est nettoyé aussi", legacy.dump().size === 0);
  }

  // -------------------------------------------------------------------------
  // 7. Manifeste illisible : absent, pas d'exception.
  // -------------------------------------------------------------------------
  {
    const secure = makeSecureStore();
    await secure.setItem(KEY, "{ceci n'est pas un manifeste");
    const store = createChunkedStore({ secure });
    check("7. un manifeste illisible se lit comme absent", (await store.getItem(KEY)) === null);
  }

  // -------------------------------------------------------------------------
  // 8. Une valeur courte reste correcte (cas du jeton PKCE, bien plus petit).
  // -------------------------------------------------------------------------
  {
    const secure = makeSecureStore();
    const store = createChunkedStore({ secure });
    await store.setItem("sb-pkce-verifier", "abc123");
    check("8. une valeur courte fait un aller-retour correct", (await store.getItem("sb-pkce-verifier")) === "abc123");
    check("8. et une chaîne vide aussi", await (async () => {
      await store.setItem("vide", "");
      return (await store.getItem("vide")) === "";
    })());
  }

  console.log("");
  console.log(`taille de morceau : ${CHUNK_SIZE} caractères`);
  if (failures === 0) {
    console.log("TOUS LES CAS PASSENT");
  } else {
    console.log(`${failures} CAS EN ÉCHEC`);
    process.exitCode = 1;
  }
}

/** Même coffre, mais dont l'écriture du manifeste échoue. */
function makeFailingManifestStore(source: KeyValueStore): KeyValueStore {
  return {
    getItem: (key) => source.getItem(key),
    setItem: async (key, value) => {
      if (!key.includes(".g")) throw new Error(`écriture du manifeste refusée pour ${key}`);
      await source.setItem(key, value);
    },
    removeItem: (key) => source.removeItem(key),
  };
}

/** Recopie l'état d'un coffre simulé, sans son comportement d'échec. */
function makeSecureStoreFrom(source: { dump: () => Map<string, string> }) {
  const copy = makeSecureStore();
  for (const [k, v] of source.dump()) copy.dump().set(k, v);
  return copy;
}

void main();
