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
.storyStudioDialog{box-sizing:border-box;width:min(520px,calc(100vw - 32px));gap:0;padding:0;border-radius:12px;border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.storyStudioDialogHeader{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:22px 24px 18px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.storyStudioDialogIdentity{display:flex;align-items:center;gap:12px;min-width:0}
.storyStudioDialogMark{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;flex:none;border-radius:8px;background:#287a5b;color:#fff;font-size:12px;font-weight:750}
.storyStudioDialogTitle{margin:0;color:var(--dsw-alias-label-primary);font-size:17px;line-height:24px;font-weight:680}
.storyStudioDialogSubtitle{margin:2px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.storyStudioDialogClose{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:none;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.storyStudioDialogClose:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.storyStudioDialogBody{padding:22px 24px 24px}
.storyStudioForm{display:grid;gap:18px;min-width:0}
.storyStudioField{display:grid;gap:8px;min-width:0}
.storyStudioLabel{font-size:13px;line-height:20px;font-weight:650;color:var(--dsw-alias-label-primary)}
.storyStudioInput{box-sizing:border-box;width:100%;height:44px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);padding:0 13px;font:inherit;font-size:14px;outline:none;transition:border-color 120ms ease,box-shadow 120ms ease}
.storyStudioInput::placeholder{color:var(--dsw-alias-label-tertiary)}
.storyStudioInput:hover:not(:disabled){border-color:var(--dsw-alias-border-l3)}
.storyStudioInput:focus{border-color:#287a5b;box-shadow:0 0 0 3px color-mix(in srgb,#287a5b 16%,transparent)}
.storyStudioFieldHint{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}
.storyStudioLocation{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:11px;min-width:0;padding:12px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}
.storyStudioLocationIcon{display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:7px;background:color-mix(in srgb,#287a5b 12%,var(--dsw-alias-bg-base));color:#3d9a74}
.storyStudioLocationText{display:flex;flex-direction:column;gap:2px;min-width:0}
.storyStudioLocationLabel{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}
.storyStudioLocationPath{color:var(--dsw-alias-label-primary);font-size:12px;line-height:18px;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}
.storyStudioLocationTag{align-self:center;border:1px solid color-mix(in srgb,#287a5b 28%,transparent);border-radius:999px;background:color-mix(in srgb,#287a5b 10%,transparent);color:#3d9a74;padding:3px 8px;font-size:10px;line-height:15px;white-space:nowrap}
.storyStudioError{margin:0;padding:9px 11px;border-radius:7px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#c43d3d) 10%,transparent);color:var(--dsw-alias-state-error-primary,#c43d3d);font-size:12px;line-height:18px}
.storyStudioDialogFooter{display:flex;align-items:center;justify-content:flex-end;gap:9px;padding:16px 24px;border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.storyStudioDialogCancel,.storyStudioDialogSubmit{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;border-radius:7px;padding:0 15px;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
.storyStudioDialogCancel{border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary)}
.storyStudioDialogCancel:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.storyStudioDialogSubmit{border:1px solid #287a5b;background:#287a5b;color:#fff}
.storyStudioDialogSubmit:hover:not(:disabled){border-color:#216447;background:#216447}
.storyStudioDialogSubmit:disabled,.storyStudioDialogCancel:disabled,.storyStudioDialogClose:disabled{opacity:.45;cursor:not-allowed}
.storyStudioEmpty{padding:10px 12px;font-size:12px;color:var(--dsw-alias-text-tertiary)}
@media (max-width:900px){.storyStudioProductState{display:none}.storyStudioProductBadge{right:76px}.storyStudioProductName{display:none}}
@media (max-width:560px){.storyStudioDialogHeader,.storyStudioDialogBody{padding-left:18px;padding-right:18px}.storyStudioDialogFooter{padding-left:18px;padding-right:18px}.storyStudioDialogSubtitle{display:none}.storyStudioLocationTag{display:none}.storyStudioLocation{grid-template-columns:36px minmax(0,1fr)}}
`
