# Bingo weselne 3x3 z resetem

Wersja mobilna z Supabase, lokalnym postępem, miniaturami w kafelkach i przyciskiem resetu.

## Ważne

W pliku `app.js` wklej swój `anon public key` tutaj:

```js
const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_PUBLIC_KEY_HERE";
```

Projekt URL jest już wpisany.

## Reset

Przycisk `Rozpocznij od nowa` usuwa z telefonu:

- zapisane imię i nazwisko,
- lokalny postęp planszy,
- lokalne miniatury zdjęć.

Nie usuwa zdjęć ani rekordów zapisanych wcześniej w Supabase.

## Supabase

Bucket:

```text
wedding-photos
```

Tabela:

```text
wedding_tasks
```

Polityki RLS:

```sql
alter table public.wedding_tasks enable row level security;

create policy "Allow public inserts to wedding tasks"
on public.wedding_tasks
for insert
to anon
with check (true);

create policy "Allow public uploads to wedding photos"
on storage.objects
for insert
to anon
with check (bucket_id = 'wedding-photos');
```
