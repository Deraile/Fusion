const fs = require("fs-extra");
const decompress = require("decompress");
import * as path from "path";
import got from "got";
import { download, capitalizeFirstLetter } from "./tools";

const macCompatMode = false;

const getJava = async (javaVersion, javaPath, javaTemp, arch) => {
    if (await fs.exists(javaPath)) return;
    let operatingSystem = process.platform + "";
    if (operatingSystem == "win32") {
        operatingSystem = "windows";
    } else if (operatingSystem == "darwin") {
        operatingSystem = "mac";
    }
    if (macCompatMode) {
        arch = "x64";
    }
    const response = await got(
        `https://api.adoptium.net/v3/assets/latest/${javaVersion}/hotspot?image_type=jre&vendor=eclipse&os=${operatingSystem}&architecture=${arch}`,
    );
    const info = JSON.parse(response.body)[0];
    const filename = `jdk-${info.version.semver}-jre`;
    await download(
        info.binary.package.link,
        path.join(javaTemp, `${filename}.zip`),
    );
    await decompress(path.join(javaTemp, `${filename}.zip`), javaTemp).then(
        async (e) => {
            await fs.move(path.join(javaTemp, e[0].path), javaPath);
        },
    );

    await fs.remove(path.join(javaTemp));
};

const getCurseforgeMod = async (mod, version, modsPath, loader) => {
    loader = capitalizeFirstLetter(loader);
    const url = `https://api.curseforge.com/v1/mods/search?gameId=432&gameVersion=${version}&slug=${mod}`;
    const response = await got(url, {
        headers: {
            "x-api-key":
                "$2a$10$rb7JRBpgV5mt33y9zxOcouYDxQFE4jj9xK5bZsKd.uky8LdZTgTuO",
        },
    });
    const mods = JSON.parse(response.body);
    const data = mods["data"][0];
    if (data["slug"] == mod) {
        const latestFiles = data["latestFiles"];
        for (const latestFile in latestFiles) {
            const file = data["latestFiles"][latestFile];
            if (
                file["gameVersions"].includes(loader) &&
                file["gameVersions"].includes(version)
            ) {
                const downloadURL = file["downloadUrl"];
                const name = file["fileName"] || `${mod}-${file["id"]}.jar`;
                const filename = path.join(modsPath, name);
                if (!(await fs.pathExists(filename))) {
                    console.error(
                        `Downloading CringeForge ${version} Mod! *CF`,
                    );
                    console.log(`${mod} <== npm @ (node-curseforge)`);
                    await download(downloadURL, filename);
                    return filename;
                } else {
                    console.error(`File ${filename} already exists! *CF`);
                    return filename;
                }
            }
        }
    }
};

const getModrinthMod = async (mod, version, modsPath, loader) => {
    const url = `https://api.modrinth.com/v2/project/${mod}/version?game_versions=["${version}"]
    &loaders=["${loader}"]`;
    const response = await got(url);
    const results = JSON.parse(response.body);
    for (const result in results) {
        const file = results[result];
        let files = file["files"].filter((x) => x["primary"] == true);
        if (files.length < 1) {
            files = file["files"];
        }
        const downloadURL = files[0]["url"];
        const filename = path.join(modsPath, files[0]["filename"]);
        if (!(await fs.pathExists(filename))) {
            console.error(`Downloading Modrinth ${version} Mod!`);
            console.log(`${mod} <== (${url})`);
            await download(downloadURL, filename);
            return filename;
        } else {
            console.error(`File ${filename} already exists!`);
            return filename;
        }
    }
};

export { getJava, getCurseforgeMod, getModrinthMod };