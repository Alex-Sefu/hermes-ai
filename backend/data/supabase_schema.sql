create table if not exists public.perfumes (
    id text primary key,
    name text not null,
    brand text not null,
    price_ron numeric(10, 2) not null check (price_ron > 0),
    budget_range text not null,
    image_url text,
    reference_url text,
    price integer,
    notes text,
    bottle_style text not null,
    top_notes text[] not null default '{}',
    heart_notes text[] not null default '{}',
    base_notes text[] not null default '{}',
    accords text[] not null default '{}',
    description_ro text not null,
    cross_modal jsonb not null,
    context jsonb not null,
    memory_keywords_ro text[] not null default '{}',
    bio_profile jsonb not null,
    created_at timestamptz not null default now()
);

alter table public.perfumes
    add column if not exists reference_url text;

alter table public.perfumes
    add column if not exists price integer;

alter table public.perfumes
    add column if not exists notes text;

alter table public.perfumes
    drop column if exists parfumo_url;

update public.perfumes as perfume
set reference_url = catalog.reference_url
from (values
    ('zara-red-temptation', 'https://www.parfumo.com/Perfumes/Zara/red-temptation-women'),
    ('zara-vibrant-leather', 'https://www.parfumo.com/Perfumes/Zara/vibrant-leather-2018-eau-de-parfum'),
    ('zara-gardenia', 'https://www.parfumo.com/Perfumes/Zara/gardenia-2016'),
    ('lattafa-asad', 'https://www.parfumo.com/Perfumes/Lattafa/asad-1'),
    ('lattafa-khamrah', 'https://www.parfumo.com/Perfumes/Lattafa/khamrah'),
    ('armaf-club-de-nuit-intense', 'https://www.parfumo.com/Perfumes/Armaf/club-de-nuit-intense-man-eau-de-toilette'),
    ('ajmal-wisal-dhahab', 'https://www.parfumo.com/Perfumes/Ajmal/wisal-dhahab'),
    ('jeanne-arthes-cassandra-rose', NULL),
    ('nike-indigo', 'https://www.parfumo.com/Perfumes/Nike/nike-man-indigo'),
    ('adidas-vibes-energy', 'https://www.parfumo.com/Perfumes/Adidas/energy-drive'),
    ('versace-blue-jeans', 'https://www.parfumo.com/Perfumes/Versace/Blue_Jeans'),
    ('davidoff-cool-water', 'https://www.parfumo.com/Perfumes/Davidoff/Cool_Water_Eau_de_Toilette'),
    ('calvin-klein-one', 'https://www.parfumo.com/Perfumes/Calvin_Klein/CK_One'),
    ('nautica-voyage', 'https://www.parfumo.com/Perfumes/Nautica/Voyage_Eau_de_Toilette'),
    ('lalique-encre-noire', 'https://www.parfumo.com/Perfumes/Lalique/Encre_Noire_Eau_de_Toilette'),
    ('montblanc-individuel', 'https://www.parfumo.com/Perfumes/Montblanc/Individuel_Eau_de_Toilette'),
    ('guess-seductive-homme', 'https://www.parfumo.com/Perfumes/Guess/Guess_Seductive_Homme'),
    ('lattafa-yara', 'https://www.parfumo.com/Perfumes/Lattafa/yara-eau-de-parfum-1'),
    ('afnan-9pm', 'https://www.parfumo.com/Perfumes/Afnan_Perfumes/9pm'),
    ('elizabeth-arden-green-tea', 'https://www.parfumo.com/Perfumes/Elizabeth_Arden/Green_Tea'),
    ('dior-sauvage-edt', 'https://www.parfumo.com/Perfumes/Dior/Sauvage_Eau_de_Toilette'),
    ('chanel-bleu-de-chanel-edp', 'https://www.parfumo.com/Perfumes/Chanel/Bleu_de_Chanel_Eau_de_Parfum'),
    ('ysl-y-edt', 'https://www.parfumo.com/Perfumes/Yves_Saint_Laurent/Y_2017'),
    ('prada-luna-rossa-carbon', 'https://www.parfumo.com/Perfumes/Prada/luna-rossa-carbon-eau-de-toilette'),
    ('armani-acqua-di-gio-edt', 'https://www.parfumo.com/Perfumes/Giorgio_Armani/Acqua_di_Gio_pour_Homme_Eau_de_Toilette'),
    ('montblanc-explorer', 'https://www.parfumo.com/Perfumes/Montblanc/Explorer'),
    ('versace-eros-edt', 'https://www.parfumo.com/Perfumes/Versace/Eros_Eau_de_Toilette'),
    ('valentino-donna-born-in-roma', 'https://www.parfumo.com/Perfumes/Valentino/Valentino_Donna_Born_In_Roma'),
    ('givenchy-gentleman-society', 'https://www.parfumo.com/Perfumes/Givenchy/gentleman-society-eau-de-parfum'),
    ('armani-my-way', 'https://www.parfumo.com/Perfumes/Giorgio_Armani/My_Way'),
    ('chanel-coco-mademoiselle', 'https://www.parfumo.com/Perfumes/Chanel/Coco_Mademoiselle'),
    ('tom-ford-ombre-leather', 'https://www.parfumo.com/Perfumes/Tom_Ford/ombre-leather-2018-eau-de-parfum'),
    ('maison-margiela-by-the-fireplace', 'https://www.parfumo.com/Perfumes/Maison_Margiela/by-the-fireplace'),
    ('le-labo-another-13', 'https://www.parfumo.com/Perfumes/Le_Labo/AnOther_13'),
    ('bdk-gris-charnel', 'https://www.parfumo.com/Perfumes/bdk_Parfums/gris-charnel-eau-de-parfum'),
    ('diptyque-philosykos-edp', 'https://www.parfumo.com/Perfumes/Diptyque/Philosykos_Eau_de_Parfum'),
    ('initio-musk-therapy', 'https://www.parfumo.com/Perfumes/Initio/musk-therapy-extrait-de-parfum'),
    ('amouage-reflection-man', 'https://www.parfumo.com/Perfumes/Amouage/Reflection_Man'),
    ('byredo-bal-dafrique', 'https://www.parfumo.com/Perfumes/Byredo/Bal_d_Afrique_Eau_de_Parfum'),
    ('ysl-tuxedo', 'https://www.parfumo.com/Perfumes/Yves_Saint_Laurent/tuxedo-eau-de-parfum'),
    ('creed-aventus', 'https://www.parfumo.com/Perfumes/Creed/aventus'),
    ('mfk-baccarat-rouge-540', 'https://www.parfumo.com/Perfumes/Maison_Francis_Kurkdjian/Baccarat_Rouge_540_Eau_de_Parfum'),
    ('tom-ford-oud-wood', 'https://www.parfumo.com/Perfumes/Tom_Ford/Oud_Wood_Eau_de_Parfum'),
    ('roja-elysium-parfum-cologne', 'https://www.parfumo.com/Perfumes/Roja_Parfums/elysium-pour-homme-eau-de-parfum-1'),
    ('clive-christian-x', 'https://www.parfumo.com/Perfumes/Clive_Christian/x-for-men'),
    ('frederic-malle-portrait-of-a-lady', 'https://www.parfumo.com/Perfumes/Editions_de_Parfum_Frederic_Malle/portrait-of-a-lady-eau-de-parfum'),
    ('amouage-interlude-man', 'https://www.parfumo.com/Perfumes/Amouage/Interlude_Man'),
    ('xerjoff-naxos', 'https://www.parfumo.com/Perfumes/Xerjoff/naxos'),
    ('parfums-de-marly-delina', 'https://www.parfumo.com/Perfumes/Parfums_de_Marly/Delina'),
    ('mfk-grand-soir', 'https://www.parfumo.com/Perfumes/Maison_Francis_Kurkdjian/grand-soir-eau-de-parfum')
) as catalog(id, reference_url)
where perfume.id = catalog.id;

create index if not exists perfumes_budget_range_idx
    on public.perfumes (budget_range);

create table if not exists public.recommendation_history (
    id bigint generated by default as identity primary key,
    user_profile jsonb not null,
    recommended_perfumes jsonb not null,
    "timestamp" timestamptz not null default now()
);

create index if not exists recommendation_history_timestamp_idx
    on public.recommendation_history ("timestamp" desc);

alter table public.recommendation_history enable row level security;

notify pgrst, 'reload schema';
