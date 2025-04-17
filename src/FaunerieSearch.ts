import {SearchError} from "./SearchError";
import {FaunerieFrontend} from "./FaunerieFrontend";

export interface IFaunerieSearchToken {
    type: FaunerieSearchTokenType,
    data?: string
}

export enum FaunerieSearchTokenType {
    Subquery,
    Not,
    And,
    Or,
    Query
}

export class FaunerieSearch {
    private readonly frontend: FaunerieFrontend;

    constructor(frontend: FaunerieFrontend) {
        this.frontend = frontend;
    }

    fillDate(str: string) {
        return str.trim() + new Date(0).toISOString().substring(str.trim().length)
    }

    checkQuery(query: string, allowUnknownTags: boolean) {
        let frontend = this.frontend;
        let sql = "";
        query = query.trim();

        if (query === "") return "";

        if (query.includes("~")) throw new SearchError("Unsupported '~' (fuzzy search) operator");
        if (query.includes("\\")) throw new SearchError("Unsupported '\\' (escape) operator");
        if (query.includes("^")) throw new SearchError("Unsupported '^' (boosting) operator");
        if (query.includes("\"")) throw new SearchError("Unsupported '\"' (quotation) operator");

        let namespace = null;
        let quantifier = null;
        let value = query.split(":")[0];

        if (query.includes(":")) {
            namespace = query.split(":")[0].split(".")[0].toLowerCase();
            value = query.split(":")[1];

            if (query.split(":")[0].includes(".")) {
                quantifier = query.split(":")[0].split(".")[1].toLowerCase();
            }
        }

        if (quantifier) {
            if (!["lt", "lte", "gt", "gte"].includes(quantifier)) throw new SearchError("Unrecognized numeric qualifier '" + quantifier + "'");
        }

        let number: number;

        switch (namespace) {
            case "created_at":
                let date = new Date(this.fillDate(value));
                if (isNaN(date.getTime())) throw new SearchError("Invalid date/time value for 'created_at'");
                number = date.getTime();

                if (isNaN(number) || !isFinite(number)) throw new Error("Number from getDate is NaN but shouldn't be");

                switch (quantifier) {
                    case "lt":
                        sql = "images.created_at<" + number;
                        break;
                    case "lte":
                        sql = "images.created_at<=" + number;
                        break;
                    case "gt":
                        sql = "images.created_at>" + number;
                        break;
                    case "gte":
                        sql = "images.created_at>=" + number;
                        break;
                    default:
                        sql = "images.created_at=" + number;
                        break;
                }

                break;

            case "my":
                if (value === "hidden") throw new SearchError("Unsupported value for 'my': 'hidden'");
                if (value !== "upvotes" && value !== "downvotes" && value !== "faves" && value !== "uploads" && value !== "watched") throw new SearchError("Invalid value for 'my'");
                if (quantifier) throw new SearchError("'my' does not accept a numeric qualifier");

                break;

            case "uploader":
                throw new SearchError("Unsupported use of 'uploader'");

            case "faved_by":
                throw new SearchError("Unsupported use of 'faved_by'");

            case "aspect_ratio":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'aspect_ratio'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.aspect_ratio<" + number;
                        break;
                    case "lte":
                        sql = "images.aspect_ratio<=" + number;
                        break;
                    case "gt":
                        sql = "images.aspect_ratio>" + number;
                        break;
                    case "gte":
                        sql = "images.aspect_ratio>=" + number;
                        break;
                    default:
                        sql = "images.aspect_ratio=" + number;
                        break;
                }

                break;

            case "comment_count":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'comment_count'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.comment_count<" + number;
                        break;
                    case "lte":
                        sql = "images.comment_count<=" + number;
                        break;
                    case "gt":
                        sql = "images.comment_count>" + number;
                        break;
                    case "gte":
                        sql = "images.comment_count>=" + number;
                        break;
                    default:
                        sql = "images.comment_count=" + number;
                        break;
                }

                break;

