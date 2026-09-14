-- INSERT ... RETURNING must see a newly created class before helper queries can resolve it.
ALTER POLICY classes_read ON public.classes USING(organization_id=cc_private.org() AND (cc_private.partner() OR cc_private.class_access(id)));
INSERT INTO cc_private.schema_migrations(version) VALUES('004');
