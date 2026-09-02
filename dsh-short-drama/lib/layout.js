import { existsSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
function defineLayout(id, values, fileNames = {
    contract: 'creative-contract.md',
    setting: 'core-setting.md',
    otherCharacters: 'other-characters.md',
    outline: 'full-outline.md',
    episodeOutlines: 'episode-outlines.md',
    episode: episode => `episode-${String(episode).padStart(3, '0')}.md`,
}) {
    const directories = [
        values.referenceDir,
        values.contractDir,
        values.settingDir,
        values.mainCharactersDir,
        values.otherCharactersDir,
        values.outlineDir,
        values.episodesDir,
        values.screenplayDir,
        values.deliverablesDir,
    ];
    return {
        id,
        ...values,
        directories,
        contractFile: posix.join(values.contractDir, fileNames.contract),
        settingFile: posix.join(values.settingDir, fileNames.setting),
        otherCharactersFile: posix.join(values.otherCharactersDir, fileNames.otherCharacters),
        outlineFile: posix.join(values.outlineDir, fileNames.outline),
        episodeOutlinesFile: posix.join(values.episodesDir, fileNames.episodeOutlines),
        mainCharacterPath: name => posix.join(values.mainCharactersDir, `${name}.md`),
        episodeScreenplayPath: episode => posix.join(values.screenplayDir, fileNames.episode(episode)),
        deliverablePath: projectName => posix.join(values.deliverablesDir, `${projectName}.md`),
    };
}
export const LEGACY_SCREENPLAY_LAYOUT = defineLayout('legacy-en-v1', {
    referenceDir: '参考文件',
    contractDir: 'contract',
    settingDir: 'setting',
    charactersDir: 'characters',
    mainCharactersDir: posix.join('characters', 'main'),
    otherCharactersDir: posix.join('characters', 'other'),
    outlineDir: 'outline',
    episodesDir: 'episodes',
    screenplayDir: 'screenplay',
    deliverablesDir: 'deliverables',
});
export const CHINESE_SCREENPLAY_LAYOUT = defineLayout('zh-CN-v1', {
    referenceDir: '参考文件',
    contractDir: '创作合同',
    settingDir: '设定',
    charactersDir: '人物',
    mainCharactersDir: posix.join('人物', '主要人物'),
    otherCharactersDir: posix.join('人物', '其他人物'),
    outlineDir: '大纲',
    episodesDir: '分集大纲',
    screenplayDir: '剧本',
    deliverablesDir: '交付',
}, {
    contract: '创作合同.md',
    setting: '核心设定.md',
    otherCharacters: '其他人物.md',
    outline: '总纲.md',
    episodeOutlines: '分集大纲.md',
    episode: episode => `第${String(episode).padStart(3, '0')}集.md`,
});
export const DEFAULT_SCREENPLAY_LAYOUT = CHINESE_SCREENPLAY_LAYOUT;
export const SCREENPLAY_LAYOUT_MARKER = posix.join('.screenplay', 'layout.json');
export function screenplayLayoutOf(id) {
    return id === 'zh-CN-v1' ? CHINESE_SCREENPLAY_LAYOUT : LEGACY_SCREENPLAY_LAYOUT;
}
function validLayoutId(value) {
    return value === 'zh-CN-v1' || value === 'legacy-en-v1';
}
/** Detect a project's persisted layout, then fall back to its visible folders. */
export function detectScreenplayLayout(workspaceRoot, fallback = DEFAULT_SCREENPLAY_LAYOUT) {
    const markerPath = join(workspaceRoot, SCREENPLAY_LAYOUT_MARKER);
    try {
        const marker = JSON.parse(readFileSync(markerPath, 'utf8'));
        if (validLayoutId(marker.layout))
            return screenplayLayoutOf(marker.layout);
    }
    catch {
        // A missing or old marker is resolved by the state/folder fallback below.
    }
    let hasStateWithoutLayout = false;
    try {
        const state = JSON.parse(readFileSync(join(workspaceRoot, '.screenplay', 'state.json'), 'utf8'));
        if (validLayoutId(state.layout))
            return screenplayLayoutOf(state.layout);
        hasStateWithoutLayout = true;
    }
    catch {
        // The state file is optional during the launcher intake phase.
    }
    // State files created before layout profiles existed always used English paths.
    if (hasStateWithoutLayout)
        return LEGACY_SCREENPLAY_LAYOUT;
    const hasChinese = existsSync(join(workspaceRoot, CHINESE_SCREENPLAY_LAYOUT.contractDir))
        || existsSync(join(workspaceRoot, CHINESE_SCREENPLAY_LAYOUT.screenplayDir));
    const hasLegacy = existsSync(join(workspaceRoot, LEGACY_SCREENPLAY_LAYOUT.contractDir))
        || existsSync(join(workspaceRoot, LEGACY_SCREENPLAY_LAYOUT.screenplayDir));
    if (hasChinese && !hasLegacy)
        return CHINESE_SCREENPLAY_LAYOUT;
    if (hasLegacy && !hasChinese)
        return LEGACY_SCREENPLAY_LAYOUT;
    return fallback;
}
