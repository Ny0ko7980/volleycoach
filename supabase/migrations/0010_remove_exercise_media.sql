-- Coach Volley — retrait des vidéos d'exemple trouvées automatiquement.
--
-- Ces 17 liens YouTube avaient été sélectionnés par recherche web sans que leur
-- intégrabilité puisse être vérifiée. Plusieurs sont refusés par le lecteur
-- (erreur 152 : le propriétaire interdit l'intégration), ce qui affiche un
-- cadre d'erreur dans la fiche de l'exercice.
--
-- Le lecteur vidéo et le champ "Lien vidéo" de l'admin restent en place : il
-- suffit de renseigner un lien pour qu'une vidéo réapparaisse, qu'il s'agisse
-- d'un fichier hébergé (lecture native, sans restriction) ou d'un lien YouTube
-- dont on a vérifié qu'il accepte l'intégration.
--
-- Ne vise que les liens posés par la migration 0007 : une vidéo ajoutée
-- manuellement depuis l'admin n'est pas touchée.

update public.exercises
set media_url = null
where media_url in (
  'https://www.youtube.com/watch?v=eUDY6AGS1-A',
  'https://www.youtube.com/watch?v=b5DS_RI5Zfc',
  'https://www.youtube.com/watch?v=twMHJhUqo80',
  'https://www.youtube.com/watch?v=Mgug7BpVKTg',
  'https://www.youtube.com/watch?v=50TUVvPLKr8',
  'https://www.youtube.com/watch?v=3aQgfk0VtEA',
  'https://www.youtube.com/watch?v=cvK__ewJGKM',
  'https://www.youtube.com/watch?v=u-V5R4pDkIE',
  'https://www.youtube.com/watch?v=amVtOHl4TAk',
  'https://www.youtube.com/watch?v=cprkyEDaWVY',
  'https://www.youtube.com/watch?v=fL66hVKR89Q',
  'https://www.youtube.com/watch?v=hoPwUu8vvvw',
  'https://www.youtube.com/watch?v=aAuv6FlvOKE',
  'https://www.youtube.com/watch?v=JRrZvvX8M5w',
  'https://www.youtube.com/watch?v=lEkr3qgIDlI',
  'https://www.youtube.com/watch?v=PAtpLLUF6hY',
  'https://www.youtube.com/watch?v=sKfStLvgnMc'
);
