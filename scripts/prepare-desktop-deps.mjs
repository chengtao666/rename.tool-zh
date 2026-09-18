import fs from "node:fs";
import path from "node:path";

const source = path.resolve(".next", "standalone", "node_modules");
const outputRoot = path.resolve(".desktop-build");
const destination = path.join(outputRoot, "node_modules");

if (!fs.existsSync(source)) {
	throw new Error("未找到 Next.js standalone 依赖目录，请先执行生产构建。");
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(destination, { recursive: true });

function copyPackage(sourcePath, packageName) {
	const packageDestination = path.join(destination, packageName);
	if (fs.existsSync(packageDestination)) {
		return;
	}

	fs.mkdirSync(path.dirname(packageDestination), { recursive: true });
	fs.cpSync(sourcePath, packageDestination, {
		recursive: true,
		dereference: true,
		force: true,
	});
}

function visitNodeModules(nodeModulesPath) {
	const entries = fs
		.readdirSync(nodeModulesPath, { withFileTypes: true })
		.filter((entry) => entry.name !== ".bin")
		.sort((a, b) => a.name.localeCompare(b.name));

	for (const entry of entries) {
		const entryPath = path.join(nodeModulesPath, entry.name);

		if (entry.name.startsWith("@")) {
			for (const scopedEntry of fs
				.readdirSync(entryPath, { withFileTypes: true })
				.sort((a, b) => a.name.localeCompare(b.name))) {
				if (scopedEntry.name === ".bin") {
					continue;
				}

				copyPackage(
					path.join(entryPath, scopedEntry.name),
					`${entry.name}/${scopedEntry.name}`,
				);
			}
			continue;
		}

		copyPackage(entryPath, entry.name);
	}
}

const virtualStore = path.join(source, ".pnpm");
if (!fs.existsSync(virtualStore)) {
	throw new Error("未找到 pnpm 虚拟依赖目录，无法准备桌面版运行时。");
}

for (const packageFolder of fs
	.readdirSync(virtualStore, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.sort((a, b) => a.name.localeCompare(b.name))) {
	const nodeModulesPath = path.join(
		virtualStore,
		packageFolder.name,
		"node_modules",
	);
	if (fs.existsSync(nodeModulesPath)) {
		visitNodeModules(nodeModulesPath);
	}
}

console.log(`桌面版运行时依赖已准备：${destination}`);
