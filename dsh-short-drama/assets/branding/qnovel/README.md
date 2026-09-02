# QNovel brand assets

Source artwork for the short-drama product. The 1024-pixel layer in `icon.icns`
is the source for `dsh-plugin-desktop/build/app-icon.png`; the desktop build
derives the platform application icons from that packaged PNG. The tray uses a
separate simplified vector mark so it remains legible at native menu-bar sizes.

| File | Format | Intended role |
| --- | --- | --- |
| `icon-256.png` | 256 x 256 RGBA PNG | Small square application icon |
| `icon-512.png` | 512 x 512 RGBA PNG | Square application icon source |
| `icon-512-copy.png` | 512 x 512 RGBA PNG | Preserved duplicate of `icon-512.png` from the supplied artwork |
| `icon.png` | 512 x 512 RGBA PNG | Circular feather brand mark |
| `icon-qnovel.svg` | 512 x 511.975 SVG | SVG wrapper containing embedded raster artwork |
| `icon.icns` | 1024 x 1024 ICNS | macOS application icon set |

`icon-512.png` and `icon-512-copy.png` currently have the same SHA-256 digest.
Both are retained so the supplied source set remains complete until the final
brand and packaging asset is selected.
