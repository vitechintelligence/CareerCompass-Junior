ALTER TABLE public.users ADD COLUMN username text NOT NULL DEFAULT '';
CREATE FUNCTION cc_private.rate_gate(k text,lim integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,cc_private AS $$
DECLARE n integer;
BEGIN
 INSERT INTO cc_private.rate_limits(key,attempts,window_at) VALUES(k,1,now())
 ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN rate_limits.window_at<now()-interval '15 minutes' THEN 1 ELSE rate_limits.attempts+1 END,
 window_at=CASE WHEN rate_limits.window_at<now()-interval '15 minutes' THEN now() ELSE rate_limits.window_at END RETURNING attempts INTO n;
 RETURN n<=lim;
END $$;
CREATE FUNCTION cc_private.bind_session(h text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE i cc_private.identities; s cc_private.sessions; u public.users;
BEGIN
 PERFORM set_config('cc.actor','',true),set_config('cc.org','',true),set_config('cc.role','',true);
 SELECT * INTO s FROM cc_private.sessions WHERE token_hash=h AND expires_at>now() AND revoked_at IS NULL;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO i FROM cc_private.identities WHERE id=s.user_id AND active;
 IF NOT FOUND THEN RETURN NULL; END IF;
 PERFORM set_config('cc.actor',i.id::text,true),set_config('cc.org',i.organization_id::text,true),set_config('cc.role',i.role,true);
 SELECT * INTO u FROM public.users WHERE id=i.id;
 RETURN jsonb_build_object('id',i.id,'organization_id',i.organization_id,'role',i.role,'semantic_id',i.semantic_id,
 'username',i.username,'display_name',u.display_name,'locale',u.locale,'csrf',s.csrf_nonce);
END $$;
CREATE FUNCTION cc_private.login(org_slug text,uname text,pw text,ip_tag text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE i cc_private.identities; h text; ready boolean; tok text; csrf text; account_allowed boolean; ip_allowed boolean;
BEGIN
 account_allowed:=cc_private.rate_gate('login-account:'||org_slug||':'||uname,10);
 ip_allowed:=cc_private.rate_gate('login-ip:'||ip_tag,100);
 IF NOT account_allowed OR NOT ip_allowed THEN RETURN jsonb_build_object('ok',false); END IF;
 SELECT ident.* INTO i FROM cc_private.identities ident JOIN public.organizations o ON o.id=ident.organization_id
 WHERE o.slug=lower(org_slug) AND ident.username=lower(uname) AND ident.active;
 IF i.role='student' THEN SELECT password_hash,activated INTO h,ready FROM cc_private.student_credentials WHERE student_id=i.id;
 ELSE SELECT password_hash,activated INTO h,ready FROM cc_private.staff_credentials WHERE user_id=i.id; END IF;
 IF h IS NULL THEN h:=crypt('unavailable-account',gen_salt('bf',12)); ready:=false; END IF;
 IF octet_length(pw)>72 OR octet_length(pw)<8 OR NOT coalesce(ready,false) OR crypt(pw,h)<>h THEN RETURN jsonb_build_object('ok',false); END IF;
 tok:=encode(gen_random_bytes(32),'hex'); csrf:=encode(gen_random_bytes(24),'hex');
 INSERT INTO cc_private.sessions(token_hash,user_id,csrf_nonce,expires_at) VALUES(encode(digest(tok,'sha256'),'hex'),i.id,csrf,now()+interval '8 hours');
 INSERT INTO cc_private.audit_events(organization_id,actor_id,action,object_id) VALUES(i.organization_id,i.id,'login',i.id);
 RETURN jsonb_build_object('ok',true,'token',tok);
END $$;
CREATE FUNCTION cc_private.logout(h text) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,cc_private AS $$
 UPDATE cc_private.sessions SET revoked_at=now() WHERE token_hash=h
$$;
CREATE FUNCTION cc_private.activate(org_slug text,uname text,ticket text,pw text,ip_tag text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE i cc_private.identities; matched uuid; min_length integer;
BEGIN
 IF NOT cc_private.rate_gate('activation:'||ip_tag,30) THEN RETURN false; END IF;
 SELECT ident.* INTO i FROM cc_private.identities ident JOIN public.organizations o ON o.id=ident.organization_id WHERE o.slug=org_slug AND ident.username=uname AND ident.active;
 IF NOT FOUND THEN RETURN false; END IF;
 min_length:=CASE WHEN i.role='student' THEN 8 ELSE 12 END;
 IF octet_length(pw)<min_length OR octet_length(pw)>72 THEN RETURN false; END IF;
 IF i.role='student' THEN
  UPDATE cc_private.student_credentials SET password_hash=crypt(pw,gen_salt('bf',12)),activated=true,activation_hash=NULL,activation_expires_at=NULL,changed_at=now()
  WHERE student_id=i.id AND activation_hash=encode(digest(ticket,'sha256'),'hex') AND activation_expires_at>now() RETURNING student_id INTO matched;
 ELSE
  UPDATE cc_private.staff_credentials SET password_hash=crypt(pw,gen_salt('bf',12)),activated=true,activation_hash=NULL,activation_expires_at=NULL
  WHERE user_id=i.id AND activation_hash=encode(digest(ticket,'sha256'),'hex') AND activation_expires_at>now() RETURNING user_id INTO matched;
 END IF;
 IF matched IS NULL THEN RETURN false; END IF;
 UPDATE cc_private.sessions SET revoked_at=now() WHERE user_id=i.id AND revoked_at IS NULL;
 INSERT INTO cc_private.audit_events(organization_id,actor_id,action,object_id) VALUES(i.organization_id,i.id,'credential_activated',i.id);
 RETURN true;
END $$;
CREATE FUNCTION cc_private.provision_person(alias text,person_role text,c uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE uid uuid:=gen_random_uuid(); sid text; uname text; ticket text; hash text; oid uuid:=cc_private.org();
BEGIN
 IF NOT coalesce(cc_private.partner(),false) OR person_role NOT IN('student','teacher') THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF length(alias)<1 OR length(alias)>80 THEN RAISE EXCEPTION 'invalid alias'; END IF;
 IF c IS NOT NULL AND NOT EXISTS(SELECT FROM public.classes WHERE id=c AND organization_id=oid) THEN RAISE EXCEPTION 'class not found' USING ERRCODE='42501'; END IF;
 sid:='vn-ccj-'||replace(uid::text,'-',''); uname:=CASE WHEN person_role='student' THEN 's-' ELSE 't-' END||substr(replace(uid::text,'-',''),1,16);
 ticket:=encode(gen_random_bytes(24),'hex'); hash:=crypt(encode(gen_random_bytes(32),'hex'),gen_salt('bf',12));
 INSERT INTO cc_private.identities(id,organization_id,semantic_id,username,role) VALUES(uid,oid,sid,uname,person_role);
 INSERT INTO public.users(id,organization_id,display_name,role,semantic_id,username) VALUES(uid,oid,alias,person_role,sid,uname);
 IF person_role='student' THEN
  INSERT INTO cc_private.student_credentials(student_id,password_hash,activation_hash,activation_expires_at) VALUES(uid,hash,encode(digest(ticket,'sha256'),'hex'),now()+interval '24 hours');
  IF c IS NOT NULL THEN INSERT INTO public.class_memberships(organization_id,class_id,student_id) VALUES(oid,c,uid); END IF;
 ELSE
  INSERT INTO cc_private.staff_credentials(user_id,password_hash,activation_hash,activation_expires_at) VALUES(uid,hash,encode(digest(ticket,'sha256'),'hex'),now()+interval '24 hours');
  IF c IS NOT NULL THEN INSERT INTO public.teacher_assignments(organization_id,class_id,teacher_id) VALUES(oid,c,uid); END IF;
 END IF;
 INSERT INTO cc_private.audit_events(organization_id,actor_id,action,object_id) VALUES(oid,cc_private.actor(),'provision_'||person_role,uid);
 RETURN jsonb_build_object('id',uid,'semantic_id',sid,'username',uname,'activation_code',ticket,'expires_in_hours',24);
END $$;
CREATE FUNCTION public.provision_k12_student(alias text,class_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
 SELECT cc_private.provision_person(alias,'student',class_id)
$$;
CREATE FUNCTION cc_private.reset_access(uid uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE i cc_private.identities; ticket text:=encode(gen_random_bytes(24),'hex');
BEGIN
 IF NOT coalesce(cc_private.partner(),false) THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO i FROM cc_private.identities WHERE id=uid AND organization_id=cc_private.org() AND role IN('student','teacher') AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not found' USING ERRCODE='42501'; END IF;
 IF i.role='student' THEN
 UPDATE cc_private.student_credentials SET activated=false,activation_hash=encode(digest(ticket,'sha256'),'hex'),activation_expires_at=now()+interval '24 hours' WHERE student_id=uid;
 ELSE
 UPDATE cc_private.staff_credentials SET activated=false,activation_hash=encode(digest(ticket,'sha256'),'hex'),activation_expires_at=now()+interval '24 hours' WHERE user_id=uid;
 END IF;
 UPDATE cc_private.sessions SET revoked_at=now() WHERE user_id=uid;
 INSERT INTO cc_private.audit_events(organization_id,actor_id,action,object_id) VALUES(i.organization_id,cc_private.actor(),'reset_access',uid);
 RETURN jsonb_build_object('id',uid,'username',i.username,'semantic_id',i.semantic_id,'activation_code',ticket,'expires_in_hours',24);
END $$;
CREATE FUNCTION cc_private.register_partner(ticket text,org_name text,org_slug text,org_kind text,uname text,pw text,ip_tag text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE oid uuid; uid uuid:=gen_random_uuid(); sid text:='vn-partner-'||replace(gen_random_uuid()::text,'-',''); invite text;
BEGIN
 IF NOT cc_private.rate_gate('register:'||ip_tag,10) OR octet_length(pw)<12 OR octet_length(pw)>72 THEN RETURN false; END IF;
 UPDATE cc_private.partner_invites SET used_at=now() WHERE token_hash=encode(digest(ticket,'sha256'),'hex') AND used_at IS NULL AND expires_at>now() RETURNING token_hash INTO invite;
 IF invite IS NULL THEN RETURN false; END IF;
 INSERT INTO public.organizations(name,slug,kind) VALUES(org_name,org_slug,org_kind) RETURNING id INTO oid;
 INSERT INTO cc_private.identities(id,organization_id,semantic_id,username,role) VALUES(uid,oid,sid,uname,'partner_admin');
 INSERT INTO public.users(id,organization_id,display_name,role,semantic_id,username) VALUES(uid,oid,'Partner administrator','partner_admin',sid,uname);
 INSERT INTO cc_private.staff_credentials(user_id,password_hash,activated) VALUES(uid,crypt(pw,gen_salt('bf',12)),true);
 INSERT INTO cc_private.audit_events(organization_id,actor_id,action,object_id) VALUES(oid,uid,'partner_registered',oid);
 RETURN true;
END $$;
CREATE FUNCTION public.submit_book_activity(eid uuid,aid uuid,response_body jsonb,idem uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE e public.book_enrollments; a public.book_activities; old public.activity_attempts; answer_key jsonb;
 is_correct boolean; result_status text; attempt_uuid uuid; capsule_uuid uuid; total integer; practiced integer; submitted integer;
BEGIN
 IF cc_private.role()<>'student' OR cc_private.actor() IS NULL THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 IF pg_column_size(response_body)>48000 OR jsonb_typeof(response_body)<>'object' THEN RAISE EXCEPTION 'invalid response'; END IF;
 SELECT * INTO e FROM public.book_enrollments WHERE id=eid AND student_id=cc_private.actor() AND organization_id=cc_private.org() AND active FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not enrolled' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT FROM public.class_memberships WHERE student_id=e.student_id AND class_id=e.class_id) THEN RAISE EXCEPTION 'not a member' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.book_activities WHERE id=aid AND book_id=e.book_id;
 IF NOT FOUND OR NOT EXISTS(SELECT FROM public.book_catalog WHERE id=e.book_id AND status='published') THEN RAISE EXCEPTION 'unavailable' USING ERRCODE='42501'; END IF;
 SELECT * INTO old FROM public.activity_attempts WHERE student_id=e.student_id AND idempotency_key=idem;
 IF FOUND THEN
  IF old.enrollment_id<>eid OR old.activity_id<>aid OR old.response<>response_body THEN RAISE EXCEPTION 'idempotency conflict' USING ERRCODE='23505'; END IF;
  RETURN jsonb_build_object('attempt_id',old.id,'status',old.status,'correct',old.correct,'replayed',true);
 END IF;
 IF a.kind IN('choice','match','sequence') THEN
  SELECT answer INTO answer_key FROM cc_private.activity_keys WHERE activity_id=aid AND version=a.version;
  IF NOT FOUND OR response_body->'answer' IS NULL THEN RAISE EXCEPTION 'missing answer'; END IF;
  is_correct:=response_body->'answer'=answer_key;
  result_status:=CASE WHEN is_correct THEN 'practised' ELSE 'needs_practice' END;
 ELSE
  IF a.kind IN('reflection','mission') AND length(trim(coalesce(response_body->>'text','')))<1 THEN RAISE EXCEPTION 'response required'; END IF;
  IF a.kind='speaking' AND response_body->'practised'<>'true'::jsonb THEN RAISE EXCEPTION 'practice confirmation required'; END IF;
  IF a.kind='drawing' AND (jsonb_typeof(response_body->'strokes') IS DISTINCT FROM 'array' OR jsonb_array_length(response_body->'strokes')=0) THEN RAISE EXCEPTION 'drawing required'; END IF;
  is_correct:=NULL; result_status:='submitted';
 END IF;
 INSERT INTO public.activity_attempts(organization_id,enrollment_id,student_id,class_id,book_id,activity_id,idempotency_key,response,status,correct,activity_version)
 VALUES(e.organization_id,e.id,e.student_id,e.class_id,e.book_id,a.id,idem,response_body,result_status,is_correct,a.version) RETURNING id INTO attempt_uuid;
 INSERT INTO public.learning_capsules(organization_id,student_id,class_id,attempt_id,evidence_digest,summary)
 VALUES(e.organization_id,e.student_id,e.class_id,attempt_uuid,encode(digest(convert_to(response_body::text,'UTF8'),'sha256'),'hex'),
 jsonb_build_object('book_id',a.book_id,'lesson_id',a.lesson_id,'activity_id',a.id,'kind',a.kind,'status',result_status,'version',a.version,'automated_assessment',is_correct IS NOT NULL))
 RETURNING id INTO capsule_uuid;
 SELECT count(*) INTO total FROM public.book_activities WHERE book_id=e.book_id AND required;
 SELECT count(DISTINCT at.activity_id) FILTER(WHERE at.status='practised'),count(DISTINCT at.activity_id) FILTER(WHERE at.status='submitted')
 INTO practiced,submitted FROM public.activity_attempts at JOIN public.book_activities ba ON ba.id=at.activity_id AND ba.required WHERE enrollment_id=e.id;
 INSERT INTO public.book_progress(enrollment_id,organization_id,student_id,class_id,book_id,practiced_activities,submitted_activities,total_activities)
 VALUES(e.id,e.organization_id,e.student_id,e.class_id,e.book_id,practiced,submitted,total)
 ON CONFLICT(enrollment_id) DO UPDATE SET practiced_activities=excluded.practiced_activities,submitted_activities=excluded.submitted_activities,total_activities=excluded.total_activities,updated_at=now();
 RETURN jsonb_build_object('attempt_id',attempt_uuid,'capsule_id',capsule_uuid,'status',result_status,'correct',is_correct,'replayed',false);
END $$;
CREATE FUNCTION cc_private.confirm_payment(pid uuid,receipt text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
DECLARE p public.payments;
BEGIN
 IF NOT coalesce(cc_private.partner(),false) OR length(trim(receipt))<3 OR length(receipt)>200 THEN RAISE EXCEPTION 'forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.payments WHERE id=pid AND organization_id=cc_private.org() FOR UPDATE;
 IF NOT FOUND OR p.status<>'pending' THEN RETURN false; END IF;
 UPDATE public.payments SET status='paid',reference=receipt,paid_at=now() WHERE id=pid;
 INSERT INTO cc_private.audit_events(organization_id,actor_id,action,object_id) VALUES(p.organization_id,cc_private.actor(),'manual_payment_confirmed',pid);
 RETURN true;
END $$;
CREATE FUNCTION cc_private.feedback_recorded() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,cc_private AS $$
BEGIN
 UPDATE public.learning_capsules SET review_status='reviewed' WHERE id=NEW.capsule_id AND organization_id=NEW.organization_id AND student_id=NEW.student_id AND class_id=NEW.class_id;
 INSERT INTO cc_private.audit_events(organization_id,actor_id,action,object_id) VALUES(NEW.organization_id,NEW.teacher_id,'feedback_recorded',NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER feedback_recorded AFTER INSERT ON public.teacher_feedback FOR EACH ROW EXECUTE FUNCTION cc_private.feedback_recorded();
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA cc_private FROM PUBLIC;
REVOKE ALL ON FUNCTION public.provision_k12_student(text,uuid),public.submit_book_activity(uuid,uuid,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cc_private.bind_session(text),cc_private.login(text,text,text,text),cc_private.logout(text),cc_private.activate(text,text,text,text,text),cc_private.provision_person(text,text,uuid),cc_private.reset_access(uuid),cc_private.register_partner(text,text,text,text,text,text,text),cc_private.confirm_payment(uuid,text),public.provision_k12_student(text,uuid),public.submit_book_activity(uuid,uuid,jsonb,uuid) TO cc_runtime;
INSERT INTO cc_private.schema_migrations(version) VALUES('002');
