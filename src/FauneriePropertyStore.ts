import {Faunerie} from "./Faunerie";

export class FauneriePropertyStore {
    backend: Faunerie;
    length: number;

    constructor(backend: Faunerie) {
        this.backend = backend;
    }

    async initialize() {
        this.length = (await this.backend._sql("SELECT COUNT(*) FROM metadata"))[0]["COUNT(*)"];
    }

    private sqlstr(str?: string) {
        if (str === null) {
            return "NULL";
        } else {
            return "'" + str.replaceAll("'", "''") + "'";
        }
    }

    // noinspection JSUnusedGlobalSymbols
    async setItem(key: string, value: string) {
        if ((await this.backend._sql("SELECT COUNT(*) FROM metadata WHERE key = " + this.sqlstr(key)))[0]["COUNT(*)"] === 0) {
            await this.backend._sql('INSERT INTO metadata(key, value) VALUES (' + this.sqlstr(key) + ', ' + this.sqlstr(value) + ')');
            this.length = (await this.backend._sql("SELECT COUNT(*) FROM metadata"))[0]["COUNT(*)"];
        } else {
            await this.backend._sql('UPDATE metadata SET value = ' + this.sqlstr(value) + ' WHERE key = ' + this.sqlstr(key));
        }
    }

    // noinspection JSUnusedGlobalSymbols
    async removeItem(key: string) {
        if ((await this.backend._sql("SELECT COUNT(*) FROM metadata WHERE key = " + this.sqlstr(key)))[0]["COUNT(*)"] === 0) {
            return;
        } else {
            await this.backend._sql('DELETE FROM metadata WHERE key = ' + this.sqlstr(key));
            this.length = (await this.backend._sql("SELECT COUNT(*) FROM metadata"))[0]["COUNT(*)"];
        }
    }

    // noinspection JSUnusedGlobalSymbols
    async getItem(key: string) {
        if ((await this.backend._sql("SELECT COUNT(*) FROM metadata WHERE key = " + this.sqlstr(key)))[0]["COUNT(*)"] === 0) {
            return null;
        } else {
            return (await this.backend._sql('SELECT value FROM metadata WHERE key = ' + this.sqlstr(key)))[0]["value"];
        }
    }

    // noinspection JSUnusedGlobalSymbols
    async clear() {
        await this.backend._sql("DROP TABLE IF EXISTS metadata");
        await this.backend._sql("CREATE TABLE metadata (key TEXT NOT NULL UNIQUE, value LONGTEXT NOT NULL, PRIMARY KEY (key))");
        this.length = (await this.backend._sql("SELECT COUNT(*) FROM metadata"))[0]["COUNT(*)"];
    }
}
