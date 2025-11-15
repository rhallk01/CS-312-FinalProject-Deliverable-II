CREATE TABLE IF NOT EXISTS public.collections
(
    id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    user_id character varying(100) COLLATE pg_catalog."default",
    name text COLLATE pg_catalog."default" NOT NULL,
    recipe_ids integer[] DEFAULT '{}'::integer[],
    CONSTRAINT collections_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.recipes
(
    recipe_id integer NOT NULL GENERATED ALWAYS AS IDENTITY ( INCREMENT 1 START 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1 ),
    creator_name character varying(100) COLLATE pg_catalog."default",
    creator_user_id character varying(100) COLLATE pg_catalog."default",
    title character varying COLLATE pg_catalog."default",
    body text COLLATE pg_catalog."default",
    date_created timestamp without time zone,
    time_updated timestamp without time zone,
    tag character varying COLLATE pg_catalog."default",
    difficulty integer,
    ingredients character varying COLLATE pg_catalog."default",
    image_path text COLLATE pg_catalog."default",
    cook_time integer,
    instructions text COLLATE pg_catalog."default",
    cuisinetag text COLLATE pg_catalog."default",
    mealtype text COLLATE pg_catalog."default",
    notes text COLLATE pg_catalog."default",
    avg_rating FLOAT DEFAULT 0,
    num_reviews INT DEFAULT 0,
    CONSTRAINT recipes_pkey PRIMARY KEY (recipe_id)
);

CREATE TABLE IF NOT EXISTS public.users
(
    user_id character varying(100) COLLATE pg_catalog."default" NOT NULL,
    password character varying(100) COLLATE pg_catalog."default" NOT NULL,
    name character varying(100) COLLATE pg_catalog."default" NOT NULL,
    saved_recipes integer[] DEFAULT '{}'::integer[],
    submitted_recipes integer[] DEFAULT '{}'::integer[],
    CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

CREATE TABLE IF NOT EXISTS recipe_ratings (
    id SERIAL PRIMARY KEY,
    recipe_id INT REFERENCES recipes(recipe_id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(user_id),
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    date_created TIMESTAMP DEFAULT NOW()
);