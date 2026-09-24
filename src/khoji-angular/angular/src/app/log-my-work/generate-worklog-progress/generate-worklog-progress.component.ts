import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { BehaviorSubject, combineLatest, interval, Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';

export enum WORKLOG_TASK {
  Fetching_Jira_activity,
  Fetching_MS_Calendar_activity,
  Processing_Jira_activity,
  Processing_MS_Calendar_activity,
  Calculating_work_log,
  Generating_timesheet
}

export enum WORKLOG_TASK_IMAGE {
  Fetching_Jira_activity = 'assets/svg/jira-logo.svg',
  Fetching_MS_Calendar_activity = 'assets/svg/logo_microsoft-teams.svg',
  Processing_Jira_activity = 'assets/svg/jira-logo.svg',
  Processing_MS_Calendar_activity = 'assets/svg/logo_microsoft-teams.svg',
  Calculating_work_log = 'assets/images/calculator60.png',
  Generating_timesheet = 'assets/images/timesheet.png'
}

export type WORKLOG_TASK_STATUS = 'Pending' | 'Processing' | 'Completed' | 'Failed' | 'Disabled' | 'Cancelled';

export interface WorklogTask {
  id: WORKLOG_TASK;
  name: string;
  image: string;
  progress$: Observable<number>;
  status$: Observable<WORKLOG_TASK_STATUS>;
  setProgress: (progress: number) => void;
  setStatus: (status: WORKLOG_TASK_STATUS) => void;
  cancel: () => void;
}

export interface WorklogTaskConfig {
  id: WORKLOG_TASK;
  status: WORKLOG_TASK_STATUS;
  timeout: number;
}

@Component({
  selector: 'khoji-generate-worklog-progress',
  templateUrl: './generate-worklog-progress.component.html',
  styleUrls: ['./generate-worklog-progress.component.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class GenerateWorklogProgressComponent implements OnDestroy {
  tasks: WorklogTask[] = [];
  inprocessTask: Observable<string>;
  showTasks = false;
  timeouts = [];
  pulsate = true;

  type = ({ word, speed }) =>
    interval(speed).pipe(
      map((x) => word.substr(0, x + 1)),
      take(word.length)
    );

  clearTimeouts = () =>
    this.timeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });

  constructor() {}

  addTask(id: WORKLOG_TASK, status: WORKLOG_TASK_STATUS) {
    const _task = this.tasks.find((t) => t.id === id);

    if (_task) {
      _task.setStatus(status);
      return _task;
    }

    const progress$ = new BehaviorSubject<number>(0);
    const status$ = new BehaviorSubject<WORKLOG_TASK_STATUS>(status);

    const task: WorklogTask = {
      id: id,
      name: WORKLOG_TASK[id].replace(/_/g, ' '),
      image: WORKLOG_TASK_IMAGE[WORKLOG_TASK[id]],
      progress$: progress$.asObservable(),
      status$: status$.asObservable(),
      cancel: () => void 0,
      setProgress: (progress: number) => progress$.next(progress),
      setStatus: (status: WORKLOG_TASK_STATUS) => status$.next(status)
    };

    this.tasks.push(task);
    return task;
  }

  startTasks(config: WorklogTaskConfig[]) {
    this.pulsate = true;
    this.clearTimeouts();
    config.forEach((taskConfig) => {
      const task = this.tasks.find((t) => t.id === taskConfig.id);
      const timoeout = setTimeout(() => {
        task.setStatus(taskConfig.status);
        if (taskConfig.status === 'Processing') {
          this.inprocessTask = this.type({ word: task.name + '...', speed: 50 });
          // run the task progress here
        }
      }, taskConfig.timeout);
      task.cancel = () => {
        clearTimeout(timoeout);
        task.setStatus('Cancelled');
      };
      this.timeouts.push(timoeout);
    });
  }

  completeAllTasks() {
    this.tasks.forEach((task) => {
      task.setProgress(100);
      task.setStatus('Completed');
    });

    this.clearTimeouts();

    this.inprocessTask = of('All completed!');
    this.pulsate = false;
  }

  failAllTasks() {
    this.tasks.forEach((task) => {
      task.setProgress(0);
      task.setStatus('Failed');
    });

    this.clearTimeouts();

    this.inprocessTask = of('All failed!');
    this.pulsate = false;
  }

  allTasksStatus$(statuses: WORKLOG_TASK_STATUS[]) {
    return combineLatest(this.tasks.map((task) => task.status$)).pipe(map((_statuses) => (_statuses.every((status) => statuses.includes(status)) ? _statuses[0] : null)));
  }

  cancelAllTasks() {
    this.tasks.forEach((task) => {
      task.cancel();
    });

    this.clearTimeouts();

    this.inprocessTask = of('All cancelled!');
    this.pulsate = false;
  }

  ngOnDestroy() {
    this.cancelAllTasks();
  }
}
