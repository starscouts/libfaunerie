import {FaunerieSearch} from "./FaunerieSearch";
import {FaunerieImageType} from "./FaunerieImageType";
import fs from "fs";
import zlib from "zlib";
import {FaunerieListType} from "./FaunerieListType";
import {Faunerie} from "../index";
import {SearchError} from "./SearchError";
import {IFaunerieImage} from "./IFaunerieImage";
import {IFaunerieTag} from "./IFaunerieTag";

export class FaunerieFrontend {
    public tags: IFaunerieTag[];
    public tagsHashed: object;
    private readonly backend: Faunerie;
    readonly searchEngine: FaunerieSearch;
    private readonly sensitiveImageProtocol: boolean;

    constructor(backend: Faunerie) {
        this.backend = backend;
        this.sensitiveImageProtocol = backend.sensitiveImageProtocol;
        this.searchEngine = new FaunerieSearch(this);
    }

    async initialize() {
        this.tags = [];
        this.tagsHashed = {};

        for (let entry of await this.backend._sql("SELECT id, name FROM tags")) {
            this.tags.push([entry["id"], entry["name"]]);
            this.tagsHashed[entry["id"]] = entry["name"];
        }
    }

    // noinspection JSUnusedGlobalSymbols
    async search(query: string, allowUnknownTags: boolean = false) {
        try {
            if (query !== "*") {
                let sql = this.searchEngine.buildQueryV2(query, allowUnknownTags);
                return await this.imageListResolver(await this.backend._sql("SELECT * FROM images JOIN image_tags ON images.id=image_tags.image_id JOIN image_intensities ON images.id=image_intensities.image_id JOIN image_representations ON images.id=image_representations.image_id WHERE " + sql));
            } else {
                return await this.getAllImages(FaunerieListType.Array);
            }
        } catch (e) {
            if (e.message.startsWith("SQLITE_ERROR: Expression tree is too large (maximum depth 1000)")) {
                throw new SearchError("This search query leads to an internal query that is too large.");
            } else {
                throw e;
            }
        }
    }

    // noinspection JSUnusedGlobalSymbols
    async getImageFileFromId(id: number, type: FaunerieImageType) {
        let image = (await this.imageListResolver(await this.backend._sql("SELECT * FROM images JOIN image_tags ON images.id=image_tags.image_id JOIN image_intensities ON images.id=image_intensities.image_id JOIN image_representations ON images.id=image_representations.image_id WHERE id=" + id)))[0];
        return this.getImageFile(image, type);
    }

    // noinspection JSUnusedGlobalSymbols
    async getImage(id: number | string): Promise<IFaunerieImage | null> {
        return (await this.imageListResolver(await this.backend._sql("SELECT * FROM images JOIN image_tags ON images.id=image_tags.image_id JOIN image_intensities ON images.id=image_intensities.image_id JOIN image_representations ON images.id=image_representations.image_id WHERE id=" + id)))[0] ?? null;
    }

    // noinspection JSUnusedGlobalSymbols
    async countImages(): Promise<number> {
        return ((await this.imageListResolver(await this.backend._sql("SELECT COUNT(*) FROM images")))[0] ?? {})["COUNT(*)"] ?? 0;
    }

