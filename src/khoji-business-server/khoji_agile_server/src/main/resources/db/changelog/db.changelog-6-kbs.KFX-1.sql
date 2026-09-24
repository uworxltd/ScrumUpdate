--liquibase formatted sql

--changeset munsib.khan:1 labels:KFX-1
update feature set feature_name = 'For Me' where id = 1;
update feature set feature_name = 'For My Team' where id = 2;

--rollback update feature set feature_name = 'Log my work' where id = 1;
--rollback update feature set feature_name = 'Send work log reminder' where id = 2;;