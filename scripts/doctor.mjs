import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import net from "node:net";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

const errors = [];
const warnings = [];

function logOk(message) {
  console.log(`[OK] ${message}`);
}

function logWarn(message) {
  warnings.push(message);
  console.warn(`[WARN] ${message}`);
}

function logError(message) {
  errors.push(message);
  console.error(`[ERROR] ${message}`);
}

function parseVersion(version) {
  const clean = version.replace(/^v/, "");
  const [majorRaw, minorRaw, patchRaw] = clean.split(".");
  const major = Number.parseInt(majorRaw ?? "0", 10);
  const minor = Number.parseInt(minorRaw ?? "0", 10);
  const patch = Number.parseInt(patchRaw ?? "0", 10);
  return { major, minor, patch, raw: clean };
}

function isNodeVersionSupported(version) {
  const { major, minor } = parseVersion(version);
  if (major > 18) return true;
  if (major < 18) return false;
  return minor >= 18;
}

function ensureFile(filePath, description) {
  if (!fs.existsSync(filePath)) {
    logError(`${description} yok: ${path.relative(projectRoot, filePath)}`);
    return;
  }
  logOk(`${description} mevcut`);
}

function checkGitTrackedBuildArtifacts() {
  try {
    const output = execSync("git ls-files", {
      cwd: projectRoot,
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    const tracked = output
      .split(/\r?\n/)
      .filter(Boolean)
      .filter(
        (line) =>
          line.startsWith("node_modules/") ||
          line.startsWith("dist/") ||
          line.startsWith(".tmp-tsc/")
      );

    if (tracked.length === 0) {
      logOk("Git tarafinda node_modules/dist/.tmp-tsc takip edilmiyor");
      return;
    }

    const sample = tracked.slice(0, 5).join(", ");
    logError(
      `Git tarafinda build/artifact dosyalari takip ediliyor (${tracked.length} adet). Ornek: ${sample}`
    );
  } catch {
    logWarn("Git dosya takibi kontrolu atlandi (git komutu calistirilamadi).");
  }
}

function checkOneDrivePath() {
  if (projectRoot.toLowerCase().includes("onedrive")) {
    logWarn(
      "Proje OneDrive altinda. Senkronizasyon/lock nedeniyle npm install veya Vite cache sorunlari cikabilir."
    );
  } else {
    logOk("Proje OneDrive disinda");
  }
}

async function checkPortAvailability(port) {
  await new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.once("error", (err) => {
      if (err && typeof err === "object" && "code" in err && err.code === "EADDRINUSE") {
        logWarn(`Port ${port} dolu. Vite bu portta acilmayabilir.`);
      } else {
        logWarn(`Port ${port} kontrolu basarisiz.`);
      }
      resolve();
    });
    server.once("listening", () => {
      server.close(() => {
        logOk(`Port ${port} musait`);
        resolve();
      });
    });
    server.listen(port, "127.0.0.1");
  });
}

async function run() {
  console.log("Connect Puzzle ortam kontrolu basliyor...\n");

  const nodeVersion = process.version;
  if (isNodeVersionSupported(nodeVersion)) {
    logOk(`Node surumu uygun (${nodeVersion})`);
  } else {
    logError(`Node surumu dusuk (${nodeVersion}). En az v18.18.0 gerekli.`);
  }

  const npmUserAgent = process.env.npm_config_user_agent ?? "";
  if (!npmUserAgent) {
    logWarn("npm user-agent okunamadi. Komutu npm ile calistirdiginizdan emin olun.");
  } else {
    logOk(`Paket yoneticisi: ${npmUserAgent.split(" ")[0]}`);
  }

  ensureFile(path.join(projectRoot, "package.json"), "package.json");
  ensureFile(path.join(projectRoot, "package-lock.json"), "package-lock.json");
  ensureFile(path.join(projectRoot, "vite.config.ts"), "vite.config.ts");
  ensureFile(path.join(projectRoot, "src", "main.ts"), "src/main.ts");
  ensureFile(path.join(projectRoot, "public", "assets", "music", "gameplay_loop.mp3"), "Ana muzik dosyasi");

  if (fs.existsSync(path.join(projectRoot, "node_modules"))) {
    logOk("node_modules klasoru mevcut");
  } else {
    logWarn("node_modules bulunamadi. npm install calistirmaniz gerekiyor.");
  }

  checkGitTrackedBuildArtifacts();
  checkOneDrivePath();
  await checkPortAvailability(5173);

  console.log("\n--- Ozet ---");
  console.log(`Hata sayisi: ${errors.length}`);
  console.log(`Uyari sayisi: ${warnings.length}`);

  if (errors.length > 0) {
    process.exitCode = 1;
    console.log("Sonuc: Basarisiz. Once [ERROR] satirlarini duzeltin.");
    return;
  }

  console.log("Sonuc: Gecerli. Ortam temel kontrolleri gecti.");
}

run().catch((err) => {
  logError(`Beklenmeyen hata: ${String(err)}`);
  process.exitCode = 1;
});
