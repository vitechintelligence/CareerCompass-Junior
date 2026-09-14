ALTER TABLE public.book_pages ADD COLUMN teacher_only boolean NOT NULL DEFAULT false;
DROP POLICY content_read ON public.book_pages;
CREATE POLICY content_read ON public.book_pages FOR SELECT TO cc_runtime USING(cc_private.book_access(book_id) AND (NOT teacher_only OR cc_private.role() IN('teacher','partner_admin','content_editor')));
CREATE FUNCTION cc_private.import_book_bundle(bundle jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE b jsonb:=bundle->'book'; u jsonb; l jsonb; p jsonb; a jsonb; bid uuid; n integer:=0;
BEGIN
 IF bundle->>'version'<>'1' OR jsonb_typeof(bundle->'lessons') IS DISTINCT FROM 'array' OR jsonb_array_length(bundle->'lessons')=0 THEN RAISE EXCEPTION 'invalid content bundle'; END IF;
 bid:=(b->>'id')::uuid;
 IF EXISTS(SELECT FROM public.book_catalog WHERE id=bid) THEN RAISE EXCEPTION 'book exists: create a new edition instead of overwriting active evidence'; END IF;
 INSERT INTO public.book_catalog(id,slug,title,subtitle,age_band,level,cycle_weeks,expected_lessons,source_manifest,status)
 VALUES(bid,b->>'slug',b->'title',b->'subtitle',b->>'age_band',b->>'level',(b->>'cycle_weeks')::integer,(b->>'expected_lessons')::integer,b->'source_manifest','draft');
 FOR u IN SELECT * FROM jsonb_array_elements(bundle->'units') LOOP
  INSERT INTO public.book_units(id,book_id,ordinal,title,skill) VALUES((u->>'id')::uuid,bid,(u->>'ordinal')::integer,u->'title',coalesce(u->'skill','{}'::jsonb));
 END LOOP;
 FOR l IN SELECT * FROM jsonb_array_elements(bundle->'lessons') LOOP
  IF NOT(l->'title' ?& ARRAY['vi-VN','en-PH']) THEN RAISE EXCEPTION 'missing bilingual lesson title'; END IF;
  INSERT INTO public.book_lessons(id,book_id,unit_id,ordinal,title,content,source_pages,adaptation_status)
  VALUES((l->>'id')::uuid,bid,(l->>'unit_id')::uuid,(l->>'ordinal')::integer,l->'title',l->'content',
  ARRAY(SELECT jsonb_array_elements_text(l->'source_pages')::integer),'text_adapted_artwork_pending');
  n:=n+1;
 END LOOP;
 FOR p IN SELECT * FROM jsonb_array_elements(bundle->'pages') LOOP
  INSERT INTO public.book_pages(book_id,page_number,source_text,teacher_only)
  VALUES(bid,(p->>'page_number')::integer,coalesce(p->>'source_text',''),coalesce((p->>'teacher_only')::boolean,false));
 END LOOP;
 FOR a IN SELECT * FROM jsonb_array_elements(bundle->'activities') LOOP
  IF NOT(a->'prompt' ?& ARRAY['vi-VN','en-PH']) THEN RAISE EXCEPTION 'missing bilingual activity prompt'; END IF;
  INSERT INTO public.book_activities(id,book_id,lesson_id,ordinal,kind,prompt,payload,required)
  VALUES((a->>'id')::uuid,bid,(a->>'lesson_id')::uuid,(a->>'ordinal')::integer,a->>'kind',a->'prompt',a->'payload',coalesce((a->>'required')::boolean,true));
  IF a->>'kind' IN('choice','match','sequence') THEN
   IF NOT a ? 'answer' THEN RAISE EXCEPTION 'answer key required'; END IF;
   INSERT INTO cc_private.activity_keys(activity_id,answer) VALUES((a->>'id')::uuid,a->'answer');
  END IF;
 END LOOP;
 IF n<>(b->>'expected_lessons')::integer THEN RAISE EXCEPTION 'lesson count mismatch'; END IF;
 -- Publish the private, text-based learning edition; original-artwork status remains explicit.
 UPDATE public.book_catalog SET status='published' WHERE id=bid;
 RETURN jsonb_build_object('book_id',bid,'lessons',n,'activities',jsonb_array_length(bundle->'activities'));
END $$;
REVOKE ALL ON FUNCTION cc_private.import_book_bundle(jsonb) FROM PUBLIC,cc_runtime;
INSERT INTO cc_private.schema_migrations(version) VALUES('003');
