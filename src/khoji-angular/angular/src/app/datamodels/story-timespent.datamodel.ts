import { TimeGroup } from "./timegroup.datamodel";

export interface StoryTimeSpent {
    time: number;
    devTime: TimeGroup;
    qaTime: TimeGroup;
    othersTime: TimeGroup;
    defectTime: number;
    timeSpentWithinThreshold: number;
    timeSpentOverThreshold: number;
    timeSpentWithinOriginalEstimate: number;
    defectTimeInDays: number;
    timeInDays: number;
}
