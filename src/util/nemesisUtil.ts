import * as path from 'path';
import { fs, log } from 'vortex-api';
import { NemesisModInfo, NemesisConfigData, NemesisLoadOrderInfo } from '../types/types';

const oldExeName = 'Nemesis Unlimited Behavior Engine.exe';
const exeName = 'Nemesis-Engine.exe';

async function getNemesisPaths(gamePath: string): Promise<NemesisConfigData> {
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
    const appPath: string = await fs.statAsync(nemesisExe)
        .then(() => nemesisExe)
        .catch(() => {
            // Check for the older EXE fle.
            return fs.statAsync(oldNemesisExe)
            .then(() => oldNemesisExe)
            .catch(() => Promise.reject(new Error('Nemesis executable file not found.')));
        });

    // Make sure the cache folder exists
    const cachePath: string = await fs.ensureDirWritableAsync(cacheFolder)
        .then(() => cacheFolder)
        .catch(() => Promise.reject(new Error('Nemesis cache folder is unavailable')));

    const active: NemesisLoadOrderInfo[] = await getActiveMods(cachePath).catch(() => []);
    const order: string[] = await getOrderList(cachePath).catch(() => []);

    // Get the app version from the version file
    const version: string = await fs.readFileAsync(nemesisVerFile, { encoding: 'utf8' }).catch(() => undefined) || '0.0.0';

    return new NemesisConfigData({
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

function modIniToObject(data: string, idx: string): NemesisModInfo {

    const getRowData = (rows: string[], key: string):string|undefined => {
        const row = rows.find(r => r.toLowerCase().startsWith(key.toLowerCase()));
        if (!row) return undefined;
        const value = row.split('=')[1].trim();
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
            idx
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
        return data.split(/\r\n/g).filter(entry => entry !== '');
        
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
        return activeMods;
    }
    catch(err) {
        log('warn', 'Nemesis mod settings file could not be read', err.message);
        return [];
    }
}

async function updateNemesisEngine(appPath: string, stagingPath?: string) {
    // Run the exe with the argument -update
}

async function runNemesis(appPath: string, outputPath: string, loadIds: string[]) {
    // Run the exe with the arguments -generate followed by the loadIds in priority order and -stage followed by the output folder
}

export { getNemesisPaths, getAvailableMods };