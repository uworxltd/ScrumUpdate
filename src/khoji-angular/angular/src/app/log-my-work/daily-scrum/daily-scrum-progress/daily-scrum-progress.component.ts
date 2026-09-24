import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnChanges, SimpleChanges } from '@angular/core'; // Added OnChanges and SimpleChanges imports
import { BehaviorSubject, interval, Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';

export enum SCRUM_TASK {
  Fetching_Scrum_Data,
  Processing_Scrum_Data,
  Fetching_Jira_Activity,
  Processing_Jira_Activity,
  Generating_Scrum_Update,
}

export enum SCRUM_TASK_IMAGE {
  Fetching_Scrum_Data = 'assets/images/timesheet.png',
  Processing_Scrum_Data = 'assets/images/calculator60.png',
  Fetching_Jira_Activity = 'assets/svg/jira-logo.svg',
  Processing_Jira_Activity = 'assets/images/calculator60.png',
  Generating_Scrum_Update = 'assets/images/timesheet.png',
}

export type SCRUM_TASK_STATUS = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Disabled' | 'Cancelled';

export interface ScrumTask {
  id: SCRUM_TASK;
  name: string;
  image: string;
  status$: BehaviorSubject<SCRUM_TASK_STATUS>;
}

export interface ScrumTaskConfig {
  id: SCRUM_TASK;
  status: SCRUM_TASK_STATUS;
  timeout: number;
}

@Component({
  selector: 'khoji-daily-scrum-progress',
  templateUrl: './daily-scrum-progress.component.html',
  styleUrls: ['./daily-scrum-progress.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class DailyScrumProgressComponent implements OnDestroy, OnChanges {
  @Input() isFetchingFromJira: boolean = false;
  tasks: ScrumTask[] = [];
  inprocessTask$: Observable<string> = of('Preparing...');
  showTasks = true; // expanded by default
  timeouts: ReturnType<typeof setTimeout>[] = [];
  pulsate = true;

  type = ({ word, speed }: { word: string; speed: number }) =>
    interval(speed).pipe(
      map((x) => word.substr(0, x + 1)),
      take(word.length)
    );

  clearTimeouts = () =>
    this.timeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });

  resetTasks() {
    this.clearTimeouts();
    this.timeouts = [];
    this.tasks = [];
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.resetTasks();
    this.isFetchingFromJira ?
      this.initGenerateScrumUpdates() :
      this.initLoadScrumUpdates();
  }

  initLoadScrumUpdates() {
    // Initialize all tasks with Pending status
    this.addTask(SCRUM_TASK.Fetching_Scrum_Data, 'Pending');
    this.addTask(SCRUM_TASK.Processing_Scrum_Data, 'Pending');
    this.addTask(SCRUM_TASK.Generating_Scrum_Update, 'Pending');

    // Start the task sequence
    this.startTasks([
      { id: SCRUM_TASK.Fetching_Scrum_Data, status: 'Processing', timeout: 0 },
      { id: SCRUM_TASK.Fetching_Scrum_Data, status: 'Completed', timeout: 1500 },
      { id: SCRUM_TASK.Processing_Scrum_Data, status: 'Processing', timeout: 1500 },
      { id: SCRUM_TASK.Processing_Scrum_Data, status: 'Completed', timeout: 3500 },
      { id: SCRUM_TASK.Generating_Scrum_Update, status: 'Processing', timeout: 3500 }
    ]);
  }

  initGenerateScrumUpdates() {
    // Initialize all tasks with Pending status
    this.addTask(SCRUM_TASK.Fetching_Jira_Activity, 'Pending');
    this.addTask(SCRUM_TASK.Processing_Jira_Activity, 'Pending');
    this.addTask(SCRUM_TASK.Generating_Scrum_Update, 'Pending');

    // Start the task sequence
    this.startTasks([
      { id: SCRUM_TASK.Fetching_Jira_Activity, status: 'Processing', timeout: 0 },
      { id: SCRUM_TASK.Fetching_Jira_Activity, status: 'Completed', timeout: 1500 },
      { id: SCRUM_TASK.Processing_Jira_Activity, status: 'Processing', timeout: 1500 },
      { id: SCRUM_TASK.Processing_Jira_Activity, status: 'Completed', timeout: 3500 },
      { id: SCRUM_TASK.Generating_Scrum_Update, status: 'Processing', timeout: 3500 }
    ]);
  }

  addTask(id: SCRUM_TASK, status: SCRUM_TASK_STATUS): ScrumTask {
    const existingTask = this.tasks.find((t) => t.id === id);

    if (existingTask) {
      existingTask.status$.next(status);
      return existingTask;
    }

    const status$ = new BehaviorSubject<SCRUM_TASK_STATUS>(status);

    const task: ScrumTask = {
      id: id,
      name: SCRUM_TASK[id].replace(/_/g, ' '),
      image: SCRUM_TASK_IMAGE[SCRUM_TASK[id]],
      status$: status$
    };

    this.tasks.push(task);
    return task;
  }

  startTasks(config: ScrumTaskConfig[]) {
    this.pulsate = true;
    this.clearTimeouts();

    config.forEach((taskConfig) => {
      const task = this.tasks.find((t) => t.id === taskConfig.id);
      if (task) {
        const timeout = setTimeout(() => {
          task.status$.next(taskConfig.status);
          this.updateInprocessTask();
        }, taskConfig.timeout);
        this.timeouts.push(timeout);
      }
    });
  }

  updateInprocessTask() {
    const processingTask = this.tasks.find((t) => t.status$.getValue() === 'Processing');

    if (processingTask) {
      // Use a faster typing speed and ensure smooth transition
      this.inprocessTask$ = this.type({ word: processingTask.name + '...', speed: 30 });
    } else {
      // Ensure we always have content to prevent layout shift
      this.inprocessTask$ = of('Preparing...');
    }
  }

  ngOnDestroy(): void {
    this.clearTimeouts();
  }
}
