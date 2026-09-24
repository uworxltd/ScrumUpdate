export interface ProjectedTime {
    timeSpentWithinThreshold: number;
    timeSpentWithinOriginalEstimate: number;
    timeSpentOverThreshold: number;
    timeRemainingOverThreshold: number;
    timeRemainingWithinOriginalEstimate: number;
    timeRemainingWithinThreshold: number;
    unallocatedTimeRemainingWithinEstimate: number;
}
