export const styles = `
.storyStudioProductBadge{pointer-events:auto;position:fixed;z-index:35;top:10px;right:92px;display:flex;align-items:center;gap:8px;height:30px;padding:0 6px 0 9px;border:1px solid color-mix(in srgb,#287a5b 28%,var(--dsw-alias-border-l2));border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-bg-base) 94%,#287a5b);box-shadow:0 2px 8px #0000000d;color:var(--dsw-alias-text-primary);font-size:12px}
.storyStudioProductMark{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;background:#287a5b;color:#fff;font-size:9px;font-weight:750;letter-spacing:.2px}
.storyStudioProductName{font-weight:700;color:var(--dsw-alias-text-primary)}
.storyStudioProductState{color:var(--dsw-alias-text-secondary);padding-right:3px}
.storyStudioProductAction{display:inline-flex;align-items:center;gap:4px;height:24px;border:0;border-radius:5px;background:#287a5b;color:#fff;padding:0 8px;font:inherit;font-size:11px;cursor:pointer}
.storyStudioProductAction:hover{background:#216447}
.storyStudioCreateAction{display:flex;align-items:center;justify-content:center;min-width:32px;height:32px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-text-secondary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease}
.storyStudioCreateAction:hover{background:var(--dsw-alias-fill-hover);color:var(--dsw-alias-text-primary)}
.storyStudioCreateAction[data-wide=true]{width:100%;justify-content:flex-start;gap:9px;padding:0 10px;font-size:13px}
.storyStudioForm{display:grid;gap:16px;min-width:min(420px,calc(100vw - 64px))}
.storyStudioField{display:grid;gap:7px}
.storyStudioLabel{font-size:12px;font-weight:650;color:var(--dsw-alias-text-primary)}
.storyStudioInput{box-sizing:border-box;width:100%;height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-text-primary);padding:0 12px;font:inherit;font-size:14px;outline:none}
.storyStudioInput:focus{border-color:#287a5b;box-shadow:0 0 0 2px color-mix(in srgb,#287a5b 18%,transparent)}
.storyStudioPath{display:flex;align-items:flex-start;gap:8px;padding:10px 11px;border-left:3px solid #287a5b;background:color-mix(in srgb,#287a5b 7%,var(--dsw-alias-bg-base));font-size:12px;line-height:1.5;color:var(--dsw-alias-text-secondary);word-break:break-all}
.storyStudioError{margin:0;color:var(--dsw-alias-text-error,#c43d3d);font-size:12px;line-height:1.45}
.storyStudioEmpty{padding:10px 12px;font-size:12px;color:var(--dsw-alias-text-tertiary)}
@media (max-width:900px){.storyStudioProductState{display:none}.storyStudioProductBadge{right:76px}.storyStudioProductName{display:none}}
`
