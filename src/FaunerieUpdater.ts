import {Faunerie} from "./Faunerie";
import fs from "fs";
import http from "http";
import {IFaunerieUpdaterGeneric} from "./IFaunerieUpdaterGeneric";
import {IncomingMessage, ServerResponse} from "node:http";

export class FaunerieUpdater {
    private readonly database: Faunerie;

    constructor(instance: Faunerie) {
        this.database = instance;
    }

    // noinspection JSUnusedGlobalSymbols
    updateFromPreprocessed(preprocessed: string, tags: string, statusUpdateHandler: Function) {
        return new Promise<void>((res) => {
            let sqlGet: Function;
            let sqlQuery: Function;
            let protectedEncode: Function;
            let database = this.database;

            const zlib = require('zlib');

            sqlGet = sqlQuery = async (query: string) => {
                return await database._sql(query);
            }

            protectedEncode = (b: string) => {
                return zlib.deflateRawSync(b, {level: 9});
            }

            function sqlstr(str?: string) {
                if (str === null) {
                    return "NULL";
                } else {
                    return "'" + str.replaceAll("'", "''") + "'";
                }
            }

            function sleep(ms: number) {
                return new Promise((res) => {
                    setTimeout(res, ms);
                });
            }

            async function addToDB(images: object[]) {
                await sqlQuery(`PRAGMA foreign_keys = OFF`);

                let tags = {};

                for (let image of images) {
                    let imageTags = image['tags'].map((i: number, j: object) => {
                        return [image['tag_ids'][j], i];
                    });

                    for (let tag of imageTags) {
                        tags[tag[0]] = tag[1];
                    }
                }

                let uploaders = {};

                for (let image of images) {
                    if (image['uploader_id']) {
                        uploaders[image['uploader_id']] = image['uploader'];
                    }
                }

                let index = 0;
                let u = Object.entries(uploaders);

                for (let i = 0; i < u.length; i += 50) {
                    const chunk = u.slice(i, i + 50);

                    for (let uploader of chunk) {
                        if ((await sqlGet(`SELECT COUNT(*) FROM uploaders WHERE id=${uploader[0]}`))[0]["COUNT(*)"]) {
                            await sqlQuery(`DELETE FROM uploaders WHERE id=${uploader[0]}`);
                        }
                    }

                    // @ts-ignore
                    await sqlQuery(`INSERT INTO uploaders(id, name) VALUES ${chunk.map(uploader => `(${uploader[0]}, '${(uploader[1] ?? "").replaceAll("'", "''")}')`).join(",")}`);

                    index += 50;
                }

                index = 0;

                let v = images;

                for (let i = 0; i < v.length; i += 50) {
                    const chunk = v.slice(i, i + 50);

                    for (let image of chunk) {
                        if ((await sqlGet(`SELECT COUNT(*) FROM images WHERE id=${image['id']}`))[0]["COUNT(*)"]) {
                            await sqlQuery(`DELETE FROM images WHERE id=${image['id']}`);
                            await sqlQuery(`DELETE FROM image_tags WHERE image_id=${image['id']}`);
                            await sqlQuery(`DELETE FROM image_intensities WHERE image_id=${image['id']}`);
                            await sqlQuery(`DELETE FROM image_representations WHERE image_id=${image['id']}`);
                        }
                    }

                    await sqlQuery(`INSERT INTO images(id, source_id, source_name, source, animated, hidden_from_users, processed, spoilered, thumbnails_generated, aspect_ratio, duration, wilson_score, created_at, first_seen_at, updated_at, comment_count, downvotes, duplicate_of, faves, height, score, size, tag_count, upvotes, width, deletion_reason, description, format, mime_type, name, orig_sha512_hash, sha512_hash, source_url, uploader) VALUES ${chunk.map(image => `(${image['id']}, ${image['source_id'] ?? image['id']}, ${sqlstr(image['source_name'] ?? null)}, ${sqlstr(image['source'] ?? null)}, ${image['animated'] ? 'TRUE' : 'FALSE'}, ${image['hidden_from_users'] ? 'TRUE' : 'FALSE'}, ${image['processed'] ? 'TRUE' : 'FALSE'}, ${image['spoilered'] ? 'TRUE' : 'FALSE'}, ${image['thumbnails_generated'] ? 'TRUE' : 'FALSE'}, ${image['aspect_ratio']}, ${image['duration']}, ${image['wilson_score']}, ${new Date(image['created_at']).getTime() / 1000}, ${new Date(image['first_seen_at']).getTime() / 1000}, ${new Date(image['updated_at']).getTime() / 1000}, ${image['comment_count']}, ${image['downvotes']}, ${image['duplicate_of']}, ${image['faves']}, ${image['height']}, ${image['score']}, ${image['size']}, ${image['tag_count']}, ${image['upvotes']}, ${image['width']}, ${sqlstr(image['deletion_reason'])}, ${sqlstr(image['description'])}, ${sqlstr(image['format'])}, ${sqlstr(image['mime_type'])}, ${sqlstr(image['name'])}, ${sqlstr(image['orig_sha512_hash'])}, ${sqlstr(image['sha512_hash'])}, ${sqlstr(image['source_url'])}, ${image['uploader_id']})`).join(",")}`);
                    await sqlQuery(`INSERT INTO image_tags(image_id, tags) VALUES ${chunk.map(image => `(${image['id']}, ",${image['tag_ids'].join(",")},")`).join(",")}`);
                    await sqlQuery(`INSERT INTO image_intensities(image_id, ne, nw, se, sw) VALUES ${chunk.map(image => `(${image['id']}, ${image['intensities']?.ne ?? null}, ${image['intensities']?.nw ?? null}, ${image['intensities']?.se ?? null}, ${image['intensities']?.sw ?? null})`).join(",")}`);
                    await sqlQuery(`INSERT INTO image_representations(image_id, view, full, large, medium, small, tall, thumb, thumb_small, thumb_tiny) VALUES ${chunk.map(image => `(${image['id']}, ${sqlstr(image['view_url'])}, ${sqlstr(image['representations'].full)}, ${sqlstr(image['representations'].large)}, ${sqlstr(image['representations'].medium)}, ${sqlstr(image['representations'].small)}, ${sqlstr(image['representations'].tall)}, ${sqlstr(image['representations'].thumb)}, ${sqlstr(image['representations'].thumb_small)}, ${sqlstr(image['representations'].thumb_tiny)})`).join(",")}`);

                    index += 50;
                }

                await sqlQuery(`PRAGMA foreign_keys = ON`);
            }

            async function cleanDB() {
                await database.clean();
            }

            function timeToString(time: number | string | Date) {
                if (!isNaN(parseInt(time as string))) {
                    time = new Date(time).getTime();
                }

                let periods = ["second", "minute", "hour", "day", "week", "month", "year", "age"];

                let lengths = [60, 60, 24, 7, 4.35, 12, 100];

                let difference = (time as number) / 1000;
                let period: string;

                let j: number;

                for (j = 0; difference >= lengths[j] && j < lengths.length - 1; j++) {
                    difference /= lengths[j];
                }

                difference = Math.round(difference);

                period = periods[j];

                return `${difference} ${period}${difference > 1 ? "s" : ""}`;
            }

            if (typeof window !== "undefined") {
                global = window;
            }

            async function consolidateDB() {
                await sqlQuery("DROP TABLE IF EXISTS tags_pre");

                statusUpdateHandler([{
                    title: "Saving database...", progress: 0, indeterminate: false
                }]);

                if (database.cache) {
                    await fs.promises.copyFile(database.cache + "/work.pbdb", database.path + "/current.pbdb");
                }

                fs.unlinkSync(global.oldDBFile ?? null);
                res();
            }

            let update = async () => {
                const fs = require('fs');
                const path = require('path');

                process.chdir(this.database.path);

                statusUpdateHandler([{
                    title: "Backup up database...", progress: 0, indeterminate: false
                }]);

                global.oldDBFile = this.database.path + "/" + new Date().getTime() + ".pbdb";
                fs.copyFileSync(this.database.path + "/current.pbdb", global.oldDBFile);

                statusUpdateHandler([{
                    title: "Cleaning up database...", progress: 0, indeterminate: false
                }]);
                await cleanDB();

                statusUpdateHandler([{
                    title: "Preparing update...", progress: 0, indeterminate: false
                }]);

                let sqlPreGet = (sql: string) => {
                    return new Promise((res, rej) => {
                        global.preDatabase.all(sql, function (err: Error | null, data: IFaunerieUpdaterGeneric) {
                            if (err) {
                                rej(err);
                            } else {
                                res(data);
                            }
                        });
                    });
                }

                let sqlTagGet = (sql: string) => {
                    return new Promise((res, rej) => {
                        global.tagsDatabase.all(sql, function (err: Error | null, data: IFaunerieUpdaterGeneric) {
                            if (err) {
                                rej(err);
                            } else {
                                res(data);
                            }
                        });
                    });
                }

                const sqlite3 = require(process.platform === "darwin" ? "../../../sql/mac" : "../../../sql/win");

                global.preDatabase = new sqlite3.Database(preprocessed);
                global.tagsDatabase = new sqlite3.Database(tags);

                await new Promise<void>((res) => {
                    global.preDatabase.serialize(() => {
                        res();
                    });
                });

                const host = "127.0.0.1";
                const port = 19842;
                const preprocessedImageCount = parseInt((await sqlPreGet("SELECT COUNT(*) FROM images"))[0]["COUNT(*)"]);

                let preprocessedServer = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
                    let page = 1;
                    let requestPage = new URL(req.url, "https://nothing.invalid").searchParams.get('page');
                    let out = {
                        images: [], interactions: [], total: preprocessedImageCount
                    }

                    if (requestPage && !isNaN(parseInt(requestPage))) {
                        page = parseInt(requestPage);
                    }

                    let everything = (await sqlPreGet("SELECT * FROM images LIMIT 50 OFFSET " + ((page - 1) * 50))) as IFaunerieUpdaterGeneric[];
                    out.images = everything.map(i => JSON.parse(atob(i['json'])));

                    res.writeHead(200);
                    res.end(JSON.stringify(out));
                });

                preprocessedServer.listen(port, host, () => {
                    // noinspection HttpUrlsUsage
                    console.log(`Server is running on http://${host}:${port}`);
                });

                let updateTags = ((await sqlTagGet("SELECT * FROM tags")) as IFaunerieUpdaterGeneric[]).map(i => JSON.parse(atob(i['json'])));
                let index = 0;

                for (let i = 0; i < updateTags.length; i += 50) {
                    const chunk = updateTags.slice(i, i + 50);

                    let aliases = [];
                    let implications = [];

                    for (let tag of chunk) {
                        // noinspection ES6MissingAwait
                        aliases.push(sqlstr(await sqlTagGet(`SELECT target FROM aliases WHERE source = ` + tag['id'])[0]?.target ?? null));
                        implications.push(sqlstr("," + (await sqlTagGet(`SELECT target FROM implications WHERE source = ` + tag['id']) as IFaunerieUpdaterGeneric[]).map(i => i['target']).join(",") + ","));
                    }

                    await sqlQuery(`INSERT INTO tags(id, name, alias, implications, category, description, description_short, slug) VALUES ${chunk.map((tag, index) => `(${tag['id']}, ${sqlstr(tag['name'])}, ${aliases[index]}, ${implications[index]}, ${sqlstr(tag['category'])}, ${sqlstr(tag['description'])}, ${sqlstr(tag['short_description'])}, ${sqlstr(tag['slug'])})`).join(",")}`);
                    index += 50;

                    statusUpdateHandler([{
                        title: "Preparing update... " + Math.round((index / updateTags.length) * 100) + "%",
                        progress: ((index / updateTags.length) * 100),
                        indeterminate: false
                    }]);
                }

                statusUpdateHandler([{
                    title: "Preparing update...", progress: 0, indeterminate: false
                }]);

                global.statusInfo = [];

                function prettySize(s: number) {
                    if (s < 1024) {
                        return s.toFixed(0) + " B";
                    } else if (s < 1024 ** 2) {
                        return (s / 1024).toFixed(0) + " KiB";
                    } else if (s < 1024 ** 3) {
                        return (s / 1024 ** 2).toFixed(1) + " MiB";
                    } else if (s < 1024 ** 4) {
                        return (s / 1024 ** 3).toFixed(2) + " GiB";
                    } else {
                        return (s / 1024 ** 4).toFixed(2) + " TiB";
                    }
                }

                function doImageFileDownload(url: string, image: object) {
                    global.statusInfo[2] = {
                        title: "Image: " + image['id'], progress: 0, indeterminate: false
                    }

                    statusUpdateHandler(global.statusInfo);

                    const axios = require('axios');

                    return new Promise(async (res) => {
                        // noinspection JSUnusedGlobalSymbols
                        const response = await axios({
                            url,
                            validateStatus: (s: number) => (s >= 200 && s < 300) || (s === 404 || s === 403 || s === 401),
                            method: 'GET',
                            responseType: 'arraybuffer',
                            onDownloadProgress: (event: IFaunerieUpdaterGeneric) => {
                                global.statusInfo[2] = {
                                    title: "Image: " + image['id'] + " (" + Math.round((event['loaded'] / event['total']) * 100) + "%)",
                                    progress: ((event['loaded'] / event['total']) * 100),
                                    indeterminate: false
                                }

                                statusUpdateHandler(global.statusInfo);
                            }
                        } as object);

                        global.statusInfo[2] = null;
                        res(response.data);
                    });
                }

                global.doneFetching = false;

                if (!fs.existsSync("./thumbnails")) fs.mkdirSync("./thumbnails");
                if (!fs.existsSync("./images")) fs.mkdirSync("./images");

                let total1: number;
                let pages1: number;
                let types = [];

                async function doRequest() {
                    try {
                        return (await (await fetch("http://127.0.0.1:19842")).json())['total'];
                    } catch (e) {
                        console.error(e);
                        return doRequest();
                    }
                }

                total1 = await doRequest();
                pages1 = Math.ceil(total1 / 50);

                types.push({
                    query: "my:faves", name: "faved", pages: pages1, total: total1
                });

                let prelists = {};
                global.totalPrelist = [];
                global.totalPrelistFull = [];
                global.times = [];
                global.times2 = [];
                global.totalPages = types.map(i => i['pages']).reduce((a, b) => a + b);
                global.totalImages = types.map(i => i['total']).reduce((a, b) => a + b);
                global.totalPageNumber = 0;
                global.images = 0;
                global.updateCategories = {};

                console.log(global.totalImages + " images to download from sources, part of " + global.totalPages + " pages");

                for (let type of types) {
                    let prelist = [];
                    let pages = type.pages;

                    for (let pageNumber = 1; pageNumber <= pages; pageNumber++) {
                        if (global.doneFetching || !preprocessedServer) break;

                        let start = new Date().getTime();
                        let tryFetch = true;
                        let page: object = {};

                        while (tryFetch) {
                            try {
                                page = await (await fetch("http://127.0.0.1:19842/?page=" + pageNumber)).json();

                                page['images'] = page['images'].map((image: object) => {
                                    if (image['representations']['thumb'].endsWith(".mp4") || image['representations']['thumb'].endsWith(".webm")) {
                                        image['representations']['thumb'] = image['representations']['thumb'].substring(0, image['representations']['thumb'].length - path.extname(image['representations']['thumb']).length) + ".gif";
                                    }

                                    return image;
                                });

                                tryFetch = false;
                            } catch (e) {
                                console.error(e);
                            }
                        }

                        await addToDB(page['images']);

                        for (let image of page['images']) {
                            if (!global.updateCategories[image.id]) global.updateCategories[image.id] = {
                                upvotes: false, downvotes: false, watched: false, faved: false, uploads: false
                            }

                            global.updateCategories[image.id][type.name] = true;
                        }

                        prelist.push(...page['images']);
                        global.totalPrelist.push(...page['images']);
                        global.totalPrelistFull.push(...page['images']);
                        global.times.push(new Date().getTime() - start);

                        let fetchEta = (global.totalPages - global.totalPageNumber) * (global.times.reduce((a: number, b: number) => a + b, 0) / global.times.length);

                        if (global.totalPageNumber === global.totalPages) {
                            global.doneFetching = true;
                        }

                        global.statusInfo[0] = {
                            title: "Fetching: " + Math.round((global.totalPageNumber / global.totalPages) * 100) + "% (" + global.totalPageNumber + "/" + global.totalPages + ") complete" + (global.times.length > 10 ? ", " + timeToString(fetchEta) : "") + " (" + global.totalPrelistFull.length + ")",
                            progress: ((global.totalPageNumber / global.totalPages) * 100),
                            indeterminate: false
                        }

                        statusUpdateHandler(global.statusInfo);
                        global.totalPageNumber++;
                    }

                    prelists[type.name] = prelist;
                }

                global.doneFetching = true;
                global.totalFetchingSize = global.totalPrelistFull.map((i: object) => i['size']).reduce((a: number, b: number) => a + b);

                try {
                    preprocessedServer.closeAllConnections();
                    preprocessedServer.close();
                    preprocessedServer = null;
                } catch (e) {
                    console.error(e);
                }

                while (global.totalPrelist.length > 0) {
                    let image = global.totalPrelist.shift();
                    global.lastImage = image;
                    let start = new Date().getTime();
                    let downloaded = false;

                    let path1 = (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1);
                    let path2 = (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2);
                    let path3 = (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3);

                    if (!fs.existsSync("./images/" + path1)) fs.mkdirSync("./images/" + path1);
                    if (!fs.existsSync("./images/" + path1 + "/" + path2)) fs.mkdirSync("./images/" + path1 + "/" + path2);
                    if (!fs.existsSync("./images/" + path1 + "/" + path2 + "/" + path3)) fs.mkdirSync("./images/" + path1 + "/" + path2 + "/" + path3);
                    if (!fs.existsSync("./thumbnails/" + path1)) fs.mkdirSync("./thumbnails/" + path1);
                    if (!fs.existsSync("./thumbnails/" + path1 + "/" + path2)) fs.mkdirSync("./thumbnails/" + path1 + "/" + path2);
                    if (!fs.existsSync("./thumbnails/" + path1 + "/" + path2 + "/" + path3)) fs.mkdirSync("./thumbnails/" + path1 + "/" + path2 + "/" + path3);

                    let fileName = path1 + "/" + path2 + "/" + path3 + "/" + image['id'] + ".bin";
                    let fileName2 = path1 + "/" + path2 + "/" + path3 + "/" + image['id'] + ".bin";

                    let fileNamePre = path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + ".bin";
                    let fileNamePre2 = path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + ".bin";

                    if (!fs.existsSync("./images/" + fileName) || !fs.existsSync("./thumbnails/" + fileName2)) {
                        if (fs.existsSync("./images/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + path.extname(image['view_url']))) fs.unlinkSync("./images/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + path.extname(image['view_url']));
                        if (fs.existsSync("./thumbnails/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + path.extname(image['representations']['thumb']))) fs.unlinkSync("./thumbnails/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + path.extname(image['representations']['thumb']));
                        if (fs.existsSync("./images/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + ".bin")) fs.unlinkSync("./images/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + ".bin");
                        if (fs.existsSync("./thumbnails/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + ".bin")) fs.unlinkSync("./thumbnails/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + ".bin");
                        if (fs.existsSync("./images/" + path1 + "/" + path2 + "/." + image['id'] + path.extname(image['view_url']))) fs.unlinkSync("./images/" + path1 + "/" + path2 + "/" + path3 + "/." + image['id'] + path.extname(image['view_url']));
                        if (fs.existsSync("./thumbnails/" + path1 + "/" + path2 + "/." + image['id'] + path.extname(image['representations']['thumb']))) fs.unlinkSync("./thumbnails/" + path1 + "/" + path2 + "/." + image['id'] + path.extname(image['representations']['thumb']));
                        if (fs.existsSync("./images/" + path1 + "/" + path2 + "/." + image['id'] + ".bin")) fs.unlinkSync("./images/" + path1 + "/" + path2 + "/." + image['id'] + ".bin");
                        if (fs.existsSync("./thumbnails/" + path1 + "/" + path2 + "/." + image['id'] + ".bin")) fs.unlinkSync("./thumbnails/" + path1 + "/" + path2 + "/." + image['id'] + ".bin");

                        let tryFetch = true;

                        while (tryFetch) {
                            try {
                                fs.writeFileSync("./images/" + fileNamePre, protectedEncode(await doImageFileDownload(image['view_url'], image)));
                                tryFetch = false;
                            } catch (e) {
                                console.error(e);
                                await sleep(1500);
                            }
                        }

                        tryFetch = true;

                        while (tryFetch) {
                            try {
                                fs.writeFileSync("./thumbnails/" + fileNamePre2, protectedEncode(await doImageFileDownload(image['representations']['thumb'], image)));
                                tryFetch = false;
                            } catch (e) {
                                console.error(e);
                                await sleep(1500);
                            }
                        }

                        fs.renameSync("./thumbnails/" + fileNamePre2, "./thumbnails/" + fileName2);
                        fs.renameSync("./images/" + fileNamePre, "./images/" + fileName);
                        downloaded = true;
                    }

                    if (downloaded) global.times2.push([new Date().getTime() - start, image['size']]);
                    global.totalPrelist.shift();
                    global.images++;

                    let eta = (global.totalImages - global.times2.length) * (global.times2.map((i: number[]) => i[0]).reduce((a: number, b: number) => a + b, 0) / global.times2.length);
                    let times = global.times2.map((i: number[]) => i[0] / i[1]).slice(0, 20);
                    let averageBps = times.length > 0 ? (times.reduce((a: number, b: number) => a + b) / times.length) : 0;
                    let dataLeft = global.totalFetchingSize - global.times2.map((i: number[]) => i[1]).reduce((a: number, b: number) => a + b, 0);
                    eta = dataLeft * averageBps;

                    let title = "Downloading: " + Math.round((global.images / global.totalImages) * 100) + "% (" + global.images + "/" + global.totalImages + ", " + prettySize(global.times2.map((i: number[]) => i[1]).reduce((a: number, b: number) => a + b, 0)) + (global.totalFetchingSize ? "/" + prettySize(global.totalFetchingSize) : "") + ") complete" + (global.times2.length > 10 && eta > 1000 ? ", " + timeToString(eta) : "");

                    global.statusInfo[0] = {
                        title, progress: ((global.images / global.totalImages) * 100), indeterminate: false
                    }

                    statusUpdateHandler(global.statusInfo);
                }

                await consolidateDB();
            }

            update().then(_ => {});
        });
    }
}
