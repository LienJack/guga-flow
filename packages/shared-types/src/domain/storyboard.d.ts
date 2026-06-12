export interface StoryboardResult {
    title: string;
    logline: string;
    characters: CharacterDraft[];
    locations: LocationDraft[];
    scenes: SceneDraft[];
}
export interface CharacterDraft {
    tempId: string;
    name: string;
    role: string;
    appearance: string;
    personality: string;
    costume?: string;
    identityPrompt: string;
}
export interface LocationDraft {
    tempId: string;
    name: string;
    type: "interior" | "exterior" | "fantasy" | "virtual";
    description: string;
    lighting: string;
    atmosphere: string;
    locationPrompt: string;
}
export interface SceneDraft {
    tempId: string;
    title: string;
    sourceExcerpt: string;
    summary: string;
    mood: string;
    timeOfDay?: string;
    characterTempIds: string[];
    locationTempId?: string;
    shots: ShotDraft[];
}
export interface ShotDraft {
    tempId: string;
    shotIndex: number;
    title: string;
    sourceExcerpt?: string;
    durationSec: number;
    visualDescription: string;
    action: string;
    cameraMovement: string;
    lens?: string;
    lighting?: string;
    mood?: string;
    dialogue?: string;
    narration?: string;
    soundEffect?: string;
    characterTempIds: string[];
    locationTempId?: string;
    imagePrompt: string;
    videoPrompt: string;
    negativePrompt?: string;
}
//# sourceMappingURL=storyboard.d.ts.map