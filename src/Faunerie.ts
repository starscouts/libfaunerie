import {FaunerieFrontend} from "./FaunerieFrontend";
import {IFaunerieOption} from "./IFaunerieOption";
import fs from "fs";
import path from "path";
import {VERSION} from "../index";
import {FauneriePropertyStore} from "./FauneriePropertyStore";
import {Database} from "sqlite3";
import {SQLiteInstance} from "./SQLiteInstance";

export class Faunerie {
    // noinspection JSUnusedGlobalSymbols
    public version: string = VERSION;
    public readonly verbose: boolean;
    public readonly path: string;
    readonly sensitiveImageProtocol: boolean;
    public frontend: FaunerieFrontend;
    readonly cache?: string;
    private sqlite: SQLiteInstance;
    private database: Database;
    private readonly readOnly: boolean;
    public propertyStore: FauneriePropertyStore;

    constructor(options: IFaunerieOption) {
        this.verbose = options.verbose ?? true;
        this.sqlite = require(options.sqlitePath ?? "sqlite3").verbose();

        if (!fs.existsSync(path.resolve(options.database))) throw new Error("Invalid database folder specified: " + path.resolve(options.database));
        if (!fs.existsSync(path.resolve(options.database) + "/instance.pbmk")) throw new Error("Not a valid Faunerie database: " + path.resolve(options.database));

        this.path = path.resolve(options.database);

        if (options.cachePath) {
            if (!fs.existsSync(path.resolve(options.cachePath))) throw new Error("Invalid cache folder specified: " + path.resolve(options.cachePath));
            this.cache = path.resolve(options.cachePath);
        }

        this.readOnly = options.readOnly;
        this.sensitiveImageProtocol = options.sensitiveImageProtocol ?? false;
    }

    async clean() {
        if (this.readOnly) throw new Error("The database is open is read-only mode.");
        await this._sql("DROP TABLE IF EXISTS image_tags");
        await this._sql("DROP TABLE IF EXISTS image_intensities");
        await this._sql("DROP TABLE IF EXISTS image_representations");
        await this._sql("DROP TABLE IF EXISTS image_categories");
        await this._sql("DROP TABLE IF EXISTS images");
        await this._sql("DROP TABLE IF EXISTS uploaders");
        await this._sql("DROP TABLE IF EXISTS tags");
        await this._sql("DROP TABLE IF EXISTS tags_pre");
        await this._sql("DROP TABLE IF EXISTS compressed");
        await this._sql("CREATE TABLE images (id INT NOT NULL UNIQUE, source_id INT NOT NULL UNIQUE, source_name TEXT, source TEXT NOT NULL, animated BOOL, aspect_ratio FLOAT, comment_count INT, created_at TIMESTAMP, deletion_reason LONGTEXT, description LONGTEXT, downvotes INT, duplicate_of INT, duration FLOAT, faves INT, first_seen_at TIMESTAMP, format TEXT, height INT, hidden_from_users BOOL, mime_type TEXT, name LONGTEXT, orig_sha512_hash TEXT, processed BOOL, score INT, sha512_hash TEXT, size INT, source_url LONGTEXT, spoilered BOOL, tag_count INT, thumbnails_generated BOOL, updated_at TIMESTAMP, uploader INT, upvotes INT, width INT, wilson_score FLOAT, PRIMARY KEY (id), FOREIGN KEY (uploader) REFERENCES uploaders(id))");
        await this._sql("CREATE TABLE image_tags (image_id INT NOT NULL UNIQUE, tags LONGTEXT NOT NULL, PRIMARY KEY (image_id), FOREIGN KEY (image_id) REFERENCES images(id))");
        await this._sql("CREATE TABLE image_intensities (image_id INT NOT NULL UNIQUE, ne FLOAT NOT NULL, nw FLOAT NOT NULL, se FLOAT NOT NULL, sw FLOAT NOT NULL, PRIMARY KEY (image_id), FOREIGN KEY (image_id) REFERENCES images(id))");
        await this._sql("CREATE TABLE image_representations (image_id INT NOT NULL UNIQUE, view LONGTEXT NOT NULL, full TEXT, large TEXT, medium TEXT, small TEXT, tall TEXT, thumb TEXT, thumb_small TEXT, thumb_tiny TEXT, PRIMARY KEY (image_id), FOREIGN KEY (image_id) REFERENCES images(id))");
        await this._sql("CREATE TABLE tags (id INT NOT NULL UNIQUE, name TEXT NOT NULL UNIQUE, alias INT, implications LONGTEXT, category TEXT, description LONGTEXT, description_short LONGTEXT, slug TEXT UNIQUE, PRIMARY KEY (id))");
        await this._sql("CREATE TABLE uploaders (id INT NOT NULL UNIQUE, name TEXT, PRIMARY KEY (id))");
        await this._sql("CREATE TABLE IF NOT EXISTS metadata (key TEXT NOT NULL UNIQUE, value LONGTEXT NOT NULL, PRIMARY KEY (key))");
    }

