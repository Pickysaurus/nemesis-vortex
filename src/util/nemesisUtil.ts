import * as path from 'path';
import { fs, log, types } from 'vortex-api';
import { NemesisModInfo, NemesisConfigData, NemesisLoadOrderInfo } from '../types/types';

const oldExeName = 'Nemesis Unlimited Behavior Engine.exe';
const exeName = 'Nemesis-Engine.exe';

async function getNemesisPaths(gamePath: string, mods: { [key: string]: types.IMod }): Promise<NemesisConfigData> {
    const nemesisFolder: string = path.join(gamePath, 'data', 'Nemesis_Engine');
    // Get the legacy EXE file
    const oldNemesisExe: string = path.join(nemesisFolder, oldExeName);
    // Get the actual EXE
    const nemesisExe: string = path.join(nemesisFolder, exeName);
    // The cache folder
    const cacheFolder: string = path.join(nemesisFolder, 'cache');
    // The mods folder
    const modsPath: string = path.join(nemesisFolder, 'mod')
    // For whatever reason, the Nemesis version is stored in a plain text file in the same folder as the EXE.
    const nemesisVerFile: string = path.join(nemesisFolder, 'version');

    // Check the EXE exists
    let appPath: string;
    try {
        await fs.statAsync(nemesisExe);
        appPath = nemesisExe
    }
    catch(err) {
        try {
            await fs.statAsync(oldNemesisExe);
            appPath = oldNemesisExe;
        }
        catch(innerErr) {
            log('warn', 'Nemesis EXE file could not be located.', { exeName: err, oldExeName: innerErr });
            throw new Error('Nemesis executable file not found.');
        }
    }

    // Get deployment manifest and installed mod (if applicable)
    const manifestPath: string = path.join(gamePath, 'data', 'vortex.deployment.json');
    let mod: types.IMod;
    try {
        const manifestData = await fs.readFileAsync(manifestPath, { encoding: 'utf8' });
        const manifest = JSON.parse(manifestData);
        const nemesisEntry: types.IDeployedFile = manifest.files.find(df => df.relPath.toLowerCase() === `Nemesis_Engine\\${path.basename(appPath)}`.toLowerCase());
        if (nemesisEntry) {
            mod = mods[nemesisEntry.source];
        }
    }
    catch(err) {
        //nop
    }

    // Make sure the cache folder exists
    let cachePath;
    try {
        await fs.ensureDirWritableAsync(cacheFolder);
        cachePath = cacheFolder;
    }
    catch (err) {
        log('warn', 'Nemesis cache path is not available', { path: cachePath, err });
        throw new Error('Nemesis cache folder is unavailable')
    }

    const active: NemesisLoadOrderInfo[] = await getActiveMods(cachePath).catch(() => []);
    const order: string[] = await getOrderList(cachePath).catch(() => []);

    // Get the app version from the version file
    const version: string = await fs.readFileAsync(nemesisVerFile, { encoding: 'utf8' }).catch(() => undefined) || '0.0.0';

    return new NemesisConfigData({
        mod,
        appPath,
        cachePath,
        modsPath,
        version,
        cache: { order, active }
    });
}

async function getAvailableMods(modDir: string): Promise<NemesisModInfo[]> {
    // Scan the "Mod" folder and return info from each.
    const dirScan: string[] = await fs.readdirAsync(modDir).catch(() => Promise.reject(new Error(`Cannot read the Nemesis mod folder: ${modDir}`)));
    const modFolders: string[] = dirScan.filter(p => fs.statAsync(path.join(modDir, p)).then((stat) => stat.isDirectory()).catch(() => false));
    const modInfo: NemesisModInfo[] = await Promise.all(modFolders.map(async mod => {
        const iniPath = path.join(modDir, mod, 'info.ini');
        await fs.statAsync(iniPath).catch(() => {
            log('warn', `info.ini could not be resolved in ${mod}`);
            return Promise.resolve(undefined);
        });
        const iniData = await fs.readFileAsync(iniPath, { encoding: 'utf8' }).catch(() => { Promise.resolve(undefined) });
        if (!iniData) return Promise.resolve(undefined);
        return modIniToObject(iniData, mod);
    }));

    return modInfo.filter(i => i !== undefined);
}

