-- A blogképek bináris tartalma kikerül az adatbázisból: a fájlok a lemezen,
-- a storage/blog-media mappában laknak, itt csak a metaadat marad.
ALTER TABLE `blog_media` ADD COLUMN `storage_name` VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE `blog_media` ALTER COLUMN `storage_name` DROP DEFAULT;
ALTER TABLE `blog_media` DROP COLUMN `data`;