    _sql(query: string) {
        let verbose = this.verbose;
        if (verbose) console.debug("=>", query);

        return new Promise<any>((res, rej) => {
            this.database.all(query, function (err: Error | null, data?: any) {
                if (err) {
                    if (verbose) console.debug("<=", data);
                    rej(err);
                } else {
                    if (verbose) console.debug("<=", data);
                    res(data);
                }
            });
        });
    }

    // noinspection JSUnusedGlobalSymbols
    async initialize(restoreBackup: boolean) {
        if (restoreBackup) {
            let backups = (await fs.promises.readdir(this.path)).filter(i => i.endsWith(".pbdb") && i !== "current.pbdb");

            if (backups.length > 0 && !isNaN(parseInt(backups[0].split(".")[0]))) {
                await fs.promises.copyFile(this.path + "/" + backups[0], this.path + "/current.pbdb");
                await fs.promises.unlink(this.path + "/" + backups[0]);
            }
        }

        if (this.cache) {
            await fs.promises.copyFile(this.path + "/current.pbdb", this.cache + "/work.pbdb");

            if (this.readOnly) {
                this.database = new this.sqlite.Database(this.cache + "/work.pbdb", this.sqlite.OPEN_READONLY);
            } else {
                this.database = new this.sqlite.Database(this.cache + "/work.pbdb");
            }
        } else {
            if (this.readOnly) {
                this.database = new this.sqlite.Database(this.path + "/current.pbdb", this.sqlite.OPEN_READONLY);
            } else {
                this.database = new this.sqlite.Database(this.path + "/current.pbdb");
            }
        }

        await new Promise<void>((res) => {
            this.database.serialize(() => {
                res();
            });
        });

        if (!this.readOnly) {
            if ((await this._sql("SELECT COUNT(*) FROM metadata WHERE key='libfaunerie_timestamp'"))[0]["COUNT(*)"] === 0) {
                await this._sql('INSERT INTO metadata(key, value) VALUES ("libfaunerie_timestamp", "' + new Date().toISOString() + '")');
            } else {
                await this._sql('UPDATE metadata SET value="' + new Date().toISOString() + '" WHERE key="libfaunerie_timestamp"');
            }
        }

        await this._sql("CREATE TABLE IF NOT EXISTS metadata (key TEXT NOT NULL UNIQUE, value LONGTEXT NOT NULL, PRIMARY KEY (key))");

        this.frontend = new FaunerieFrontend(this);
        this.propertyStore = new FauneriePropertyStore(this);
        await this.propertyStore.initialize();

        await this.frontend.initialize();
        await this.defragment();
    }

    async defragment() {
        await this._sql("VACUUM");
    }

    // noinspection JSUnusedGlobalSymbols
    async close() {
        await new Promise<void>((res) => {
            // @ts-ignore
            this.database.wait(() => {
                res();
            });
        });

        await new Promise<void>((res) => {
            this.database.close(() => {
                res();
            });
        });

        if (this.cache) {
            await fs.promises.copyFile(this.cache + "/work.pbdb", this.path + "/current.pbdb");
        }
    }
}