function modIniToObject(data: string, id: string): NemesisModInfo {

    const getRowData = (rows: string[], key: string):string|undefined => {
        const row = rows.find(r => r.toLowerCase().startsWith(key.toLowerCase()));
        if (!row) return undefined;
        const value = row.split('=')[1].trim();
        // Special Exception for the auto key, as a string of null is undefined. 
        if (key === 'auto' && value == 'null') return undefined;
        return value;
    }

    // Rather than messing about with an INI parser, we'll just do this manually.
    const rows = data.split(/\n/g);
    try {
        return new NemesisModInfo({
            name: getRowData(rows, 'name'),
            author: getRowData(rows, 'author'),
            site: getRowData(rows, 'site'),
            auto: getRowData(rows, 'auto'),
            hidden: getRowData(rows, 'hidden'),
            id
        });
    }
    catch(err) {
        log('warn', 'Error parsing INI for Nemesis mod', err);
        return undefined;
    }
}

async function getOrderList(cachePath: string): Promise<string[]> {
    const loadOrderPath = path.join(cachePath, 'order list');

    try {
        const data = await fs.readFileAsync(loadOrderPath, { encoding: 'utf8' });
        return data.split(/\r\n/g).filter((entry: string) => entry !== '');
        
    }
    catch(err) {
        log('warn', 'Nemesis order list file could not be read.', err.message);
        return [];
    }
}

async function getActiveMods(cachePath: string): Promise<NemesisLoadOrderInfo[]> {
    const activeModsPath = path.join(cachePath, 'mod settings');

    try {
        const data = await fs.readFileAsync(activeModsPath, { encoding: 'utf8' });
        const activeMods = data.split(/\r\n/g).filter(entry => entry !== '').map(mod => {
            const details = mod.split('(');
            return {
                name: details[0].trim(),
                url: details[1].substr(0, details[1].indexOf(')')).trim()
            }
        });
        // return with duplicates filtered out.
        return activeMods;
    }
    catch(err) {
        log('warn', 'Nemesis mod settings file could not be read', err.message);
        return [];
    }
}

function buildLoadOrder(mods: NemesisModInfo[], active: NemesisLoadOrderInfo[], order: string[]): NemesisModInfo[] {
    // See which mods are currently active.
    const activeMods = mods.map(mod => {
        mod.enabled = !!active.find(a => a.name === mod.name);
        return mod;
    });
    // Filter out the mods that don't have an order position.
    const orderlessMods = activeMods.filter(mod => !order.includes(mod.id));
    // Map mods by their order position, filter out the blanks and add on the orderless mods
    let loadOrder = order.map(id => activeMods.find(mod => mod.id === id)).filter(m => m !== undefined).concat(orderlessMods);

    return [... new Set(loadOrder)];
}

async function detectModsToEnable(gamePath: string, loadOrder: NemesisModInfo[]): Promise<NemesisModInfo[]> {
    const dataFolder = path.join(gamePath, 'Data');
    for(let mod of loadOrder) {
        if (!mod.auto) continue;
        try {
            const checkPath = path.join(dataFolder, mod.auto);
            await fs.statAsync(checkPath);
            mod.enabled = true;
        }
        catch {
            mod.enabled = false;
        }
    }
    
    return loadOrder;

}

async function updateNemesisEngine(appPath: string, stagingPath?: string) {
    // Run the exe with the argument -update
}

async function runNemesis(appPath: string, outputPath: string, loadIds: string[]) {
    // Run the exe with the arguments -generate followed by the loadIds in priority order and -stage followed by the output folder
}

export { getNemesisPaths, getAvailableMods, buildLoadOrder, detectModsToEnable, updateNemesisEngine, runNemesis };