            case "downvotes":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'downvotes'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.downvotes<" + number;
                        break;
                    case "lte":
                        sql = "images.downvotes<=" + number;
                        break;
                    case "gt":
                        sql = "images.downvotes>" + number;
                        break;
                    case "gte":
                        sql = "images.downvotes>=" + number;
                        break;
                    default:
                        sql = "images.downvotes=" + number;
                        break;
                }

                break;

            case "faves":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'faves'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.faves<" + number;
                        break;
                    case "lte":
                        sql = "images.faves<=" + number;
                        break;
                    case "gt":
                        sql = "images.faves>" + number;
                        break;
                    case "gte":
                        sql = "images.faves>=" + number;
                        break;
                    default:
                        sql = "images.faves=" + number;
                        break;
                }

                break;

            case "height":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'height'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.height<" + number;
                        break;
                    case "lte":
                        sql = "images.height<=" + number;
                        break;
                    case "gt":
                        sql = "images.height>" + number;
                        break;
                    case "gte":
                        sql = "images.height>=" + number;
                        break;
                    default:
                        sql = "images.height=" + number;
                        break;
                }

                break;

            case "id":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'id'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.source_id<" + number;
                        break;
                    case "lte":
                        sql = "images.source_id<=" + number;
                        break;
                    case "gt":
                        sql = "images.source_id>" + number;
                        break;
                    case "gte":
                        sql = "images.source_id>=" + number;
                        break;
                    default:
                        sql = "images.source_id=" + number;
                        break;
                }

                break;

            case "score":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'score'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.score<" + number;
                        break;
                    case "lte":
                        sql = "images.score<=" + number;
                        break;
                    case "gt":
                        sql = "images.score>" + number;
                        break;
                    case "gte":
                        sql = "images.score>=" + number;
                        break;
                    default:
                        sql = "images.score=" + number;
                        break;
                }

                break;

            case "tag_count":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'tag_count'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.tag_count<" + number;
                        break;
                    case "lte":
                        sql = "images.tag_count<=" + number;
                        break;
                    case "gt":
                        sql = "images.tag_count>" + number;
                        break;
                    case "gte":
                        sql = "images.tag_count>=" + number;
                        break;
                    default:
                        sql = "images.tag_count=" + number;
                        break;
                }

                break;

            case "upvotes":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'upvotes'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.upvotes<" + number;
                        break;
                    case "lte":
                        sql = "images.upvotes<=" + number;
                        break;
                    case "gt":
                        sql = "images.upvotes>" + number;
                        break;
                    case "gte":
                        sql = "images.upvotes>=" + number;
                        break;
                    default:
                        sql = "images.upvotes=" + number;
                        break;
                }

                break;

            case "width":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'width'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.width<" + number;
                        break;
                    case "lte":
                        sql = "images.width<=" + number;
                        break;
                    case "gt":
                        sql = "images.width>" + number;
                        break;
                    case "gte":
                        sql = "images.width>=" + number;
                        break;
                    default:
                        sql = "images.width=" + number;
                        break;
                }

                break;

            case "wilson_score":
                number = parseFloat(value);
                if (isNaN(number) || !isFinite(number)) throw new SearchError("Invalid numeric value for 'wilson_score'");

                switch (quantifier) {
                    case "lt":
                        sql = "images.wilson_score<" + number;
                        break;
                    case "lte":
                        sql = "images.wilson_score<=" + number;
                        break;
                    case "gt":
                        sql = "images.wilson_score>" + number;
                        break;
                    case "gte":
                        sql = "images.wilson_score>=" + number;
                        break;
                    default:
                        sql = "images.wilson_score=" + number;
                        break;
                }

                break;

            case "sha512_hash":
                if (quantifier) throw new SearchError("'sha512_hash' does not accept a numeric qualifier");
                sql = "images.sha512_hash LIKE '" + value.replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll("*", "%") + "'";
                break;

            case "orig_sha512_hash":
                if (quantifier) throw new SearchError("'orig_sha512_hash' does not accept a numeric qualifier");
                sql = "images.orig_sha512_hash LIKE '" + value.replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll("*", "%") + "'";
                break;

            case "source_url":
                if (quantifier) throw new SearchError("'source_url' does not accept a numeric qualifier");
                sql = "images.source_url LIKE '" + value.replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll("*", "%") + "'";
                break;

            case "source":
                if (quantifier) throw new SearchError("'source' does not accept a numeric qualifier");
                sql = "images.source_name LIKE '" + value.replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll("*", "%") + "'";
                break;

            case "description":
                if (quantifier) throw new SearchError("'description' does not accept a numeric qualifier");
                sql = "images.description LIKE '" + value.replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll("*", "%") + "'";
                break;

            case "mime_type":
                if (quantifier) throw new SearchError("'mime_type' does not accept a numeric qualifier");
                sql = "images.mime_type LIKE '" + value.replaceAll("'", "''").replaceAll("%", "\\%").replaceAll("_", "\\_").replaceAll("*", "%") + "'";
                break;

            default:
                value = query.trim();
                let tags = frontend.tags;
                let regex = new RegExp('^' + value.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\?/g, '.').replace(/\*/g, '.*') + '$');
                let matching = tags.filter(item => regex.test(item[1]));

                if (matching.length > 0) {
                    for (let tag of matching) {
                        sql += " OR image_tags.tags LIKE '%," + tag[0] + ",%'";
                    }

                    sql = "(" + sql.substring(4).trim() + ")";
                } else if (allowUnknownTags) {
                    sql = "image_tags.tags LIKE 'INVALID_TAG'";
                } else {
                    throw new SearchError("No tags matching '" + value.trim() + "' could be found");
                }

                break;
        }

        return sql;
    }

    buildQueryInner(query: string, allowUnknownTags: boolean = false) {
        query = query.trim();
        let pos = 0;

        let inParentheses = false;
        let currentParenthesesInner: string = "";
        let tokens: IFaunerieSearchToken[] = [];
        let currentTag = "";
        let subParentheses = 0;

        while (pos < query.length) {
            if (inParentheses) {
                if (query[pos] === "(") subParentheses++;
                if (query[pos] === ")") subParentheses--;

                if (subParentheses < 0) {
                    inParentheses = false;
                    tokens.push({
                        type: FaunerieSearchTokenType.Subquery,
                        data: this.buildQueryInner(currentParenthesesInner, allowUnknownTags)
                    });
                    currentParenthesesInner = null;
                    subParentheses = 0;
                    pos++;
                    continue;
                }

                currentParenthesesInner += query[pos];
                pos++;
            } else {
                switch (query[pos]) {
                    case "!":
                    case "-":
                        if (currentTag.trim().length === 0) {
                            tokens.push({
                                type: FaunerieSearchTokenType.Not,
                                data: null
                            });
                        } else {
                            currentTag += query[pos];
                        }

                        pos++;
                        break;

                    case ",":
                        if (currentTag.trim().length > 0) {
                            tokens.push({
                                type: FaunerieSearchTokenType.Query,
                                data: this.checkQuery(currentTag.trim(), allowUnknownTags)
                            });
                            currentTag = "";
                        }

                        tokens.push({
                            type: FaunerieSearchTokenType.And,
                            data: null
                        });
                        pos++;
                        break;

                    case "&":
                        if (query[pos + 1] === "&") {
                            if (currentTag.trim().length > 0) {
                                tokens.push({
                                    type: FaunerieSearchTokenType.Query,
                                    data: this.checkQuery(currentTag.trim(), allowUnknownTags)
                                });
                                currentTag = "";
                            }

                            tokens.push({
                                type: FaunerieSearchTokenType.And,
                                data: null
                            });
                            pos += 2;
                        } else {
                            currentTag += query[pos];
                            pos++;
                        }

                        break;

                    case "|":
                        if (query[pos + 1] === "|") {
                            if (currentTag.trim().length > 0) {
                                tokens.push({
                                    type: FaunerieSearchTokenType.Query,
                                    data: this.checkQuery(currentTag.trim(), allowUnknownTags)
                                });
                                currentTag = "";
                            }

                            tokens.push({
                                type: FaunerieSearchTokenType.Or,
                                data: null
                            });
                            pos += 2;
                        } else {
                            currentTag += query[pos];
                            pos++;
                        }

                        break;

                    case "O":
                        if (query[pos + 1] === "R") {
                            if (currentTag.trim().length > 0) {
                                tokens.push({
                                    type: FaunerieSearchTokenType.Query,
                                    data: this.checkQuery(currentTag.trim(), allowUnknownTags)
                                });
                                currentTag = "";
                            }

                            tokens.push({
                                type: FaunerieSearchTokenType.Or,
                                data: null
                            });
                            pos += 2;
                        } else {
                            currentTag += query[pos];
                            pos++;
                        }

                        break;

                    case "A":
                        if (query[pos + 1] === "N" && query[pos + 2] === "D") {
                            if (currentTag.trim().length > 0) {
                                tokens.push({
                                    type: FaunerieSearchTokenType.Query,
                                    data: this.checkQuery(currentTag.trim(), allowUnknownTags)
                                });
                                currentTag = "";
                            }

                            tokens.push({
                                type: FaunerieSearchTokenType.And,
                                data: null
                            });
                            pos += 3;
                        } else {
                            currentTag += query[pos];
                            pos++;
                        }

                        break;

                    case "N":
                        if (query[pos + 1] === "O" && query[pos + 2] === "T") {
                            if (currentTag.trim().length > 0) {
                                tokens.push({
                                    type: FaunerieSearchTokenType.Query,
                                    data: this.checkQuery(currentTag.trim(), allowUnknownTags)
                                });
                                currentTag = "";
                            }

                            tokens.push({
                                type: FaunerieSearchTokenType.Not,
                                data: null
                            });
                            pos += 3;
                        } else {
                            currentTag += query[pos];
                            pos++;
                        }

                        break;

                    case " ":
                        currentTag += query[pos];
                        pos++;
                        break;

                    case "(":
                        if (currentTag.trim().length === 0) {
                            inParentheses = true;
                            currentParenthesesInner = "";
                            pos++;
                        } else {
                            currentTag += query[pos];
                            pos++;
                        }

                        break;

                    case ")":
                        if (currentTag.trim().length === 0) {
                            throw new SearchError("Unexpected closing parenthesis.");
                        } else {
                            currentTag += query[pos];
                            pos++;
                        }

                        break;

                    default:
                        currentTag += query[pos];
                        pos++;
                        break;
                }
            }
        }

        if (currentTag.trim().length > 0) {
            tokens.push({
                type: FaunerieSearchTokenType.Query,
                data: this.checkQuery(currentTag.trim(), allowUnknownTags)
            });
        }

        return this.queryTokensToString(tokens);
    }

    queryTokensToString(tokens: IFaunerieSearchToken[]) {
        let str = "";

        for (let token of tokens) {
            switch (token.type) {
                case FaunerieSearchTokenType.And:
                    str += "AND";
                    break;

                case FaunerieSearchTokenType.Query:
                    str += token.data;
                    break;

                case FaunerieSearchTokenType.Subquery:
                    str += "(" + token.data + ")";
                    break;

                case FaunerieSearchTokenType.Not:
                    str += "NOT";
                    break;

                case FaunerieSearchTokenType.Or:
                    str += "OR";
                    break;
            }

            str += " ";
        }

        return str.trim();
    }

    buildQueryV2(query: string, allowUnknownTags: boolean, allowExceedLength: boolean = false) {
        if (query.length >= 1024 && !allowExceedLength) throw new SearchError("A search query needs to be shorter than 1024 characters.");
        query = query.trim();

        query = this.buildQueryInner(query, allowUnknownTags);

        if (query.length > 0) {
            return "(" + query.trim() + ")";
        } else {
            return "TRUE";
        }
    }
}