    getImageFile(image: object, type: FaunerieImageType) {
        function getPath(backend: Faunerie) {
            const path = require('path');

            if (type === FaunerieImageType.ViewFile || type === FaunerieImageType.ViewURL) {
                try {
                    let l: fs.PathLike;

                    try {
                        l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + path.extname(image['view_url']);
                        fs.lstatSync(l);
                    } catch (e) {
                        l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + path.extname(image['view_url']);
                        fs.lstatSync(l);
                    }

                    if (type === FaunerieImageType.ViewURL) {
                        return "file://" + encodeURI(l.replaceAll("\\", "/"));
                    } else {
                        return l;
                    }
                } catch (e) {
                    try {
                        let l: fs.PathLike;

                        try {
                            l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + ".mp4";
                            fs.lstatSync(l);
                        } catch (e) {
                            l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + ".mp4";
                            fs.lstatSync(l);
                        }

                        if (type === FaunerieImageType.ViewURL) {
                            return "file://" + encodeURI(l.replaceAll("\\", "/"));
                        } else {
                            return l;
                        }
                    } catch (e) {
                        try {
                            let l: fs.PathLike;

                            try {
                                l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + ".bin";
                                fs.lstatSync(l);
                            } catch (e) {
                                l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + ".bin";
                                fs.lstatSync(l);
                            }

                            if (type === FaunerieImageType.ViewURL) {
                                return "file://" + encodeURI(l.replaceAll("\\", "/"));
                            } else {
                                return l;
                            }
                        } catch (e) {
                            try {
                                let l: fs.PathLike;

                                try {
                                    l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + path.extname(image['representations']['thumb']);
                                    fs.lstatSync(l);
                                } catch (e) {
                                    l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + path.extname(image['representations']['thumb']);
                                    fs.lstatSync(l);
                                }

                                if (type === FaunerieImageType.ViewURL) {
                                    return "file://" + encodeURI(l.replaceAll("\\", "/"));
                                } else {
                                    return l;
                                }
                            } catch (e) {
                                try {
                                    let l: fs.PathLike;

                                    try {
                                        l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + ".bin";
                                        fs.lstatSync(l);
                                    } catch (e) {
                                        l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + ".bin";
                                        fs.lstatSync(l);
                                    }

                                    if (type === FaunerieImageType.ViewURL) {
                                        return "file://" + encodeURI(l.replaceAll("\\", "/"));
                                    } else {
                                        return l;
                                    }
                                } catch (e) {
                                    if (type === FaunerieImageType.ViewFile) {
                                        return null;
                                    } else {
                                        return image['representations']['thumb'];
                                    }
                                }
                            }
                        }
                    }
                }
            } else if (type === FaunerieImageType.ThumbnailFile || type === FaunerieImageType.ThumbnailURL) {
                try {
                    let l: fs.PathLike;

                    try {
                        l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + path.extname(image['representations']['thumb']);
                        fs.lstatSync(l);
                    } catch (e) {
                        l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + path.extname(image['representations']['thumb']);
                        fs.lstatSync(l);
                    }

                    if (type === FaunerieImageType.ThumbnailURL) {
                        return "file://" + encodeURI(l.replaceAll("\\", "/"));
                    } else {
                        return l;
                    }
                } catch (e) {
                    try {
                        let l: fs.PathLike;

                        try {
                            l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + ".bin";
                            fs.lstatSync(l);
                        } catch (e) {
                            l = backend.path + "/thumbnails/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + ".bin";
                            fs.lstatSync(l);
                        }

                        if (type === FaunerieImageType.ThumbnailURL) {
                            return "file://" + encodeURI(l.replaceAll("\\", "/"));
                        } else {
                            return l;
                        }
                    } catch (e) {
                        try {
                            let l: fs.PathLike;

                            try {
                                l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + path.extname(image['view_url']);
                                fs.lstatSync(l);
                            } catch (e) {
                                l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + path.extname(image['view_url']);
                                fs.lstatSync(l);
                            }

                            if (type === FaunerieImageType.ThumbnailURL) {
                                return "file://" + encodeURI(l.replaceAll("\\", "/"));
                            } else {
                                return l;
                            }
                        } catch (e) {
                            try {
                                let l: fs.PathLike;

                                try {
                                    l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + ".mp4";
                                    fs.lstatSync(l);
                                } catch (e) {
                                    l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + ".mp4";
                                    fs.lstatSync(l);
                                }

                                if (type === FaunerieImageType.ThumbnailURL) {
                                    return "file://" + encodeURI(l.replaceAll("\\", "/"));
                                } else {
                                    return l;
                                }
                            } catch (e) {
                                try {
                                    let l: fs.PathLike;

                                    try {
                                        l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 3) + "/" + image['id'] + ".bin";
                                        fs.lstatSync(l);
                                    } catch (e) {
                                        l = backend.path + "/images/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 1) + "/" + (image['sha512_hash'] ?? image['orig_sha512_hash'] ?? "0000000").substring(0, 2) + "/" + image['id'] + ".bin";
                                        fs.lstatSync(l);
                                    }

                                    if (type === FaunerieImageType.ThumbnailURL) {
                                        return "file://" + encodeURI(l.replaceAll("\\", "/"));
                                    } else {
                                        return l;
                                    }
                                } catch (e) {
                                    if (type === FaunerieImageType.ThumbnailFile) {
                                        return null;
                                    } else {
                                        return image['representations']['thumb'];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        let path = getPath(this.backend);

        if (type === FaunerieImageType.ThumbnailURL && path.endsWith(".bin")) {
            if (this.sensitiveImageProtocol) {
                let url = path.replace("file://", "pbip://") + "?mime=" + encodeURIComponent(image['mime_type']);
                if (process.platform === "win32") url = url.replaceAll("\\", "/").replaceAll("pbip://", "pbip:///");
                return url;
            } else {
                return URL.createObjectURL(new Blob([zlib.inflateRawSync(fs.readFileSync(path.replace("file://", ""))).buffer], {type: image['mime_type'].startsWith("video/") ? "image/gif" : image['mime_type']}));
            }
        } else if (type === FaunerieImageType.ViewURL && path.endsWith(".bin")) {
            if (this.sensitiveImageProtocol) {
                let url = path.replace("file://", "pbip://") + "?mime=" + encodeURIComponent(image['mime_type']);
                if (process.platform === "win32") url = url.replaceAll("\\", "/").replaceAll("pbip://", "pbip:///");
                return url;
            } else {
                return URL.createObjectURL(new Blob([zlib.inflateRawSync(fs.readFileSync(path.replace("file://", ""))).buffer], {type: image['mime_type']}));
            }
        } else {
            return path;
        }
    }

    deserialize(str: string) {
        return (str ?? "").replaceAll("\\_", "_").replaceAll("\\%", "%").replaceAll("\\'", "'");
    }

    async imageListResolver(list: [object]) {
        for (let image of list) {
            delete image['image_id'];

            image['name'] = this.deserialize(image['name']);
            image['source_url'] = this.deserialize(image['source_url']);
            if (image['source']) image['source'] = this.deserialize(image['source']);
            image['description'] = this.deserialize(image['description']);
            image['_categories'] = ["faved"];

            image['representations'] = {
                full: this.deserialize(image['full']),
                large: this.deserialize(image['large']),
                medium: this.deserialize(image['medium']),
                small: this.deserialize(image['small']),
                tall: this.deserialize(image['tall']),
                thumb: this.deserialize(image['thumb']),
                thumb_small: this.deserialize(image['thumb_small']),
                thumb_tiny: this.deserialize(image['thumb_tiny']),
            };
            image['view_url'] = this.deserialize(image['view']);
            delete image['view'];
            delete image['thumb_tiny'];
            delete image['thumb_small'];
            delete image['thumb'];
            delete image['tall'];
            delete image['small'];
            delete image['medium'];
            delete image['large'];
            delete image['full'];

            image['intensities'] = {
                ne: image['ne'], nw: image['nw'], se: image['se'], sw: image['sw'],
            };
            delete image['ne'];
            delete image['nw'];
            delete image['se'];
            delete image['sw'];

            image['tag_ids'] = image['tags'] ? image['tags'].substring(1, image['tags'].length - 1).split(",").map((i: string) => parseInt(i)) : [];
            image['tags'] = image['tag_ids'].map((i: number) => this.deserialize(this.tagsHashed[i]));

            image['animated'] = image['animated'] === 1;
            image['hidden_from_users'] = image['hidden_from_users'] === 1;
            image['processed'] = image['processed'] === 1;
            image['spoilered'] = image['spoilered'] === 1;
            image['thumbnails_generated'] = image['thumbnails_generated'] === 1;

            image['source_id'] = image['source_id'];
            image['source_name'] = image['source_name'];
            image['source'] = image['source'];
        }

        return list;
    }

    async getAllImages(type: FaunerieListType = FaunerieListType.Array): Promise<{} | IFaunerieImage[]> {
        let query = "SELECT * FROM images JOIN image_tags ON images.id=image_tags.image_id JOIN image_intensities ON images.id=image_intensities.image_id JOIN image_representations ON images.id=image_representations.image_id";

        if (type === FaunerieListType.Array) {
            return await this.imageListResolver(await this.backend._sql(query));
        } else {
            let _list = await this.imageListResolver(await this.backend._sql(query));
            let list = {};

            for (let image of _list) {
                list[image['id']] = image;
            }

            return list;
        }
    }

    // noinspection JSUnusedGlobalSymbols
    async getImpliedTagIdsFromName(tag: string): Promise<number[]> {
        return (await this.backend._sql("SELECT implications FROM tags WHERE name = " + sqlstr(tag)))[0]["implications"].split(",").filter((i: string) => i.trim() !== "").map((i: string) => parseInt(i));
    }

    // noinspection JSUnusedGlobalSymbols
    async getImpliedTagIdsFromId(tag: number): Promise<number[]> {
        return (await this.backend._sql("SELECT implications FROM tags WHERE id = " + tag))[0]["implications"].split(",").filter((i: string) => i.trim() !== "").map((i: string) => parseInt(i));
    }

    // noinspection JSUnusedGlobalSymbols
    async getImpliedTagNamesFromName(tag: string): Promise<string[]> {
        let r = [];
        let data = (await this.backend._sql("SELECT implications FROM tags WHERE name = " + sqlstr(tag)))[0]["implications"].split(",").filter((i: string) => i.trim() !== "").map((i: string) => parseInt(i));

        for (let id of data) {
            r.push((await this.backend._sql("SELECT name FROM tags WHERE id = " + id))[0]["name"]);
        }

        return r;
    }

    // noinspection JSUnusedGlobalSymbols
    async getImpliedTagNamesFromId(tag: number): Promise<string[]> {
        let r = [];
        let data = (await this.backend._sql("SELECT implications FROM tags WHERE id = " + tag))[0]["implications"].split(",").filter((i: string) => i.trim() !== "").map((i: string) => parseInt(i));

        for (let id of data) {
            r.push((await this.backend._sql("SELECT name FROM tags WHERE id = " + id))[0]["name"]);
        }

        return r;
    }
}

function sqlstr(str?: string) {
    if (str === null) {
        return "NULL";
    } else {
        return "'" + str.replaceAll("'", "''") + "'";
    }
}
