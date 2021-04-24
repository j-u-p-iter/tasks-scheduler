import { InvalidPathError } from "@j.u.p.iter/custom-error";
import { FolderPath } from "@j.u.p.iter/folder-path";
import { SystemErrorCode } from "@j.u.p.iter/system-error-code";
import { isValidCron } from "cron-validator";
import fs from "fs";
import cron from "node-cron";
import path from "path";
import * as tsNode from "ts-node";
import { BaseTask } from "./BaseTask";

export class TasksScheduler {
  private folderPath = new FolderPath();

  private resolvedTasksPath = null;

  private initializeTask(taskEntry: string): BaseTask {
    const pathToTask = path.resolve(this.resolvedTasksPath, taskEntry);
    const Task = require(pathToTask).default;

    if (!Task) {
      throw new Error(`Task in "${taskEntry}" task file was not declared.`);
    }

    const task = new Task();

    return task;
  }

  private scheduleTask(task) {
    const schedule = task.schedule();

    if (schedule === null) {
      throw new Error(`The task "${task.name}" should declare schedule`);
    }

    if (!isValidCron(schedule)) {
      throw new Error(
        `The task "${task.name}" declares invalid schedule ${schedule}`
      );
    }

    if (task.run() === null) {
      throw new Error(`The task "${task.name}" should declare run method`);
    }

    cron.schedule(task.schedule(), task.run);

    console.log(`Task "${task.name}" was scheduled`);
  }

  /**
   * The tasksFolderPath should be relative to the
   *   application root folder or absolute.
   *   Further we'll prepare the resolvedTasksPath, that
   *   is always an absolute path.
   *
   */
  constructor(private tasksFolderPath: string) {
    tsNode.register();
  }

  /**
   * Scans tasks folder to find all folder entries
   *
   */
  async scanTasksFolder() {
    const allowedExtensions = [".ts"];
    this.resolvedTasksPath = await this.folderPath.resolve(
      this.tasksFolderPath
    );

    let entries;

    try {
      entries = await fs.promises.readdir(this.resolvedTasksPath);
    } catch (error) {
      if (error.code === SystemErrorCode.NO_FILE_OR_DIRECTORY) {
        throw new InvalidPathError(this.resolvedTasksPath, false, {
          context: "@j.u.p.iter/tasks-scheduler"
        });
      }
    }

    return entries.filter(entry => {
      return allowedExtensions.includes(path.extname(entry));
    });
  }

  async run() {
    console.log("Start running tasks...");

    const tasksEntries = await this.scanTasksFolder();

    if (!tasksEntries.length) {
      console.log(
        `There are no tasks in the tasks folder: ${this.resolvedTasksPath}. Stop tasks scheduler.`
      );

      return;
    }

    tasksEntries.forEach(taskEntry => {
      const task = this.initializeTask(taskEntry);

      this.scheduleTask(task);
    });
  }
}
