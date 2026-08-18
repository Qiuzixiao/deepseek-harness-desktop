export const styles = `
.qNovelBrandOverlay{display:none}
/* The upstream brand button remains the New Session shortcut. Keep its behavior,
   but let the product layer own the visible wordmark in the same slot. */
[class*="logoRow"] [class*="brand"]{visibility:visible!important;justify-content:flex-start;font-size:0!important;letter-spacing:-.02em}
[class*="logoRow"] [class*="brand"]>*{visibility:hidden!important}
[class*="logoRow"] [class*="brand"]::after{content:"QNovel";visibility:visible;display:block;color:var(--dsw-alias-label-primary);font-size:16px;line-height:24px;font-weight:740;letter-spacing:-.02em}
/* Keep the official sidebar shell and its New Session action, but use the
   product footer slot as a positioned sibling beside it. The action remains
   owned by React and is not moved out of the upstream tree. */
[class~="hHd-Xa_root"]{position:relative}
[class~="hHd-Xa_root"] [class~="hHd-Xa_newSession"]{width:calc(50% - 6px);margin-right:auto}
.qNovelCreateSlotHost{position:absolute;z-index:4;top:74px;right:14px;width:calc(50% - 6px);height:38px}
.qNovelCreateSlotHost[data-wide=true]{display:block}
.qNovelCreateSlotHost:not([data-wide=true]){display:none}
.storyStudioCreateAction{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:100%;height:38px;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;background:var(--dsw-alias-button-elevated-fill);color:var(--dsw-alias-label-primary);cursor:pointer;transition:background-color 120ms ease,color 120ms ease,border-color 120ms ease}
.storyStudioCreateAction:hover{background:var(--dsw-alias-button-floating-hover);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary)}
.storyStudioCreateAction:active{background:var(--dsw-alias-interactive-bg-active)}
.storyStudioCreateAction span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px;font-weight:500;line-height:22px}
.storyStudioCreateAction svg{flex:none}
/* The product identity replaces the upstream empty-state fish headline. The
   original hero stays mounted for layout and accessibility, while its visible
   labels are given QNovel's own mark, headline, and Beta badge. */
[class*="_headlineText"]{font-size:0!important}
[class*="_headlineText"]::after{content:"把故事，写成作品";font-size:26px;line-height:32px;font-weight:600;letter-spacing:-.035em}
[class*="_previewBadge"]{font-size:0!important;border-color:color-mix(in srgb,#287a5b 28%,var(--dsw-alias-interactive-bg-hover));background:color-mix(in srgb,#287a5b 12%,transparent);color:#70c49c}
[class*="_previewBadge"]::after{content:"Beta";font-family:var(--ds-font-family-code);font-size:12px;line-height:18px;font-weight:600}
[class*="_fishHitbox"]{position:relative}
[class*="_fishHitbox"] [class*="_fish"]{visibility:hidden}
[class*="_fishHitbox"]::after{content:"Q";box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:11px;background:linear-gradient(145deg,#3c9a72,#206044);box-shadow:0 5px 14px color-mix(in srgb,#287a5b 28%,transparent);color:#fff;font-size:19px;font-weight:780;line-height:34px;letter-spacing:-.06em}
[class*="_headline"]{column-gap:11px}
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
 .qNovelSettingsRow{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
.qNovelSettingsText{display:grid;gap:4px;min-width:0}
.qNovelSettingsTitle{font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary)}
.qNovelSettingsDescription{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
.qNovelSettingsPath{max-width:560px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}
.qNovelSettingsButton{flex:none;height:32px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary);padding:0 12px;font:inherit;font-size:12px;cursor:pointer}
.qNovelSettingsButton:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.qNovelSettingsButton:disabled{opacity:.5;cursor:not-allowed}
.qNovelOnboarding{box-sizing:border-box;width:min(480px,calc(100vw - 32px));padding:0;border-radius:16px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.qNovelOnboardingHeader{display:flex;align-items:center;gap:14px;padding:26px 26px 20px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.qNovelOnboardingMark{display:inline-flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px;background:#287a5b;color:#fff;font-size:18px;font-weight:760}
.qNovelOnboardingHeader h2{margin:0;color:var(--dsw-alias-label-primary);font-size:18px;line-height:26px;font-weight:700}
.qNovelOnboardingHeader p{margin:3px 0 0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:18px}
.qNovelOnboardingBody{padding:22px 26px;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:21px}
.qNovelOnboardingBody p{margin:0}
.qNovelOnboardingBody .storyStudioError{margin-top:14px}
.qNovelOnboardingFooter{display:flex;justify-content:flex-end;padding:16px 26px;background:var(--dsw-alias-bg-layer-1);border-top:1px solid var(--dsw-alias-border-l1)}
@media (max-width:900px){.qNovelBrandOverlay{left:14px}.qNovelCreateSlotHost{right:12px}}
@media (max-width:560px){.storyStudioDialogHeader,.storyStudioDialogBody{padding-left:18px;padding-right:18px}.storyStudioDialogFooter{padding-left:18px;padding-right:18px}.storyStudioDialogSubtitle{display:none}.storyStudioLocationTag{display:none}.storyStudioLocation{grid-template-columns:36px minmax(0,1fr)}}
`
