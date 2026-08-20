export interface StoryRootDirectoryPickerWindow {
    __DSH_DESKTOP_PICK_DIRECTORY__?: () => Promise<string | null>;
    __DSH_DESKTOP_VALIDATE_DIRECTORY__?: (path: string) => Promise<boolean>;
}
declare global {
    interface Window extends StoryRootDirectoryPickerWindow {
    }
}
/** Select a QNovel root through the Desktop admission path when running on Windows. */
export declare function pickStoryRootDirectory(fallback: () => Promise<string | null>, search?: string, target?: StoryRootDirectoryPickerWindow): Promise<string | null>;
