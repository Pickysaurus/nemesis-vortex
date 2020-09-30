import * as path from 'path';
import { fs, types } from "vortex-api";

class NemesisModInfo {
    // Folder name, treated as an index by Nemesis
    public id: string;
    // Animation Mod details
    public name: string;
    public author: string;
    public site: string;
    // Auto is supposed to mean "automatically enable this if the file is present in data"
    public auto: string | undefined; 
    // Hide from list?
    public hidden: boolean;
    // Is this mod enabled
    public enabled: boolean;

    constructor({id, name, author, site, auto, hidden }) {
        this.id = id;
        this.name = name;
        this.author = author;
        this.site = site;
        this.auto = auto;
        this.hidden = (hidden == 'true');
    }
}

interface NemesisLoadOrderInfo {
    name: string;
    url: string;
}

class NemesisConfigData {
    private cache: { order: string[], active: NemesisLoadOrderInfo[]};
    public appPath: string;
    public cachePath: string;
    public modsPath: string;
    public version: string;
    public mod: types.IMod | undefined;

    constructor({ mod, appPath, cachePath, modsPath, version, cache }) {
        this.mod = mod;
        this.appPath = appPath;
        this.cachePath = cachePath;
        this.modsPath = modsPath;
        this.version = version;
        this.cache = cache;
    }

    public getOrder(): string[] {
        return this.cache.order;
    }

    public getActive(): NemesisLoadOrderInfo[] {
        return this.cache.active;
    }

    public async updateOrderCache(newOrder: string[]): Promise<void> {
        const order: string = newOrder.join('\r\n');
        try {
            fs.writeFileAsync(path.join(this.cachePath, 'order list'), order, { encoding: 'utf8' });
            this.cache.order = [...new Set(newOrder)];
        }
        catch(err) {
            return Promise.reject(new Error(`Unable to update Nemesis order cache: ${err.message}`));
        }
    }

    public async updateActiveMods(active: NemesisModInfo[]): Promise<void> {
        const activeList = active.map(mod => `${mod.name} (${mod.site})`).join('\r\n');
        try {
            fs.writeFileAsync(path.join(this.cachePath, 'mod settings'), activeList, { encoding: 'utf8' });
            this.cache.active = active.map(mod => {return { name: mod.name, url: mod.site }});
        }
        catch(err) {
            return Promise.reject(new Error(`Unable to update Nemesis order cache: ${err.message}`));
        }
    }
}

export { NemesisModInfo, NemesisConfigData, NemesisLoadOrderInfo };