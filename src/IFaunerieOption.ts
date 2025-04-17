export interface IFaunerieOption {
    database: string,
    sqlitePath?: string,
    cachePath?: string,
    readOnly: boolean,
    sensitiveImageProtocol?: boolean,
    verbose?: boolean
}
