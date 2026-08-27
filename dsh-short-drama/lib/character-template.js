/**
 * The single source of truth for user-facing character Markdown.
 *
 * The Agent prompt and the Store validator both consume these definitions so
 * a character cannot be considered valid merely because its section headings
 * happen to be present.
 */
export const MAIN_CHARACTER_SECTIONS = [
    '## 一句话记忆点',
    '## 基本信息',
    '## 性格特质',
    '## 关键经历',
    '## 人物关系',
    '## 记忆点标签',
];
export const MAIN_CHARACTER_FIELDS = {
    '基本信息': ['年龄', '身份', '外貌', '口头禅'],
    '性格特质': ['核心性格', '行为习惯', '内在矛盾', '成长弧光'],
    '记忆点标签': ['标志动作', '弱点软肋', '代表名场面', '核心标签'],
};
export const OTHER_CHARACTER_FIELDS = ['身份', '性格', '记忆点', '作用'];
export const CHARACTER_TEMPLATE_INSTRUCTIONS = `
## 主要角色字段级模板（必须严格遵守）

主要角色文件必须严格按以下结构生成。下面的字段名、标题层级和列表格式都不能删除、合并或改名；素材没有提供的信息写“待确认”，不得留空，也不得擅自补写事实。

\`\`\`md
# 角色名（角色定位）

## 一句话记忆点

一句话概括角色最核心、最容易被记住的矛盾或卖点。

## 基本信息

- **年龄**：
- **身份**：
- **外貌**：
- **口头禅**：

## 性格特质

- **核心性格**：
- **行为习惯**：
- **内在矛盾**：
- **成长弧光**：

## 关键经历

- 
- 

## 人物关系

- **关系对象**：关系起点、当前状态和已确认的变化。

## 记忆点标签

- **标志动作**：
- **弱点软肋**：
- **代表名场面**：
- **核心标签**：
\`\`\`

“关键经历”和“人物关系”可以根据素材增加列表项，但不能改成无字段的整段概括。

## 其他角色字段级模板（必须严格遵守）

其他角色必须合并到同一个文件。每个角色重复以下四个字段，最后统一写关系图；字段不能省略，未知内容写“待确认”。

\`\`\`md
# 其他关键角色（配角）

## 角色名

- **身份**：
- **性格**：
- **记忆点**：
- **作用**：

## 角色关系图（简要）
\`\`\`

输出前必须逐项自检：所有字段均存在；字段使用 \`- **字段名**：内容\`；不得把多个字段压成一段话；没有把未知事实写成确定事实。`;
export const MAIN_CHARACTER_TEMPLATE_MARKDOWN = `# 角色名（角色定位）

## 一句话记忆点

一句话概括角色最核心、最容易被记住的矛盾或卖点。

## 基本信息

- **年龄**：待确认
- **身份**：待确认
- **外貌**：待确认
- **口头禅**：待确认

## 性格特质

- **核心性格**：待确认
- **行为习惯**：待确认
- **内在矛盾**：待确认
- **成长弧光**：待确认

## 关键经历

- 待确认

## 人物关系

- **关系对象**：待确认

## 记忆点标签

- **标志动作**：待确认
- **弱点软肋**：待确认
- **代表名场面**：待确认
- **核心标签**：待确认`;
export const OTHER_CHARACTER_TEMPLATE_MARKDOWN = `# 其他关键角色（配角）

## 角色名

- **身份**：待确认
- **性格**：待确认
- **记忆点**：待确认
- **作用**：待确认

## 角色关系图（简要）

待确认`;
export function sectionBody(content, heading) {
    const start = content.indexOf(heading);
    if (start < 0)
        return '';
    const bodyStart = start + heading.length;
    const nextHeading = content.slice(bodyStart).search(/^##\s+/mu);
    return content.slice(bodyStart, nextHeading < 0 ? content.length : bodyStart + nextHeading);
}
export function fieldValues(body) {
    const values = new Map();
    for (const match of body.matchAll(/^\s*-\s*\*\*([^*]+)\*\*：\s*(.*?)\s*$/gmu)) {
        const name = match[1]?.trim();
        const value = match[2]?.trim();
        if (name === undefined || value === undefined)
            continue;
        const current = values.get(name) ?? [];
        current.push(value);
        values.set(name, current);
    }
    return values;
}
export function isPresentFieldValue(value) {
    return value.trim().length > 0;
}
export function hasMainCharacterFieldTemplate(content) {
    if (MAIN_CHARACTER_SECTIONS.some(section => !content.includes(section)))
        return false;
    for (const [section, fields] of Object.entries(MAIN_CHARACTER_FIELDS)) {
        const values = fieldValues(sectionBody(content, `## ${section}`));
        if (fields.some(field => !values.has(field)))
            return false;
    }
    return true;
}
