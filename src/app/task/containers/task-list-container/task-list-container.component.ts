import { Component, OnInit } from '@angular/core';
import { AuthService } from '@shared/services';
import { TaskService } from '../../services/task/task.service';
import Task from '../../interfaces/task.interface';
import User from '@shared/interfaces/user.interface';
import { NgxSpinnerService } from 'ngx-spinner';
import { Observable } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { map } from 'rxjs/operators';
import { TaskListService } from '../../services';
import TaskList from '../../interfaces/taskList.interface';
import { FormControl } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CONSTANTS } from '@shared/constants';
import { TimerService } from '@timer';
import { Router } from '@angular/router';

@Component({
  selector: 'pm-task-list-container',
  templateUrl: './task-list-container.component.html',
  styleUrls: ['./task-list-container.component.scss']
})
export class TaskListContainerComponent implements OnInit {

  activeTasksListRef: TaskList;
  completedTasksList: Task[] = [];
  userTaskLists: TaskList[] = [];
  currentUser: User;

  newTaskListName: FormControl = new FormControl('');
  showNewTaskListInput = false;
  userTaskListLimit = CONSTANTS.userTaskListLimit;

  isHandset$: Observable<boolean> = this.breakpointObserver.observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches)
    );

  constructor(private auth: AuthService,
              private taskService: TaskService,
              private taskListService: TaskListService,
              private spinner: NgxSpinnerService,
              public breakpointObserver: BreakpointObserver,
              private toastr: ToastrService,
              public timerService: TimerService,
              private router: Router) { }

  ngOnInit() {
    this.spinner.show();
    this.auth.user$.subscribe(user => this.currentUser = user);

    // TODO refactor
    this.taskListService.getTaskLists$().subscribe(taskLists => {
      if (!taskLists || !taskLists.length) {
        this.createNewTaskList('My List', true);
      } else {
        this.completedTasksList = [];
        // Remove completedTasks from each taskList and map them into a completedTasksList
        taskLists.sort(this.taskListService.compareListName).forEach(taskList => {
          if (taskList.tasks) {
            taskList.tasks.filter(task => {
              if (task.completed) {
                if (task.dateCompleted) {
                  if (this.taskService.taskIsExpired(task)) {
                    // Delete expired tasks
                    taskList.tasks.splice(taskList.tasks.findIndex(t => t.id === task.id), 1);
                    this.taskListService.updateTaskList(this.currentUser.uid, taskList);
                  } else {
                    if (this.taskService.checkTaskCompleted(task)) {
                      this.completedTasksList.push(task);
                    }
                  }
                }
                return true;
              }
            });
          }
        });

        this.completedTasksList.sort(this.taskService.compareDateCompleted);

        // Remove completedTasks from taskLists
        this.userTaskLists = taskLists.map(taskList => {
          if (taskList.tasks) {
            taskList.tasks = taskList.tasks.filter(task => !this.taskService.checkTaskCompleted(task));
          }
          return taskList;
        });

        // Find activeTasksList
        this.activeTasksListRef = this.taskListService.getActiveTaskList(taskLists);
      }

      this.spinner.hide();
    });
  }

  onNewTaskAdded(taskList: TaskList, event: string): Promise<void> {
    return this.taskService.postNewTask(this.currentUser.uid, taskList, event);
  }

  onTaskUpdated(taskList: TaskList, task: Task) {
    return this.taskService.updateTask(this.currentUser.uid, taskList, task);
  }

  onTaskDeleted(taskList: TaskList, task: Task) {
    const indexToRemove = taskList.tasks.findIndex(t => t.id === task.id);
    taskList.tasks.splice(indexToRemove, 1);
    return this.taskListService.updateTaskList(this.currentUser.uid, taskList);
  }

  toggleTaskComplete(taskList: TaskList, task: Task): Promise<void> {
    task.completed = !task.completed;
    task.dateCompleted = task.completed ? new Date().toISOString() : null;
    return this.taskListService.updateTaskList(this.currentUser.uid, taskList);
  }

  onDragEnded(taskListRef): void {
    // The timeout makes sure that the list has finished reordering before we update the taskList with the new order
    setTimeout(() => {
      return this.taskListService.updateTaskList(this.currentUser.uid, taskListRef);
    });
  }

  createNewTaskList(taskListName: string, activate: boolean = false) {
    // Check to see if the user can create more taskLists
    if (this.userTaskLists && this.userTaskLists.length < this.userTaskListLimit) {
      this.showNewTaskListInput = false;

      if (this.currentUser) {
        return this.taskListService.createTaskList(this.currentUser.uid, taskListName, activate)
          .then(() => {
            this.toastr.success(null, `Created "${taskListName}"`);
            this.newTaskListName = new FormControl('');
          });
      }
    } else {
      this.toastr.warning(null, `You can't create more than ${this.userTaskListLimit} Task lists`);
    }
  }

  onActivateTaskList(taskList: TaskList): Promise<void[]> {
    this.activeTasksListRef.active = false;
    taskList.active = true;

    return Promise.all([
      this.taskListService.updateTaskList(this.currentUser.uid, this.activeTasksListRef),
      this.taskListService.updateTaskList(this.currentUser.uid, taskList)
    ]);
  }

  deleteEmptyTaskList(taskList: TaskList): Promise<void> {
    if (!taskList.tasks || !!taskList.tasks.length || this.allTasksComplete(taskList.tasks)) {
      return this.taskListService.deleteTaskList(this.currentUser.uid, taskList.id).then(() => {
        this.toastr.warning(null, `Deleted "${taskList.listName}" list`);
      });
    }
  }

  allTasksComplete(tasks): boolean {
    return tasks ? tasks.every(task => this.taskService.checkTaskCompleted(task)) : false;
  }

  onTaskListUpdated(taskList: TaskList): Promise<void> {
    return this.taskListService.updateTaskList(this.currentUser.uid, taskList);
  }

  navigateToTimer() {
    this.router.navigate(['/timer']);
  }
}
