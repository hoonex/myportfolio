#!/usr/bin/env python3
"""Emit a bounded, evidence-backed topology snapshot for web repositories.

This helper intentionally avoids claiming semantic ownership. It reports repository
facts that can be derived from Git-tracked paths and declared package metadata so
an agent can inspect a much smaller task-specific source set next.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from pathlib import Path, PurePosixPath
from typing import Iterable

SCHEMA = 1
SOURCE_SUFFIXES = {".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte", ".astro"}
STYLE_SUFFIXES = {".css", ".scss", ".sass", ".less"}

FRAMEWORK_PACKAGES = {
    "next": "Next.js",
    "nuxt": "Nuxt",
    "@remix-run/react": "Remix",
    "@sveltejs/kit": "SvelteKit",
    "astro": "Astro",
    "@angular/core": "Angular",
    "vue": "Vue",
    "react": "React",
    "svelte": "Svelte",
}

ROUTER_PACKAGES = {
    "next": "Next.js router",
    "react-router": "React Router",
    "react-router-dom": "React Router",
    "@tanstack/react-router": "TanStack Router",
    "vue-router": "Vue Router",
    "@angular/router": "Angular Router",
    "@remix-run/react": "Remix router",
    "@sveltejs/kit": "SvelteKit router",
    "nuxt": "Nuxt router",
}

STATE_DATA_PACKAGES = {
    "@reduxjs/toolkit": "Redux Toolkit",
    "redux": "Redux",
    "zustand": "Zustand",
    "jotai": "Jotai",
    "mobx": "MobX",
    "mobx-react-lite": "MobX",
    "xstate": "XState",
    "@tanstack/react-query": "TanStack Query",
    "@tanstack/vue-query": "TanStack Query",
    "swr": "SWR",
    "@apollo/client": "Apollo Client",
    "urql": "urql",
    "@urql/core": "urql",
    "pinia": "Pinia",
    "vuex": "Vuex",
}

STYLING_PACKAGES = {
    "tailwindcss": "Tailwind CSS",
    "styled-components": "styled-components",
    "@emotion/react": "Emotion",
    "@emotion/styled": "Emotion",
    "sass": "Sass",
    "less": "Less",
    "@vanilla-extract/css": "vanilla-extract",
    "@stitches/react": "Stitches",
}

COMMON_CONFIG_NAMES = {
    "package.json",
    "tsconfig.json",
    "jsconfig.json",
    "vite.config.js",
    "vite.config.ts",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "nuxt.config.js",
    "nuxt.config.ts",
    "astro.config.js",
    "astro.config.mjs",
    "astro.config.ts",
    "svelte.config.js",
    "svelte.config.ts",
    "angular.json",
    "remix.config.js",
    "remix.config.ts",
    "tailwind.config.js",
    "tailwind.config.cjs",
    "tailwind.config.mjs",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.cjs",
    "postcss.config.mjs",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.ts",
    ".eslintrc",
    ".eslintrc.json",
    ".eslintrc.js",
    "netlify.toml",
    "vercel.json",
}

LOCKFILES = {
    "pnpm-lock.yaml": "pnpm",
    "yarn.lock": "yarn",
    "package-lock.json": "npm",
    "bun.lock": "bun",
    "bun.lockb": "bun",
}

ENTRYPOINT_BASENAMES = {
    "main.ts",
    "main.tsx",
    "main.js",
    "main.jsx",
    "index.ts",
    "index.tsx",
    "index.js",
    "index.jsx",
    "app.ts",
    "app.tsx",
    "app.js",
    "app.jsx",
    "App.tsx",
    "App.jsx",
    "root.tsx",
    "root.jsx",
}

TOKEN_HINT_RE = re.compile(r"(?:token|theme|palette|color|spacing|typography|design-system)", re.I)


def run_git(repo: Path, *args: str) -> tuple[int, str]:
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    return proc.returncode, proc.stdout.strip()


def git_identity(repo: Path) -> dict:
    code, head = run_git(repo, "rev-parse", "HEAD")
    if code != 0:
        return {"head": None, "tree": None, "working_tree": "unknown"}
    _, tree = run_git(repo, "rev-parse", "HEAD^{tree}")
    status_code, status = run_git(repo, "status", "--porcelain")
    working = "unknown" if status_code != 0 else ("dirty" if status else "clean")
    return {"head": head or None, "tree": tree or None, "working_tree": working}


def git_paths(repo: Path, include_untracked: bool = False) -> tuple[list[str], str]:
    args = ["ls-files", "-z"]
    if include_untracked:
        args = ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]
    proc = subprocess.run(
        ["git", "-C", str(repo), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if proc.returncode == 0:
        values = [p.decode("utf-8", errors="replace") for p in proc.stdout.split(b"\0") if p]
        return sorted(set(values)), "git"

    ignored = {".git", "node_modules", ".next", "dist", "build", ".nuxt", ".svelte-kit", "coverage", ".cache"}
    values = []
    for root, dirs, files in os.walk(repo):
        root_path = Path(root)
        dirs[:] = [d for d in dirs if d not in ignored]
        for name in files:
            path = root_path / name
            try:
                values.append(path.relative_to(repo).as_posix())
            except ValueError:
                continue
    return sorted(set(values)), "filesystem-fallback"


def load_package(repo: Path) -> tuple[dict, list[str]]:
    path = repo / "package.json"
    if not path.is_file():
        return {}, []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}, ["package.json exists but could not be parsed as JSON"]
    if not isinstance(data, dict):
        return {}, ["package.json root is not an object"]
    return data, []


def all_declared_packages(package: dict) -> set[str]:
    result: set[str] = set()
    for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        values = package.get(key, {})
        if isinstance(values, dict):
            result.update(str(name) for name in values)
    return result


def declared_systems(packages: set[str], mapping: dict[str, str]) -> list[dict]:
    grouped: dict[str, list[str]] = {}
    for package_name, label in mapping.items():
        if package_name in packages:
            grouped.setdefault(label, []).append(package_name)
    return [
        {"name": label, "evidence": ["package.json:" + name for name in sorted(names)], "evidence_level": "DECLARED"}
        for label, names in sorted(grouped.items())
    ]


def detect_package_manager(paths: set[str], package: dict) -> dict | None:
    pm = package.get("packageManager")
    if isinstance(pm, str) and pm.strip():
        return {"name": pm.strip(), "evidence": ["package.json#packageManager"], "evidence_level": "DECLARED"}
    for lock, name in LOCKFILES.items():
        if lock in paths:
            return {"name": name, "evidence": [lock], "evidence_level": "OBSERVED"}
    return None


def route_from_next_app(path: str) -> dict | None:
    p = PurePosixPath(path)
    parts = list(p.parts)
    if not parts or parts[0] not in {"app", "src"}:
        return None
    if parts[0] == "src":
        if len(parts) < 2 or parts[1] != "app":
            return None
        rel = parts[2:]
    else:
        rel = parts[1:]
    if not rel:
        return None
    filename = rel[-1]
    stem = PurePosixPath(filename).stem
    if stem not in {"page", "layout", "route", "loading", "error", "not-found", "template"}:
        return None
    segments = [segment for segment in rel[:-1] if not (segment.startswith("(") and segment.endswith(")")) and not segment.startswith("@")]
    route = "/" + "/".join(segments)
    if route != "/":
        route = route.rstrip("/")
    return {"path": path, "route": route or "/", "kind": "next-app-" + stem, "evidence_level": "OBSERVED"}


def route_from_next_pages(path: str) -> dict | None:
    p = PurePosixPath(path)
    parts = list(p.parts)
    if parts[:1] == ["pages"]:
        rel = parts[1:]
    elif parts[:2] == ["src", "pages"]:
        rel = parts[2:]
    else:
        return None
    if not rel or PurePosixPath(rel[-1]).suffix not in SOURCE_SUFFIXES:
        return None
    stem = PurePosixPath(rel[-1]).stem
    if stem.startswith("_"):
        return {"path": path, "route": None, "kind": "next-pages-special", "evidence_level": "OBSERVED"}
    segments = rel[:-1] + ([] if stem == "index" else [stem])
    route = "/" + "/".join(segments)
    return {"path": path, "route": route or "/", "kind": "next-pages-route", "evidence_level": "OBSERVED"}


def route_from_file_convention(path: str) -> dict | None:
    p = PurePosixPath(path)
    parts = list(p.parts)
    suffix = p.suffix
    if suffix not in SOURCE_SUFFIXES:
        return None

    # SvelteKit: src/routes/**/+page.svelte, +layout.svelte, +server.ts
    if parts[:2] == ["src", "routes"] and p.name.startswith("+"):
        rel = parts[2:-1]
        route = "/" + "/".join(rel)
        return {"path": path, "route": route or "/", "kind": "sveltekit-" + p.stem.lstrip("+"), "evidence_level": "OBSERVED"}

    # Nuxt pages/** and Astro src/pages/** use file routing.
    if parts[:1] == ["pages"] or parts[:2] == ["src", "pages"]:
        base = 1 if parts[:1] == ["pages"] else 2
        rel = parts[base:]
        stem = PurePosixPath(rel[-1]).stem
        segments = rel[:-1] + ([] if stem == "index" else [stem])
        route = "/" + "/".join(segments)
        return {"path": path, "route": route or "/", "kind": "file-route-candidate", "evidence_level": "OBSERVED"}

    # Remix route filenames are intentionally left as paths, not normalized into a
    # claimed URL because flat-route semantics can vary by convention/version.
    if parts[:2] == ["app", "routes"] or parts[:3] == ["src", "app", "routes"]:
        return {"path": path, "route": None, "kind": "remix-route-candidate", "evidence_level": "OBSERVED"}
    return None


def detect_routes(paths: Iterable[str], max_routes: int) -> tuple[list[dict], bool]:
    routes: list[dict] = []
    seen = set()
    for path in paths:
        item = route_from_next_app(path) or route_from_next_pages(path) or route_from_file_convention(path)
        if not item:
            continue
        key = (item["path"], item["kind"])
        if key in seen:
            continue
        seen.add(key)
        routes.append(item)
    routes.sort(key=lambda item: item["path"])
    truncated = len(routes) > max_routes
    return routes[:max_routes], truncated


def source_roots(paths: Iterable[str]) -> list[dict]:
    candidates = ["src", "app", "pages", "components", "lib", "packages", "apps"]
    path_set = list(paths)
    result = []
    for root in candidates:
        prefix = root + "/"
        if any(p == root or p.startswith(prefix) for p in path_set):
            result.append({"path": root + "/", "evidence_level": "OBSERVED"})
    return result


def entrypoints(paths: Iterable[str], max_items: int = 40) -> list[dict]:
    values = []
    for path in paths:
        p = PurePosixPath(path)
        if p.name in ENTRYPOINT_BASENAMES and len(p.parts) <= 4:
            values.append({"path": path, "evidence_level": "OBSERVED", "reason": "common entrypoint filename"})
        elif p.name in {"layout.tsx", "layout.jsx", "layout.js", "layout.ts", "root.tsx", "root.jsx"} and len(p.parts) <= 4:
            values.append({"path": path, "evidence_level": "OBSERVED", "reason": "framework root/layout candidate"})
    dedup = {item["path"]: item for item in values}
    return [dedup[key] for key in sorted(dedup)[:max_items]]


def configs(paths: set[str]) -> list[dict]:
    values = []
    for path in sorted(paths):
        name = PurePosixPath(path).name
        if path in COMMON_CONFIG_NAMES or name in COMMON_CONFIG_NAMES:
            values.append({"path": path, "evidence_level": "OBSERVED"})
    return values


def styling_candidates(paths: Iterable[str], max_items: int = 80) -> dict:
    globals_: list[str] = []
    modules: list[str] = []
    token_candidates: list[str] = []
    for path in paths:
        p = PurePosixPath(path)
        if p.suffix in STYLE_SUFFIXES:
            lower = p.name.lower()
            if ".module." in lower:
                modules.append(path)
            if lower in {"globals.css", "global.css", "app.css", "main.css", "index.css", "styles.css"}:
                globals_.append(path)
            if TOKEN_HINT_RE.search(path):
                token_candidates.append(path)
        elif TOKEN_HINT_RE.search(path) and p.suffix in {".ts", ".tsx", ".js", ".jsx", ".json"}:
            token_candidates.append(path)
    return {
        "global_style_candidates": sorted(set(globals_))[:max_items],
        "css_module_candidates": sorted(set(modules))[:max_items],
        "token_theme_candidates": sorted(set(token_candidates))[:max_items],
    }


def script_summary(package: dict) -> list[dict]:
    scripts = package.get("scripts", {})
    if not isinstance(scripts, dict):
        return []
    return [
        {"name": str(name), "command": str(command), "evidence": "package.json#scripts", "evidence_level": "DECLARED"}
        for name, command in sorted(scripts.items())
        if isinstance(command, (str, int, float))
    ]


def build(repo: Path, include_untracked: bool = False, max_routes: int = 200) -> dict:
    repo = repo.resolve()
    paths, path_source = git_paths(repo, include_untracked=include_untracked)
    path_set = set(paths)
    package, parse_limits = load_package(repo)
    packages = all_declared_packages(package)
    route_items, routes_truncated = detect_routes(paths, max_routes=max_routes)
    style_files = styling_candidates(paths)

    limits = list(parse_limits)
    limits.extend(
        [
            "Semantic ownership is intentionally not inferred by this helper.",
            "Runtime request/data flow is not proven by directory names or package declarations.",
            "Only convention-based route candidates are emitted; custom router tables require source inspection.",
            "Entrypoints are candidates, not guaranteed runtime roots.",
        ]
    )
    if path_source != "git":
        limits.append("Git path enumeration was unavailable; filesystem fallback may include non-durable working files.")
    if routes_truncated:
        limits.append(f"Route candidate output truncated at {max_routes} entries.")

    config_items = configs(path_set)
    package_manager = detect_package_manager(path_set, package)

    return {
        "schema": SCHEMA,
        "kind": "sloar-web-topology-snapshot",
        "repository": {
            "root_name": repo.name,
            "source_identity": git_identity(repo),
            "path_inventory_source": path_source,
            "include_untracked": include_untracked,
            "tracked_or_visible_file_count": len(paths),
        },
        "package_manager": package_manager,
        "package_scripts": script_summary(package),
        "frameworks": declared_systems(packages, FRAMEWORK_PACKAGES),
        "routers": declared_systems(packages, ROUTER_PACKAGES),
        "state_data_systems": declared_systems(packages, STATE_DATA_PACKAGES),
        "styling_systems": declared_systems(packages, STYLING_PACKAGES),
        "source_roots": source_roots(paths),
        "entrypoint_candidates": entrypoints(paths),
        "routes": route_items,
        "configuration_files": config_items,
        "styling_candidates": style_files,
        "limits": limits,
    }


def render(data: dict) -> str:
    identity = data["repository"]["source_identity"]
    frameworks = ", ".join(item["name"] for item in data["frameworks"]) or "unknown/not declared"
    routers = ", ".join(item["name"] for item in data["routers"]) or "unknown/not declared"
    state_data = ", ".join(item["name"] for item in data["state_data_systems"]) or "none detected from declarations"
    styling = ", ".join(item["name"] for item in data["styling_systems"]) or "none detected from declarations"
    lines = [
        "Sloar web architecture topology",
        f"Repository: {data['repository']['root_name']}",
        f"HEAD: {identity.get('head') or 'unknown'}",
        f"Tree: {identity.get('tree') or 'unknown'}",
        f"Working tree: {identity.get('working_tree')}",
        f"Frameworks: {frameworks}",
        f"Routers: {routers}",
        f"State/data systems: {state_data}",
        f"Styling systems: {styling}",
        f"Route candidates: {len(data['routes'])}",
        "Next: inspect only the task-relevant route/data/state/component/style/effect owners and record semantic ownership with evidence.",
    ]
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Emit a bounded web-repository topology snapshot for Sloar architecture discovery.")
    parser.add_argument("repo", nargs="?", default=".")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON")
    parser.add_argument("--output", help="Also write the JSON snapshot to this path")
    parser.add_argument("--include-untracked", action="store_true", help="Include Git-untracked, non-ignored files in topology discovery")
    parser.add_argument("--max-routes", type=int, default=200, help="Maximum route candidates to emit")
    args = parser.parse_args()

    if args.max_routes < 1:
        raise SystemExit("--max-routes must be >= 1")
    repo = Path(args.repo).expanduser().resolve()
    if not repo.is_dir():
        raise SystemExit(f"directory does not exist: {repo}")

    data = build(repo, include_untracked=args.include_untracked, max_routes=args.max_routes)
    if args.output:
        out = Path(args.output).expanduser().resolve()
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(data, indent=2, ensure_ascii=False) if args.json else render(data))


if __name__ == "__main__":
    main()
